import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';
import type { DatabaseClient } from './clients/database-client.js';
import { PubMedClient } from './clients/pubmed-client.js';
import { PmcClient } from './clients/pmc-client.js';
import { GoogleScholarClient } from './clients/google-scholar-client.js';
import { ClinicalTrialsClient } from './clients/clinical-trials-client.js';
import { DeduplicationIndex } from './dedup.js';

interface ExecuteQueryMetadata {
  queryId: string;
  databases: string[];
  sessionId: string;
  executionIds: string[];
  queryString: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export class ExecuteQueryProcessor extends BaseProcessor {
  constructor(
    redis: Redis,
    private readonly prisma: PrismaClient,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const metadata = job.data.metadata as unknown as ExecuteQueryMetadata;
    const { databases, executionIds, queryString, sessionId, dateFrom, dateTo } = metadata;

    const totalDatabases = databases.length;

    await this.reportProgress(job, 0, {
      total: totalDatabases,
      current: 0,
      message: `Starting query execution across ${totalDatabases} database(s)`,
    });

    // Load existing articles for deduplication
    const existingArticles = (await (this.prisma as any).article.findMany({
      where: { sessionId },
      select: { doi: true, pmid: true, title: true },
    })) as Array<{ doi: string | null; pmid: string | null; title: string }>;

    const dedupIndex = new DeduplicationIndex();
    dedupIndex.addExisting(existingArticles);

    const results: Array<{
      database: string;
      executionId: string;
      status: 'SUCCESS' | 'FAILED';
      articlesFound: number;
      articlesImported: number;
      errorMessage?: string;
    }> = [];

    for (let i = 0; i < databases.length; i++) {
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        for (let j = i; j < databases.length; j++) {
          const execId = executionIds[j]!;
          results.push({
            database: databases[j]!,
            executionId: execId,
            status: 'FAILED',
            articlesFound: 0,
            articlesImported: 0,
            errorMessage: 'Execution cancelled by user',
          });
          // Update QueryExecution record to CANCELLED
          await (this.prisma as any).queryExecution.update({
            where: { id: execId },
            data: { status: 'CANCELLED', completedAt: new Date() },
          });
        }
        break;
      }

      const database = databases[i]!;
      const executionId = executionIds[i]!;

      await this.reportProgress(job, Math.round((i / totalDatabases) * 100), {
        total: totalDatabases,
        current: i,
        message: `Searching ${database}...`,
      });

      try {
        const client = this.createClient(database);
        const enrichedQuery = enrichQueryWithDateFilter(queryString, database, dateFrom, dateTo);
        const dateRange =
          dateFrom || dateTo
            ? {
                from: dateFrom ? new Date(dateFrom) : undefined,
                to: dateTo ? new Date(dateTo) : undefined,
              }
            : undefined;
        const searchResult = await client.search(enrichedQuery, dateRange);

        // Deduplicate
        const uniqueArticles = searchResult.articles.filter(
          (article) => !dedupIndex.isDuplicate(article),
        );

        // Persist articles
        if (uniqueArticles.length > 0) {
          const now = new Date();

          // Create articles in batch
          const articleRecords = uniqueArticles.map((a) => ({
            sessionId,
            title: a.title,
            abstract: a.abstract ?? null,
            authors: (a.authors ?? []) as unknown as Prisma.InputJsonValue,
            doi: a.doi ?? null,
            pmid: a.pmid ?? null,
            publicationDate: a.publicationDate ? parsePublicationDate(a.publicationDate) : null,
            journal: a.journal ?? null,
            sourceDatabase: a.sourceDatabase ?? database,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
          }));

          await (this.prisma as any).article.createMany({
            data: articleRecords,
            skipDuplicates: true,
          });

          // Get created article IDs for linking to query execution
          const createdArticles = (await (this.prisma as any).article.findMany({
            where: {
              sessionId,
              sourceDatabase: database,
              createdAt: { gte: now },
            },
            select: { id: true },
          })) as Array<{ id: string }>;

          // Create article-query links
          if (createdArticles.length > 0) {
            const queryId = metadata.queryId;
            await (this.prisma as any).articleQueryLink.createMany({
              data: createdArticles.map((a: { id: string }) => ({
                articleId: a.id,
                queryId,
                executionId,
              })),
              skipDuplicates: true,
            });
          }
        }

        const completedDate = new Date().toISOString().split('T')[0]!;

        // Update QueryExecution record
        await (this.prisma as any).queryExecution.update({
          where: { id: executionId },
          data: {
            status: 'SUCCESS',
            articlesFound: searchResult.totalCount,
            articlesImported: uniqueArticles.length,
            completedAt: new Date(),
            reproducibilityStatement: `Search conducted on ${completedDate} in ${database} using query: ${queryString}. Results: ${searchResult.totalCount} articles found, ${uniqueArticles.length} imported after deduplication.`,
          },
        });

        results.push({
          database,
          executionId,
          status: 'SUCCESS',
          articlesFound: searchResult.totalCount,
          articlesImported: uniqueArticles.length,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        await (this.prisma as any).queryExecution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            errorMessage,
            completedAt: new Date(),
          },
        });

        results.push({
          database,
          executionId,
          status: 'FAILED',
          articlesFound: 0,
          articlesImported: 0,
          errorMessage,
        });
      }
    }

