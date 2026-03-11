import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';

const BATCH_SIZE = 5;
const FETCH_TIMEOUT = 10_000;
const SHORT_ABSTRACT_THRESHOLD = 300;

interface EnrichAbstractsMetadata {
  sessionId: string;
}

interface ArticleToEnrich {
  id: string;
  title: string;
  doi: string | null;
  pmid: string | null;
  abstract: string | null;
}

export class EnrichAbstractsProcessor extends BaseProcessor {
  private prisma: PrismaClient;

  constructor(redis: Redis, prisma?: PrismaClient) {
    super(redis);
    this.prisma = prisma!;
  }

  setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private titleMatchesFuzzy(foundTitle: string, target: string): boolean {
    const n = this.normalizeTitle(foundTitle);
    const nt = this.normalizeTitle(target);
    if (n.length < 10 || nt.length < 10) return false;
    return n === nt || nt.includes(n) || n.includes(nt);
  }

  /**
   * Try all 6 sources to find a full abstract for an article.
   * Returns the abstract and source name, or null if not found.
   */
  private async enrichOne(
    article: ArticleToEnrich,
  ): Promise<{ abstract: string; source: string; doi?: string; pmid?: string } | null> {
    const currentLen = article.abstract?.length ?? 0;
    let doi = article.doi;

    // Step 0: Enrich DOI via CrossRef title search if missing
    if (!doi) {
      try {
        const cleanTitle = article.title.replace(/[[\]{}():"]/g, '').slice(0, 200);
        const contactEmail = process.env['CONTACT_EMAIL'] ?? 'admin@cortex-clinical.com';
        const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(cleanTitle)}&rows=3&mailto=${encodeURIComponent(contactEmail)}`;
        const res = await this.fetchWithTimeout(url);
        if (res.ok) {
          const data: any = await res.json();
          for (const item of data.message?.items ?? []) {
            for (const t of item.title ?? []) {
              if (this.titleMatchesFuzzy(t, article.title) && item.DOI) {
                doi = item.DOI;
                break;
              }
            }
            if (doi) break;
          }
        }
      } catch {
        /* best-effort */
      }
    }

    // Source 1: Semantic Scholar (by DOI or title)
    try {
      const s2Url = doi
        ? `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=abstract,title`
        : `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(article.title.slice(0, 200))}&limit=3&fields=abstract,title`;
      const res = await this.fetchWithTimeout(s2Url);
      if (res.ok) {
        const raw: any = await res.json();
        const papers = raw.data ? raw.data : [raw];
        for (const paper of papers) {
          if (paper.abstract && paper.abstract.length > currentLen) {
            if (doi || this.titleMatchesFuzzy(paper.title ?? '', article.title)) {
              return {
                abstract: paper.abstract,
                source: 'Semantic Scholar',
                doi: doi ?? undefined,
              };
            }
          }
        }
      }
    } catch {
      /* continue */
    }

    // Source 2: PubMed (by PMID or title)
    try {
      const apiKey = process.env['PUBMED_API_KEY'];
      let pmids: string[] = [];

      if (article.pmid) {
        pmids = [article.pmid];
      } else {
        const cleanTitle = article.title.replace(/[[\]{}():"]/g, '').slice(0, 200);
        for (const term of [cleanTitle, `${cleanTitle}[Title]`]) {
          const params = new URLSearchParams({ db: 'pubmed', term, retmode: 'json', retmax: '5' });
          if (apiKey) params.set('api_key', apiKey);
          const searchRes = await this.fetchWithTimeout(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params.toString()}`,
          );
          if (searchRes.ok) {
            const data: any = await searchRes.json();
            pmids = data.esearchresult?.idlist ?? [];
            if (pmids.length > 0) break;
          }
        }
      }

