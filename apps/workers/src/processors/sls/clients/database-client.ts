import type { ArticleMetadata } from '@cortex/shared';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DatabaseSearchResult {
  articles: ArticleMetadata[];
  totalCount: number;
  database: string;
}

export interface DatabaseClient {
  search(query: string, dateRange?: DateRange): Promise<DatabaseSearchResult>;
}
