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
        const searchResult = await client.search(enrichedQuery);

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
    case 'GOOGLE_SCHOLAR': {
      const params: string[] = [];
      if (fromDate) params.push(`as_ylo=${fromDate.getUTCFullYear()}`);
      if (toDate) params.push(`as_yhi=${toDate.getUTCFullYear()}`);
      // For Google Scholar, date params are URL params handled by the client,
      // so we encode them in a special format the client can parse
      return params.length > 0 ? `${queryString} {{DATE_PARAMS:${params.join('&')}}}` : queryString;
    }
    case 'CLINICAL_TRIALS': {
      const parts: string[] = [];
      if (fromDate) parts.push(`StudyFirstPostDate>=${formatPubmed(fromDate).replace(/\//g, '-')}`);
      if (toDate) parts.push(`StudyFirstPostDate<=${formatPubmed(toDate).replace(/\//g, '-')}`);
      // ClinicalTrials.gov uses filter syntax
      return parts.length > 0 ? `${queryString} {{DATE_PARAMS:${parts.join('&')}}}` : queryString;
    }
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
