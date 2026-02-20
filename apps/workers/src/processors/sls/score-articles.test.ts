import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { ScoreArticlesProcessor } from './score-articles.js';
import type { TaskJobData } from '../../shared/base-processor.js';

function makeArticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `article-${i + 1}`,
    title: `Article ${i + 1} title`,
    abstract: `Abstract for article ${i + 1}`,
    authors: [{ lastName: 'Author', firstName: `${i + 1}` }],
    journal: 'Test Journal',
    publicationDate: new Date('2023-01-01'),
  }));
}

function makeLlmResponse(articleIds: string[]) {
  const results = articleIds.map((id, i) => ({
    articleId: id,
    relevanceScore: i % 3 === 0 ? 0.9 : i % 3 === 1 ? 0.5 : 0.2,
    aiCategory: i % 3 === 0 ? 'likely_relevant' : i % 3 === 1 ? 'uncertain' : 'likely_irrelevant',
    aiExclusionCode: i % 3 === 2 ? 'E1' : null,
    aiReasoning: `Reasoning for ${id}`,
  }));

  return {
    content: JSON.stringify(results),
    model: 'claude-3-haiku',
    provider: 'claude',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    cost: 0.001,
    cached: false,
    latencyMs: 500,
  };
}

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  const articleIds = Array.from({ length: 3 }, (_, i) => `article-${i + 1}`);
  return {
    data: {
      taskId: 'task-001',
      type: 'sls.score-articles',
      metadata: {
        sessionId: 'session-1',
        articleIds,
        exclusionCodes: [{ code: 'E1', label: 'Wrong population', shortCode: 'WP' }],
        sessionName: 'Test Session',
        sessionType: 'SOA_CLINICAL',
        scopeFields: { population: 'Adults' },
        projectId: 'project-1',
        totalArticles: 3,
      },
      createdBy: 'user-123',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

describe('ScoreArticlesProcessor', () => {
  let processor: ScoreArticlesProcessor;
  let mockRedis: {
    publish: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let mockLlmService: {
    complete: ReturnType<typeof vi.fn>;
  };
  let mockPrisma: {
    article: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    asyncTask: {
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null), // Not cancelled by default
    };

    mockLlmService = {
      complete: vi.fn(),
    };

    mockPrisma = {
      article: {
        findMany: vi.fn().mockResolvedValue(makeArticles(3)),
        update: vi.fn().mockResolvedValue({}),
      },
      asyncTask: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    processor = new ScoreArticlesProcessor(
      mockRedis as never,
      mockLlmService as any,
      mockPrisma as any,
    );
  });

  it('processes articles and updates their scores', async () => {
    const job = createMockJob();
    const articleIds = ['article-1', 'article-2', 'article-3'];
    mockLlmService.complete.mockResolvedValue(makeLlmResponse(articleIds));

    await processor.process(job);

    // Should fetch articles from database
    expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: articleIds },
        status: 'PENDING',
      },
      select: {
        id: true,
        title: true,
        abstract: true,
        authors: true,
        journal: true,
        publicationDate: true,
      },
    });

    // Should call LLM once (3 articles < batch size of 10)
    expect(mockLlmService.complete).toHaveBeenCalledTimes(1);
    expect(mockLlmService.complete).toHaveBeenCalledWith(
      'scoring',
      expect.any(String),
      expect.objectContaining({
        systemPrompt: expect.any(String),
        responseFormat: 'json',
        temperature: 0.1,
      }),
      'project-1',
    );

    // Should update each article
    expect(mockPrisma.article.update).toHaveBeenCalledTimes(3);
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'article-1' },
        data: expect.objectContaining({
          relevanceScore: 0.9,
          aiCategory: 'likely_relevant',
          aiExclusionCode: null,
          status: 'SCORED',
          scoredAt: expect.any(Date),
        }),
      }),
    );
  });

  it('processes articles in batches of 10', async () => {
    const articleCount = 25;
    const articleIds = Array.from({ length: articleCount }, (_, i) => `article-${i + 1}`);

    const job = createMockJob({
      metadata: {
        sessionId: 'session-1',
        articleIds,
        exclusionCodes: [],
        sessionName: 'Test',
        sessionType: 'SOA_CLINICAL',
        scopeFields: null,
        projectId: 'project-1',
        totalArticles: articleCount,
      },
    });

    mockPrisma.article.findMany.mockResolvedValue(makeArticles(articleCount));

    // Mock LLM responses for each batch
    mockLlmService.complete
      .mockResolvedValueOnce(makeLlmResponse(articleIds.slice(0, 10)))
      .mockResolvedValueOnce(makeLlmResponse(articleIds.slice(10, 20)))
      .mockResolvedValueOnce(makeLlmResponse(articleIds.slice(20, 25)));

    await processor.process(job);

    // Should call LLM 3 times (10 + 10 + 5)
    expect(mockLlmService.complete).toHaveBeenCalledTimes(3);

    // Should update all 25 articles
    expect(mockPrisma.article.update).toHaveBeenCalledTimes(25);
  });

  it('reports progress after each batch', async () => {
    const job = createMockJob();
    const articleIds = ['article-1', 'article-2', 'article-3'];
    mockLlmService.complete.mockResolvedValue(makeLlmResponse(articleIds));

    await processor.process(job);

    // Should have published multiple progress events
    expect(mockRedis.publish).toHaveBeenCalled();

    // Find the final progress event (progress === 100)
    const finalCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls.score-articles' && parsed.progress === 100;
    });

    expect(finalCalls).toHaveLength(1);
    const finalEvent = JSON.parse(finalCalls[0]![1] as string);
    expect(finalEvent.taskId).toBe('task-001');
    expect(finalEvent.current).toBe(3);
    expect(finalEvent.total).toBe(3);
  });

  it('checks for cancellation between batches', async () => {
    const articleCount = 15;
    const articleIds = Array.from({ length: articleCount }, (_, i) => `article-${i + 1}`);

    const job = createMockJob({
      metadata: {
        sessionId: 'session-1',
        articleIds,
        exclusionCodes: [],
        sessionName: 'Test',
        sessionType: 'SOA_CLINICAL',
        scopeFields: null,
        projectId: 'project-1',
        totalArticles: articleCount,
      },
    });

    mockPrisma.article.findMany.mockResolvedValue(makeArticles(articleCount));

    // Cancel after first batch
    mockRedis.get
      .mockResolvedValueOnce(null) // First batch: not cancelled
      .mockResolvedValueOnce('1'); // Second batch: cancelled

    mockLlmService.complete.mockResolvedValue(makeLlmResponse(articleIds.slice(0, 10)));

    await processor.process(job);

    // Should only process 1 batch (10 articles), not the remaining 5
    expect(mockLlmService.complete).toHaveBeenCalledTimes(1);
    expect(mockPrisma.article.update).toHaveBeenCalledTimes(10);

    // Check cancellation was verified
    expect(mockRedis.get).toHaveBeenCalledWith('task:cancelled:task-001');
  });

  it('handles LLM errors gracefully and continues with next batch', async () => {
    const articleCount = 15;
    const articleIds = Array.from({ length: articleCount }, (_, i) => `article-${i + 1}`);

    const job = createMockJob({
      metadata: {
        sessionId: 'session-1',
        articleIds,
        exclusionCodes: [],
        sessionName: 'Test',
        sessionType: 'SOA_CLINICAL',
        scopeFields: null,
        projectId: 'project-1',
        totalArticles: articleCount,
      },
    });

    mockPrisma.article.findMany.mockResolvedValue(makeArticles(articleCount));

    // First batch fails, second succeeds
    mockLlmService.complete
      .mockRejectedValueOnce(new Error('LLM timeout'))
      .mockResolvedValueOnce(makeLlmResponse(articleIds.slice(10, 15)));

    await processor.process(job);

    // Should call LLM twice (first fails, second succeeds)
    expect(mockLlmService.complete).toHaveBeenCalledTimes(2);

    // Should only update 5 articles (second batch only)
    expect(mockPrisma.article.update).toHaveBeenCalledTimes(5);

    // Should still emit final progress event
    const finalCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls.score-articles' && parsed.progress === 100;
    });
    expect(finalCalls).toHaveLength(1);
  });

  it('handles empty articles list', async () => {
    const job = createMockJob();
    mockPrisma.article.findMany.mockResolvedValue([]);

    await processor.process(job);

    // Should not call LLM
    expect(mockLlmService.complete).not.toHaveBeenCalled();

    // Should emit final progress event with 0 articles scored
    const finalCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls.score-articles' && parsed.progress === 100;
    });
    expect(finalCalls).toHaveLength(1);
    const finalEvent = JSON.parse(finalCalls[0]![1] as string);
    expect(finalEvent.current).toBe(0);
  });

  it('publishes on correct channel using createdBy', async () => {
    const job = createMockJob({ createdBy: 'user-456' });
    const articleIds = ['article-1', 'article-2', 'article-3'];
    mockLlmService.complete.mockResolvedValue(makeLlmResponse(articleIds));

    await processor.process(job);

    for (const call of mockRedis.publish.mock.calls) {
      expect(call[0]).toBe('task:progress:user-456');
    }
  });

  it('handles cancellation on first batch check', async () => {
    const job = createMockJob();
    mockRedis.get.mockResolvedValue('1'); // Cancelled immediately

    await processor.process(job);

    // Should not call LLM at all
    expect(mockLlmService.complete).not.toHaveBeenCalled();
    expect(mockPrisma.article.update).not.toHaveBeenCalled();
  });

  it('only updates articles that are in the batch', async () => {
    const job = createMockJob();
    const _articleIds = ['article-1', 'article-2', 'article-3'];

    // LLM returns a result for an article NOT in the batch
    const badResponse = {
      content: JSON.stringify([
        {
          articleId: 'article-1',
          relevanceScore: 0.9,
          aiCategory: 'likely_relevant',
          aiExclusionCode: null,
          aiReasoning: 'Good',
        },
        {
          articleId: 'rogue-article',
          relevanceScore: 0.5,
          aiCategory: 'uncertain',
          aiExclusionCode: null,
          aiReasoning: 'Not in batch',
        },
      ]),
      model: 'claude-3-haiku',
      provider: 'claude',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      cached: false,
      latencyMs: 500,
    };

    mockLlmService.complete.mockResolvedValue(badResponse);

    await processor.process(job);

    // Should only update article-1, not rogue-article
    const updateCalls = mockPrisma.article.update.mock.calls;
    const updatedIds = updateCalls.map((call: any) => call[0].where.id);
    expect(updatedIds).toContain('article-1');
    expect(updatedIds).not.toContain('rogue-article');
  });

  it('uses setLlmService and setPrisma methods', () => {
    const processor = new ScoreArticlesProcessor(mockRedis as never);

    // Before setting, these are undefined
    processor.setLlmService(mockLlmService as any);
    processor.setPrisma(mockPrisma as any);

    // Verify it doesn't throw - the methods exist and work
    expect(processor).toBeDefined();
  });

  it('sends system prompt with PICO context', async () => {
    const job = createMockJob();
    const articleIds = ['article-1', 'article-2', 'article-3'];
    mockLlmService.complete.mockResolvedValue(makeLlmResponse(articleIds));

    await processor.process(job);

    const callArgs = mockLlmService.complete.mock.calls[0]!;
    const options = callArgs[2] as { systemPrompt: string };
    expect(options.systemPrompt).toContain('Test Session');
    expect(options.systemPrompt).toContain('SOA_CLINICAL');
    expect(options.systemPrompt).toContain('Adults');
    expect(options.systemPrompt).toContain('Wrong population');
  });

  it('handles parse error in LLM response', async () => {
    const job = createMockJob();
    mockLlmService.complete.mockResolvedValue({
      content: 'invalid json response',
      model: 'claude-3-haiku',
      provider: 'claude',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      cached: false,
      latencyMs: 500,
    });

    await processor.process(job);

    // Should not update any articles
    expect(mockPrisma.article.update).not.toHaveBeenCalled();

    // Should still complete (error is caught and continued)
    const finalCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls.score-articles' && parsed.progress === 100;
    });
    expect(finalCalls).toHaveLength(1);
  });
});
