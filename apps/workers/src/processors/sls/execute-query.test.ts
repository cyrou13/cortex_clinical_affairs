import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { ExecuteQueryProcessor } from './execute-query.js';
import type { TaskJobData } from '../../shared/base-processor.js';

// Mock all clients
vi.mock('./clients/pubmed-client.js', () => ({
  PubMedClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      articles: [
        { title: 'Test Article 1', pmid: '12345', sourceDatabase: 'PUBMED' },
        { title: 'Test Article 2', pmid: '12346', doi: '10.1234/test', sourceDatabase: 'PUBMED' },
      ],
      totalCount: 2,
      database: 'PUBMED',
    }),
  })),
}));

vi.mock('./clients/pmc-client.js', () => ({
  PmcClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      articles: [{ title: 'PMC Article', pmid: '99999', sourceDatabase: 'PMC' }],
      totalCount: 1,
      database: 'PMC',
    }),
  })),
}));

vi.mock('./clients/google-scholar-client.js', () => ({
  GoogleScholarClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      articles: [{ title: 'Scholar Article', sourceDatabase: 'GOOGLE_SCHOLAR' }],
      totalCount: 1,
      database: 'GOOGLE_SCHOLAR',
    }),
  })),
}));

vi.mock('./clients/clinical-trials-client.js', () => ({
  ClinicalTrialsClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      articles: [{ title: 'Trial Study', pmid: 'NCT001', sourceDatabase: 'CLINICAL_TRIALS' }],
      totalCount: 1,
      database: 'CLINICAL_TRIALS',
    }),
  })),
}));

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'sls.execute-query',
      metadata: {
        queryId: 'query-1',
        databases: ['PUBMED', 'PMC'],
        sessionId: 'session-1',
        executionIds: ['exec-1', 'exec-2'],
        queryString: '(spinal fusion) AND (outcomes)',
      },
      createdBy: 'user-123',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

function createMockPrisma() {
  return {
    article: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    articleQueryLink: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    queryExecution: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('ExecuteQueryProcessor', () => {
  let processor: ExecuteQueryProcessor;
  let mockRedis: {
    publish: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
    };
    mockPrisma = createMockPrisma();
    // After createMany, findMany should return articles with IDs
    mockPrisma.article.findMany
      .mockResolvedValueOnce([]) // first call: existing articles for dedup
      .mockResolvedValue([{ id: 'art-1' }, { id: 'art-2' }]); // subsequent: created articles
    processor = new ExecuteQueryProcessor(mockRedis as never, mockPrisma as never);
  });

  it('processes a job and reports progress', async () => {
    const job = createMockJob();

    await processor.process(job);

    expect(mockRedis.publish).toHaveBeenCalled();

    const progressCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.progress === 100;
    });
    expect(progressCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('publishes completion event with results', async () => {
    const job = createMockJob();

    await processor.process(job);

    const completionCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls.execute-query' && parsed.status === 'COMPLETED';
    });

    expect(completionCalls).toHaveLength(1);
    const completionEvent = JSON.parse(completionCalls[0]![1] as string);
    expect(completionEvent.taskId).toBe('task-001');
    expect(completionEvent.progress).toBe(100);
    expect(completionEvent.total).toBe(2);
    expect(completionEvent.current).toBe(2);
  });

  it('calls search clients and persists articles', async () => {
    const job = createMockJob();

    await processor.process(job);

    // Should have created articles via prisma
    expect(mockPrisma.article.createMany).toHaveBeenCalled();

    // Should have updated QueryExecution records
    expect(mockPrisma.queryExecution.update).toHaveBeenCalledTimes(2);
  });

  it('updates QueryExecution records with results', async () => {
    const job = createMockJob();

    await processor.process(job);

    // First update for PUBMED
    expect(mockPrisma.queryExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-1' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          articlesFound: 2,
        }),
      }),
    );

    // Second update for PMC
    expect(mockPrisma.queryExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-2' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          articlesFound: 1,
        }),
      }),
    );
  });

  it('checks for cancellation before each database', async () => {
    const job = createMockJob();

    await processor.process(job);

    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalledWith('task:cancelled:task-001');
  });

  it('handles cancellation', async () => {
    mockRedis.get.mockResolvedValue('1');

    const job = createMockJob();

    await processor.process(job);

    // All QueryExecution records should be marked CANCELLED
    expect(mockPrisma.queryExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-1' },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
    expect(mockPrisma.queryExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-2' },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });

  it('handles single database job', async () => {
    const job = createMockJob({
      metadata: {
        queryId: 'query-1',
        databases: ['PUBMED'],
        sessionId: 'session-1',
        executionIds: ['exec-1'],
        queryString: 'test query',
      },
    });

    await processor.process(job);

    const completionCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls.execute-query' && parsed.status === 'COMPLETED';
    });

    expect(completionCalls).toHaveLength(1);
    const completionEvent = JSON.parse(completionCalls[0]![1] as string);
    expect(completionEvent.total).toBe(1);
    expect(completionEvent.current).toBe(1);
  });

  it('publishes progress channel using createdBy from job data', async () => {
    const job = createMockJob({ createdBy: 'user-456' });

    await processor.process(job);

    for (const call of mockRedis.publish.mock.calls) {
      expect(call[0]).toBe('task:progress:user-456');
    }
  });
});
