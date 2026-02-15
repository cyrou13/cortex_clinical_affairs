import type { DatabaseClient, DatabaseSearchResult } from './database-client.js';

/**
 * Embase API client stub.
 * Ready for real implementation once Embase API credentials are configured.
 */
export class EmbaseClient implements DatabaseClient {
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['EMBASE_API_KEY'];
  }

  async search(_query: string): Promise<DatabaseSearchResult> {
    if (!this.apiKey) {
      throw new Error('Embase API not configured');
    }

    // TODO: Implement real Embase API integration
    return {
      articles: [],
      totalCount: 0,
      database: 'EMBASE',
    };
  }
}
