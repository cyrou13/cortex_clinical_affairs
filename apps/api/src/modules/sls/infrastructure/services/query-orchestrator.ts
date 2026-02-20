import type { DatabaseClient, DatabaseSearchResult, ArticleMetadata } from './database-client.js';
import { PubMedClient } from './pubmed-client.js';

export interface PerDatabaseResult {
  database: string;
  status: 'success' | 'failed';
  articles: ArticleMetadata[];
  totalCount: number;
  errorMessage?: string;
}

export interface OrchestratorResult {
  results: PerDatabaseResult[];
  totalArticles: number;
  allArticles: ArticleMetadata[];
}

const PER_DATABASE_TIMEOUT_MS = 25_000;

export class QueryOrchestrator {
  private readonly clients: Map<string, DatabaseClient>;

  constructor(clients?: Map<string, DatabaseClient>) {
    this.clients = clients ?? new Map<string, DatabaseClient>([['PUBMED', new PubMedClient()]]);
  }

  async executeAcrossDatabases(query: string, databases: string[]): Promise<OrchestratorResult> {
    const promises = databases.map((db) => this.executeWithTimeout(db, query));

    const settled = await Promise.allSettled(promises);

    const results: PerDatabaseResult[] = [];
    const allArticles: ArticleMetadata[] = [];

    for (let i = 0; i < databases.length; i++) {
      const db = databases[i]!;
      const outcome = settled[i]!;

      if (outcome.status === 'fulfilled') {
        const searchResult = outcome.value;
        results.push({
          database: db,
          status: 'success',
          articles: searchResult.articles,
          totalCount: searchResult.totalCount,
        });
        allArticles.push(...searchResult.articles);
      } else {
        const errorMessage =
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        results.push({
          database: db,
          status: 'failed',
          articles: [],
          totalCount: 0,
          errorMessage,
        });
      }
    }

    return {
      results,
      totalArticles: allArticles.length,
      allArticles,
    };
  }

  private async executeWithTimeout(database: string, query: string): Promise<DatabaseSearchResult> {
    const client = this.clients.get(database);
    if (!client) {
      throw new Error(`No client configured for database: ${database}`);
    }

    return Promise.race([
      client.search(query),
      new Promise<never>((_resolve, reject) => {
        setTimeout(
          () => reject(new Error(`Search timed out for database: ${database}`)),
          PER_DATABASE_TIMEOUT_MS,
        );
      }),
    ]);
  }
}
