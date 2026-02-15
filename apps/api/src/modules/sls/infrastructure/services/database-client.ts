/**
 * Common interface for all literature database clients (PubMed, Cochrane, Embase).
 */

export interface ArticleMetadata {
  title: string;
  abstract?: string;
  authors?: string[];
  doi?: string;
  pmid?: string;
  publicationDate?: string;
  journal?: string;
  sourceDatabase: string;
}

export interface DatabaseSearchResult {
  articles: ArticleMetadata[];
  totalCount: number;
  database: string;
}

export interface DatabaseClient {
  search(query: string): Promise<DatabaseSearchResult>;
}