      if (pmids.length > 0) {
        const fetchParams = new URLSearchParams({
          db: 'pubmed',
          id: pmids.join(','),
          retmode: 'xml',
          rettype: 'abstract',
        });
        if (apiKey) fetchParams.set('api_key', apiKey);
        const fetchRes = await this.fetchWithTimeout(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${fetchParams.toString()}`,
        );
        if (fetchRes.ok) {
          const xml = await fetchRes.text();
          const pubmedArticles = xml.split('<PubmedArticle>').slice(1);
          for (const artXml of pubmedArticles) {
            const abstractMatch = artXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
            if (!abstractMatch) continue;
            const fullAbstract = abstractMatch
              .map((m: string) => m.replace(/<[^>]+>/g, '').trim())
              .join(' ');
            if (fullAbstract.length <= currentLen) continue;

            const titleMatch = artXml.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
            const foundTitle = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
            if (this.titleMatchesFuzzy(foundTitle, article.title)) {
              const pmidMatch = artXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
              return {
                abstract: fullAbstract,
                source: 'PubMed',
                doi: doi ?? undefined,
                pmid: !article.pmid && pmidMatch?.[1] ? pmidMatch[1] : undefined,
              };
            }
          }
        }
      }
    } catch {
      /* continue */
    }

    // Source 3: CrossRef (by DOI metadata)
    if (doi) {
      try {
        const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
        const res = await this.fetchWithTimeout(url);
        if (res.ok) {
          const data: any = await res.json();
          const abstract = data.message?.abstract?.replace(/<[^>]+>/g, '').trim();
          if (abstract && abstract.length > currentLen) {
            return { abstract, source: 'CrossRef', doi };
          }
        }
      } catch {
        /* continue */
      }
    }

    // Source 4: Europe PMC (by DOI, PMID, or title)
    try {
      const queries: string[] = [];
      if (doi) queries.push(`DOI:${encodeURIComponent(doi)}`);
      if (article.pmid) queries.push(`EXT_ID:${article.pmid}`);
      const cleanTitle = article.title.replace(/[[\]{}():"]/g, '').slice(0, 150);
      queries.push(`TITLE:"${encodeURIComponent(cleanTitle)}"`);

      for (const query of queries) {
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${query}&format=json&resultType=core&pageSize=3`;
        const res = await this.fetchWithTimeout(url);
        if (!res.ok) continue;
        const data: any = await res.json();
        for (const result of data.resultList?.result ?? []) {
          if (result.abstractText && result.abstractText.length > currentLen) {
            if (this.titleMatchesFuzzy(result.title ?? '', article.title)) {
              return { abstract: result.abstractText, source: 'Europe PMC', doi: doi ?? undefined };
            }
          }
        }
      }
    } catch {
      /* continue */
    }

    // Source 5: OpenAlex (by DOI or title)
    try {
      const openAlexUrl = doi
        ? `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`
        : `https://api.openalex.org/works?search=${encodeURIComponent(article.title.slice(0, 200))}&per_page=3`;
      const res = await this.fetchWithTimeout(openAlexUrl);
      if (res.ok) {
        const raw: any = await res.json();
        const works: any[] = raw.results ? raw.results : [raw];
        for (const work of works) {
          const invertedIndex = work.abstract_inverted_index;
          if (!invertedIndex || typeof invertedIndex !== 'object') continue;
          const wordPositions: Array<[number, string]> = [];
          for (const [word, positions] of Object.entries(invertedIndex)) {
            for (const pos of positions as number[]) {
              wordPositions.push([pos, word]);
            }
          }
          wordPositions.sort((a, b) => a[0] - b[0]);
          const abstract = wordPositions.map(([, w]) => w).join(' ');
          if (abstract.length <= currentLen) continue;
          if (doi || this.titleMatchesFuzzy(work.title ?? '', article.title)) {
            return { abstract, source: 'OpenAlex', doi: doi ?? undefined };
          }
        }
      }
    } catch {
      /* continue */
    }

