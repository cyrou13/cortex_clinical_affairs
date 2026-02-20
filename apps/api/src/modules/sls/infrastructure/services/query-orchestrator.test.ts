import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryOrchestrator } from './query-orchestrator.js';
import type { DatabaseClient, DatabaseSearchResult } from './database-client.js';

function createMockClient(
  result?: Partial<DatabaseSearchResult>,
  error?: Error,
  delay?: number,
): DatabaseClient {
  return {
    search: vi.fn().mockImplementation(async () => {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      if (error) {
        throw error;
      }
      return {
        articles: result?.articles ?? [
          { title: 'Article 1', sourceDatabase: 'MOCK' },
          { title: 'Article 2', sourceDatabase: 'MOCK' },
        ],
        totalCount: result?.totalCount ?? 2,
        database: result?.database ?? 'MOCK',
      } satisfies DatabaseSearchResult;
    }),
  };
}

describe('QueryOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes search across a single database', async () => {
    const mockPubmed = createMockClient({
      articles: [{ title: 'PubMed Article', sourceDatabase: 'PUBMED' }],
      totalCount: 1,
      database: 'PUBMED',
    });

    const clients = new Map([['PUBMED', mockPubmed]]);
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('spinal fusion', ['PUBMED']);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.database).toBe('PUBMED');
    expect(result.results[0]!.status).toBe('success');
    expect(result.results[0]!.articles).toHaveLength(1);
    expect(result.totalArticles).toBe(1);
  });

  it('executes search across multiple databases in parallel', async () => {
    const mockPubmed = createMockClient({
      articles: [{ title: 'PubMed Article', sourceDatabase: 'PUBMED' }],
      totalCount: 1,
      database: 'PUBMED',
    });
    const mockPmc = createMockClient({
      articles: [{ title: 'PMC Article', sourceDatabase: 'PMC' }],
      totalCount: 1,
      database: 'PMC',
    });

    const clients = new Map<string, DatabaseClient>([
      ['PUBMED', mockPubmed],
      ['PMC', mockPmc],
    ]);
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('test query', ['PUBMED', 'PMC']);

    expect(result.results).toHaveLength(2);
    expect(result.totalArticles).toBe(2);
    expect(result.allArticles).toHaveLength(2);
    expect(mockPubmed.search).toHaveBeenCalledWith('test query');
    expect(mockPmc.search).toHaveBeenCalledWith('test query');
  });

  it('handles partial failure gracefully', async () => {
    const mockPubmed = createMockClient({
      articles: [{ title: 'PubMed Article', sourceDatabase: 'PUBMED' }],
      totalCount: 1,
      database: 'PUBMED',
    });
    const mockPmc = createMockClient(undefined, new Error('PMC API error'));

    const clients = new Map<string, DatabaseClient>([
      ['PUBMED', mockPubmed],
      ['PMC', mockPmc],
    ]);
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('test query', ['PUBMED', 'PMC']);

    expect(result.results).toHaveLength(2);

    const pubmedResult = result.results.find((r) => r.database === 'PUBMED');
    expect(pubmedResult!.status).toBe('success');
    expect(pubmedResult!.articles).toHaveLength(1);

    const pmcResult = result.results.find((r) => r.database === 'PMC');
    expect(pmcResult!.status).toBe('failed');
    expect(pmcResult!.errorMessage).toBe('PMC API error');
    expect(pmcResult!.articles).toHaveLength(0);

    expect(result.totalArticles).toBe(1);
  });

  it('handles timeout for slow databases', async () => {
    const mockPubmed = createMockClient({
      articles: [{ title: 'Fast Article', sourceDatabase: 'PUBMED' }],
      totalCount: 1,
      database: 'PUBMED',
    });
    const mockSlow = createMockClient(undefined, undefined, 30_000);

    const clients = new Map<string, DatabaseClient>([
      ['PUBMED', mockPubmed],
      ['SLOW_DB', mockSlow],
    ]);
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('test query', ['PUBMED', 'SLOW_DB']);

    expect(result.results).toHaveLength(2);

    const pubmedResult = result.results.find((r) => r.database === 'PUBMED');
    expect(pubmedResult!.status).toBe('success');

    const slowResult = result.results.find((r) => r.database === 'SLOW_DB');
    expect(slowResult!.status).toBe('failed');
    expect(slowResult!.errorMessage).toContain('timed out');
  }, 35_000);

  it('returns error when database client is not configured', async () => {
    const clients = new Map<string, DatabaseClient>();
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('test', ['UNKNOWN_DB']);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.status).toBe('failed');
    expect(result.results[0]!.errorMessage).toContain('No client configured');
  });

  it('combines articles from all successful databases', async () => {
    const mockPubmed = createMockClient({
      articles: [
        { title: 'PubMed 1', sourceDatabase: 'PUBMED' },
        { title: 'PubMed 2', sourceDatabase: 'PUBMED' },
      ],
      totalCount: 2,
      database: 'PUBMED',
    });
    const mockClinicalTrials = createMockClient({
      articles: [{ title: 'Trial 1', sourceDatabase: 'CLINICAL_TRIALS' }],
      totalCount: 1,
      database: 'CLINICAL_TRIALS',
    });

    const clients = new Map<string, DatabaseClient>([
      ['PUBMED', mockPubmed],
      ['CLINICAL_TRIALS', mockClinicalTrials],
    ]);
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('test', ['PUBMED', 'CLINICAL_TRIALS']);

    expect(result.allArticles).toHaveLength(3);
    expect(result.totalArticles).toBe(3);
  });

  it('handles all databases failing', async () => {
    const mockPubmed = createMockClient(undefined, new Error('PubMed down'));
    const mockPmc = createMockClient(undefined, new Error('PMC down'));

    const clients = new Map<string, DatabaseClient>([
      ['PUBMED', mockPubmed],
      ['PMC', mockPmc],
    ]);
    const orchestrator = new QueryOrchestrator(clients);

    const result = await orchestrator.executeAcrossDatabases('test', ['PUBMED', 'PMC']);

    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.status === 'failed')).toBe(true);
    expect(result.totalArticles).toBe(0);
    expect(result.allArticles).toHaveLength(0);
  });

  it('handles empty databases array', async () => {
    const orchestrator = new QueryOrchestrator(new Map());

    const result = await orchestrator.executeAcrossDatabases('test', []);

    expect(result.results).toHaveLength(0);
    expect(result.totalArticles).toBe(0);
  });
});