    // Enrich short abstracts (Google Scholar snippets, etc.) via PubMed
    await this.enrichShortAbstracts(sessionId, job);

    // Report final progress and completion
    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const totalArticles = results.reduce((sum, r) => sum + r.articlesFound, 0);
    const totalImported = results.reduce((sum, r) => sum + r.articlesImported, 0);

    const completionMessage = `Completed: ${successCount}/${totalDatabases} databases searched, ${totalArticles} found, ${totalImported} imported`;

    // Publish completion event with proper status and format
    const completionEvent = JSON.stringify({
      taskId: job.data.taskId,
      type: job.data.type,
      status: 'COMPLETED',
      progress: 100,
      total: totalDatabases,
      current: totalDatabases,
      message: completionMessage,
    });

    await this.redis.publish(`task:progress:${job.data.createdBy}`, completionEvent);
  }

  /**
   * Enrich articles with short/missing abstracts by looking them up on PubMed via title search.
   */
  private async enrichShortAbstracts(sessionId: string, job: Job<TaskJobData>): Promise<void> {
    const SHORT_ABSTRACT_THRESHOLD = 300;

    try {
      const articlesToEnrich = (await (this.prisma as any).article.findMany({
        where: {
          sessionId,
          OR: [{ abstract: null }, { abstract: '' }],
        },
        select: { id: true, title: true, doi: true, abstract: true },
        take: 100,
      })) as Array<{ id: string; title: string; doi: string | null; abstract: string | null }>;

      // Also get articles with short abstracts (snippets)
      const allArticles = (await (this.prisma as any).article.findMany({
        where: { sessionId },
        select: { id: true, title: true, doi: true, abstract: true },
      })) as Array<{ id: string; title: string; doi: string | null; abstract: string | null }>;

      const shortAbstractArticles = allArticles.filter(
        (a) => a.abstract && a.abstract.length > 0 && a.abstract.length < SHORT_ABSTRACT_THRESHOLD,
      );

      const toEnrich = [...articlesToEnrich, ...shortAbstractArticles];

      if (toEnrich.length === 0) return;

      await this.reportProgress(job, 95, {
        message: `Enriching ${toEnrich.length} article abstract(s) via PubMed...`,
      });

      const pubmedClient = new PubMedClient(process.env['PUBMED_API_KEY']);
      let enriched = 0;

      // Process in batches of 5 to respect rate limits
      for (let i = 0; i < toEnrich.length; i += 5) {
        const batch = toEnrich.slice(i, i + 5);

        await Promise.all(
          batch.map(async (article) => {
            try {
              // Search PubMed by title
              const cleanTitle = article.title.replace(/[[\]{}():"]/g, '').slice(0, 200);
              const searchQuery = `${cleanTitle}[Title]`;

              const params = new URLSearchParams({
                db: 'pubmed',
                term: searchQuery,
                retmode: 'json',
                retmax: '3',
              });
              const apiKey = process.env['PUBMED_API_KEY'];
              if (apiKey) params.set('api_key', apiKey);

              const searchRes = await fetch(
                `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params.toString()}`,
              );
              if (!searchRes.ok) return;

              const searchData = (await searchRes.json()) as {
                esearchresult?: { idlist?: string[] };
              };
              const pmids = searchData.esearchresult?.idlist ?? [];
              if (pmids.length === 0) return;

              // Fetch the article details
              const fetchParams = new URLSearchParams({
                db: 'pubmed',
                id: pmids.join(','),
                retmode: 'xml',
                rettype: 'abstract',
              });
              if (apiKey) fetchParams.set('api_key', apiKey);

              const fetchRes = await fetch(
                `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${fetchParams.toString()}`,
              );
              if (!fetchRes.ok) return;

              const xml = await fetchRes.text();
              const fetched = pubmedClient.parseEfetchXml(xml);

              // Find best match by title similarity
              const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
              const normalizedTarget = normalizeTitle(article.title);

              const match = fetched.find((f) => {
                const normalizedFound = normalizeTitle(f.title);
                return (
                  normalizedFound === normalizedTarget ||
                  normalizedTarget.includes(normalizedFound) ||
                  normalizedFound.includes(normalizedTarget)
                );
              });

              if (match?.abstract && match.abstract.length > (article.abstract?.length ?? 0)) {
                const updateData: Record<string, unknown> = { abstract: match.abstract };
                // Also backfill PMID/DOI if missing
                if (!article.doi && match.doi) updateData.doi = match.doi;

                await (this.prisma as any).article.update({
                  where: { id: article.id },
                  data: updateData,
                });
                enriched++;
              }
            } catch {
              // Skip individual article failures
            }
          }),
        );

        // Small delay between batches for rate limiting
        if (i + 5 < toEnrich.length) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      if (enriched > 0) {
        await this.reportProgress(job, 98, {
          message: `Enriched ${enriched} abstract(s) from PubMed`,
        });
      }
    } catch {
      // Non-fatal: enrichment is best-effort
    }
  }

  private createClient(database: string): DatabaseClient {
    switch (database) {
      case 'PUBMED':
        return new PubMedClient(process.env['PUBMED_API_KEY']);
      case 'PMC':
        return new PmcClient(process.env['PUBMED_API_KEY']);
      case 'GOOGLE_SCHOLAR':
        return new GoogleScholarClient(process.env['SERPAPI_API_KEY']);
      case 'CLINICAL_TRIALS':
        return new ClinicalTrialsClient();
      default:
        throw new Error(`Unknown database: ${database}`);
    }
  }
}

/**
 * Enrich a query string with database-specific date range filters.
 */
function enrichQueryWithDateFilter(
  queryString: string,
  database: string,
  dateFrom: string | null,
  dateTo: string | null,
): string {
  if (!dateFrom && !dateTo) return queryString;

  const fromDate = dateFrom ? new Date(dateFrom) : null;
  const toDate = dateTo ? new Date(dateTo) : null;

  const formatPubmed = (d: Date) =>
    `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;

  switch (database) {
    case 'PUBMED':
    case 'PMC': {
      const from = fromDate ? `"${formatPubmed(fromDate)}"[PDAT]` : '"1900/01/01"[PDAT]';
      const to = toDate ? `"${formatPubmed(toDate)}"[PDAT]` : '"3000/12/31"[PDAT]';
      return `(${queryString}) AND (${from}:${to})`;
    }
    case 'GOOGLE_SCHOLAR':
    case 'CLINICAL_TRIALS':
      // Date filtering is handled natively by the client via dateRange parameter
      return queryString;
    default:
      return queryString;
  }
}

function parsePublicationDate(dateStr: string): Date | null {
  try {
    // Try ISO format first
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Try "YYYY Mon DD" or "YYYY Mon" or "YYYY" formats
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch?.[1]) {
      return new Date(`${yearMatch[1]}-01-01`);
    }

    return null;
  } catch {
    return null;
  }
}