    // Source 6: DOI landing page scraping
    if (doi) {
      try {
        const doiUrl = `https://doi.org/${encodeURIComponent(doi)}`;
        const res = await this.fetchWithTimeout(doiUrl, { redirect: 'follow' });
        if (res.ok) {
          const html = await res.text();
          let bestAbstract = '';

          const bodyPatterns = [
            /id="Abs1-content"[^>]*>([\s\S]*?)<\/div>/i,
            /class="[^"]*abstract[^"]*"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i,
            /<section[^>]*class="[^"]*Abstract[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
          ];
          for (const pattern of bodyPatterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
              const text = match[1]
                .replace(/<[^>]+>/g, '')
                .replace(/&#160;/g, ' ')
                .replace(/&amp;/g, '&')
                .trim();
              if (text.length > bestAbstract.length) bestAbstract = text;
            }
          }

          if (bestAbstract.length < 300) {
            const metaPatterns = [
              /name="citation_abstract"[^>]*content="([\s\S]*?)"/i,
              /name="dc\.description"[^>]*content="([\s\S]*?)"/i,
            ];
            for (const pattern of metaPatterns) {
              const match = html.match(pattern);
              if (match?.[1]) {
                const text = match[1]
                  .replace(/&#160;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/<[^>]+>/g, '')
                  .trim();
                if (text.length > bestAbstract.length) bestAbstract = text;
              }
            }
          }

          if (bestAbstract.length > currentLen) {
            return { abstract: bestAbstract, source: 'DOI Page', doi };
          }
        }
      } catch {
        /* exhausted */
      }
    }

    return null;
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const metadata = job.data.metadata as unknown as EnrichAbstractsMetadata;
    const { sessionId } = metadata;

    // Find articles needing enrichment
    const allArticles: ArticleToEnrich[] = await (this.prisma as any).article.findMany({
      where: { sessionId },
      select: { id: true, title: true, doi: true, pmid: true, abstract: true },
    });

    const toEnrich = allArticles.filter(
      (a) => !a.abstract || a.abstract.length < SHORT_ABSTRACT_THRESHOLD,
    );

    const total = toEnrich.length;
    if (total === 0) {
      await this.reportProgress(job, 100, {
        total: 0,
        current: 0,
        message: 'All articles already have full abstracts',
      });
      return;
    }

    let processed = 0;
    let enriched = 0;
    const sources: Record<string, number> = {};

    await this.reportProgress(job, 0, {
      total,
      current: 0,
      message: `Enriching abstracts for ${total} articles...`,
    });

    const totalBatches = Math.ceil(total / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        await this.reportProgress(job, Math.round((processed / total) * 100), {
          total,
          current: processed,
          message: `Cancelled after ${enriched} enriched out of ${processed}/${total}`,
        });
        return;
      }

      const batch = toEnrich.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);

      // Process batch sequentially to respect API rate limits
      for (const article of batch) {
        try {
          const result = await this.enrichOne(article);
          if (result) {
            const updateData: Record<string, unknown> = { abstract: result.abstract };
            if (result.doi && !article.doi) updateData.doi = result.doi;
            if (result.pmid && !article.pmid) updateData.pmid = result.pmid;

            await (this.prisma as any).article.update({
              where: { id: article.id },
              data: updateData,
            });

            enriched++;
            sources[result.source] = (sources[result.source] ?? 0) + 1;
          }
        } catch {
          // Skip individual failures
        }
        processed++;
      }

      const pct = Math.round((processed / total) * 100);
      const sourcesSummary = Object.entries(sources)
        .map(([s, c]) => `${s}:${c}`)
        .join(', ');
      await this.reportProgress(job, pct, {
        total,
        current: processed,
        message: `Enriched ${enriched}/${processed} abstracts (${sourcesSummary})`,
      });

      // Rate limiting between batches
      if (batchIndex + 1 < totalBatches) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const sourcesSummary = Object.entries(sources)
      .map(([s, c]) => `${s}:${c}`)
      .join(', ');
    await this.reportProgress(job, 100, {
      total,
      current: processed,
      message: `Completed: ${enriched}/${total} abstracts enriched (${sourcesSummary})`,
    });
  }
}
