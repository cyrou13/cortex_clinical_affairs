import type { DatabaseClient, DatabaseSearchResult, ArticleMetadata } from './database-client.js';

// --- Rate Limiter ---

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number, // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until a token is available
    const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// --- PubMed Search Result ---

export interface PubMedSearchResult {
  idList: string[];
  count: number;
  retMax: number;
  retStart: number;
}

// --- PubMed Client ---

const ESEARCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const EFETCH_BATCH_SIZE = 200;

export class PubMedClient implements DatabaseClient {
  private readonly apiKey: string | undefined;
  private readonly rateLimiter: TokenBucketRateLimiter;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['PUBMED_API_KEY'];
    // NCBI allows 10 req/s with API key, 3 req/s without
    const rateLimit = this.apiKey ? 10 : 3;
    this.rateLimiter = new TokenBucketRateLimiter(rateLimit, rateLimit);
  }

  async search(query: string): Promise<DatabaseSearchResult> {
    // Step 1: esearch to get PMIDs
    const searchResult = await this.esearch(query);

    if (searchResult.count === 0 || searchResult.idList.length === 0) {
      return { articles: [], totalCount: 0, database: 'PUBMED' };
    }

    // Step 2: efetch to get article metadata in batches
    const articles = await this.fetchArticles(searchResult.idList);

    return {
      articles,
      totalCount: searchResult.count,
      database: 'PUBMED',
    };
  }

  async esearch(query: string): Promise<PubMedSearchResult> {
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmode: 'json',
      retmax: '10000',
    });

    if (this.apiKey) {
      params.set('api_key', this.apiKey);
    }

    const url = `${ESEARCH_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`PubMed esearch failed with status ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      esearchresult?: {
        idlist?: string[];
        count?: string;
        retmax?: string;
        retstart?: string;
        ERROR?: string;
      };
    };

    const result = data.esearchresult;
    if (!result) {
      throw new Error('PubMed esearch returned invalid response: missing esearchresult');
    }

    if (result.ERROR) {
      throw new Error(`PubMed esearch error: ${result.ERROR}`);
    }

    return {
      idList: result.idlist ?? [],
      count: parseInt(result.count ?? '0', 10),
      retMax: parseInt(result.retmax ?? '0', 10),
      retStart: parseInt(result.retstart ?? '0', 10),
    };
  }

  async fetchArticles(pmids: string[]): Promise<ArticleMetadata[]> {
    const allArticles: ArticleMetadata[] = [];

    // Process in batches of EFETCH_BATCH_SIZE
    for (let i = 0; i < pmids.length; i += EFETCH_BATCH_SIZE) {
      const batch = pmids.slice(i, i + EFETCH_BATCH_SIZE);
      const articles = await this.efetchBatch(batch);
      allArticles.push(...articles);
    }

    return allArticles;
  }

  private async efetchBatch(pmids: string[]): Promise<ArticleMetadata[]> {
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    });

    if (this.apiKey) {
      params.set('api_key', this.apiKey);
    }

    const url = `${EFETCH_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`PubMed efetch failed with status ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseEfetchXml(xml);
  }

  parseEfetchXml(xml: string): ArticleMetadata[] {
    const articles: ArticleMetadata[] = [];

    // Split by PubmedArticle tags
    const articleBlocks = xml.split(/<PubmedArticle>/);

    for (const block of articleBlocks) {
      if (!block.includes('</PubmedArticle>')) continue;

      const article: ArticleMetadata = {
        title: '',
        sourceDatabase: 'PUBMED',
      };

      // Extract PMID
      const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      if (pmidMatch?.[1]) {
        article.pmid = pmidMatch[1];
      }

      // Extract ArticleTitle
      const titleMatch = block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
      if (titleMatch?.[1]) {
        article.title = this.stripXmlTags(titleMatch[1]).trim();
      }

      // Extract AbstractText
      const abstractParts: string[] = [];
      const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
      let abstractMatch: RegExpExecArray | null;
      while ((abstractMatch = abstractRegex.exec(block)) !== null) {
        if (abstractMatch[1]) {
          abstractParts.push(this.stripXmlTags(abstractMatch[1]).trim());
        }
      }
      if (abstractParts.length > 0) {
        article.abstract = abstractParts.join(' ');
      }

      // Extract Authors
      const authors: string[] = [];
      const authorRegex = /<Author[^>]*>[\s\S]*?<LastName>([\s\S]*?)<\/LastName>[\s\S]*?<ForeName>([\s\S]*?)<\/ForeName>[\s\S]*?<\/Author>/g;
      let authorMatch: RegExpExecArray | null;
      while ((authorMatch = authorRegex.exec(block)) !== null) {
        const lastName = authorMatch[1]?.trim() ?? '';
        const foreName = authorMatch[2]?.trim() ?? '';
        if (lastName || foreName) {
          authors.push(`${lastName} ${foreName}`.trim());
        }
      }
      if (authors.length > 0) {
        article.authors = authors;
      }

      // Extract DOI
      const doiMatch = block.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/);
      if (doiMatch?.[1]) {
        article.doi = doiMatch[1].trim();
      }

      // Extract Journal Title
      const journalMatch = block.match(/<Title>([\s\S]*?)<\/Title>/);
      if (journalMatch?.[1]) {
        article.journal = this.stripXmlTags(journalMatch[1]).trim();
      }

      // Extract PubDate
      const pubDateMatch = block.match(/<PubDate>([\s\S]*?)<\/PubDate>/);
      if (pubDateMatch?.[1]) {
        const yearMatch = pubDateMatch[1].match(/<Year>(\d{4})<\/Year>/);
        const monthMatch = pubDateMatch[1].match(/<Month>(\w+)<\/Month>/);
        const dayMatch = pubDateMatch[1].match(/<Day>(\d+)<\/Day>/);

        const parts = [yearMatch?.[1], monthMatch?.[1], dayMatch?.[1]].filter(Boolean);
        if (parts.length > 0) {
          article.publicationDate = parts.join(' ');
        }
      }

      if (article.title || article.pmid) {
        articles.push(article);
      }
    }

    return articles;
  }

  private stripXmlTags(text: string): string {
    return text.replace(/<[^>]+>/g, '');
  }
}
