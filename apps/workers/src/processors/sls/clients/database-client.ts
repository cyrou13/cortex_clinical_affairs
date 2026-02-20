import type { ArticleMetadata } from '@cortex/shared';

export interface DatabaseSearchResult {
  articles: ArticleMetadata[];
  totalCount: number;
  database: string;
}

export interface DatabaseClient {
  search(query: string): Promise<DatabaseSearchResult>;
}
