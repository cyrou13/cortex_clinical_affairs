import type { DatabaseClient, DatabaseSearchResult } from './database-client.js';

/**
 * Cochrane Library API client stub.
 * Ready for real implementation once Cochrane API credentials are configured.
 */
export class CochraneClient implements DatabaseClient {
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['COCHRANE_API_KEY'];
  }

  async search(_query: string): Promise<DatabaseSearchResult> {
    if (!this.apiKey) {
      throw new Error('Cochrane API not configured');
    }

    // TODO: Implement real Cochrane API integration
    return {
      articles: [],
      totalCount: 0,
      database: 'COCHRANE',
    };
  }
}
