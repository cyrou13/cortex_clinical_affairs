import type { ArticleMetadata } from '@cortex/shared';
import type { DatabaseClient, DatabaseSearchResult } from './database-client.js';

const SERPAPI_BASE = 'https://serpapi.com/search';
const PAGE_SIZE = 20;
const MAX_RESULTS = 200;

interface SerpApiResult {
  title?: string;
  snippet?: string;
  link?: string;
  publication_info?: {
    summary?: string;
  };
}

interface SerpApiResponse {
  organic_results?: SerpApiResult[];
  serpapi_pagination?: {
    next?: string;
  };
  search_information?: {
    total_results?: number;
  };
}

export class GoogleScholarClient implements DatabaseClient {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env['SERPAPI_API_KEY'];
    if (!key) {
      throw new Error('SERPAPI_API_KEY is required for Google Scholar search');
    }
    this.apiKey = key;
  }

  async search(query: string): Promise<DatabaseSearchResult> {
    const allArticles: ArticleMetadata[] = [];
    let start = 0;
    let totalCount = 0;
    let hasMore = true;

    while (hasMore && start < MAX_RESULTS) {
      const params = new URLSearchParams({
        engine: 'google_scholar',
        q: query,
        api_key: this.apiKey,
        start: String(start),
        num: String(PAGE_SIZE),
      });

      const response = await fetch(`${SERPAPI_BASE}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`SerpAPI failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as SerpApiResponse;

      if (start === 0 && data.search_information?.total_results) {
        totalCount = data.search_information.total_results;
      }

      const results = data.organic_results ?? [];
      if (results.length === 0) break;

      for (const result of results) {
        const article = this.parseResult(result);
        if (article) allArticles.push(article);
      }

      hasMore = !!data.serpapi_pagination?.next;
      start += PAGE_SIZE;
    }

    return {
      articles: allArticles,
      totalCount: totalCount || allArticles.length,
      database: 'GOOGLE_SCHOLAR',
    };
  }

  private parseResult(result: SerpApiResult): ArticleMetadata | null {
    if (!result.title) return null;

    const article: ArticleMetadata = {
      title: result.title,
      sourceDatabase: 'GOOGLE_SCHOLAR',
    };

    if (result.snippet) {
      article.abstract = result.snippet;
    }

    // Parse publication_info.summary: "Author1, Author2 - Journal, Year - Publisher"
    if (result.publication_info?.summary) {
      const summary = result.publication_info.summary;
      const parts = summary.split(' - ');

      if (parts[0]) {
        article.authors = parts[0]
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
      }

      if (parts[1]) {
        const journalYear = parts[1];
        const yearMatch = journalYear.match(/(\d{4})/);
        if (yearMatch?.[1]) {
          article.publicationDate = yearMatch[1];
          article.journal = journalYear.replace(/,?\s*\d{4}/, '').trim() || undefined;
        } else {
          article.journal = journalYear.trim();
        }
      }
    }

    // Extract DOI from link if it's a doi.org URL
    if (result.link?.includes('doi.org/')) {
      const doiMatch = result.link.match(/doi\.org\/(.+)/);
      if (doiMatch?.[1]) {
        article.doi = decodeURIComponent(doiMatch[1]);
      }
    }

    return article;
  }
}
