import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { CustomFilterScoreProcessor } from './custom-filter-score.js';
import type { TaskJobData } from '../../shared/base-processor.js';

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'sls:custom-filter-score',
      metadata: {
        sessionId: 'session-1',
        filterId: 'filter-1',
        criterion: 'Include only pediatric studies',
        filterName: 'Pediatric filter',
      },
      createdBy: 'user-123',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

function createMockPrisma(articles: Array<{ id: string; title: string; abstract: string | null }> = []) {
  return {
    article: {
      findMany: vi.fn().mockResolvedValue(articles),
      update: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function createMockLlmService(scoreResponse = '{"score": 85}') {
  return {
    complete: vi.fn().mockResolvedValue({
      content: scoreResponse,
      usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110 },
      cost: 0.001,
      model: 'test-model',
      provider: 'test',
      cached: false,
      latencyMs: 100,
    }),
  } as any;
}

describe('CustomFilterScoreProcessor', () => {
  let processor: CustomFilterScoreProcessor;
  let mockRedis: {
    publish: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockLlmService: ReturnType<typeof createMockLlmService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null), // Not cancelled by default
    };
    processor = new CustomFilterScoreProcessor(mockRedis as never);
  });

  it('handles empty article list', async () => {
    mockPrisma = createMockPrisma([]);
    processor.setPrisma(mockPrisma);

    const job = createMockJob();
    await processor.process(job);

    // Should report 100% progress with no articles
    const progressCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.progress === 100;
    });
    expect(progressCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('processes articles in batches and scores them', async () => {
    const articles = [
      { id: 'art-1', title: 'Pediatric study 1', abstract: 'A study on children' },
      { id: 'art-2', title: 'Adult study', abstract: 'A study on adults' },
    ];
    mockPrisma = createMockPrisma(articles);
    mockLlmService = createMockLlmService('{"score": 85}');

    processor.setPrisma(mockPrisma);
    processor.setLlmService(mockLlmService);

    const job = createMockJob();
    await processor.process(job);

    // Should have scored all articles
    expect(mockPrisma.article.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-1' },
        data: { customFilterScore: 85 },
      }),
    );
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-2' },
        data: { customFilterScore: 85 },
      }),
    );
  });

  it('uses LLM service with correct prompt', async () => {
    const articles = [
      { id: 'art-1', title: 'Test Article', abstract: 'Test abstract' },
    ];
    mockPrisma = createMockPrisma(articles);
    mockLlmService = createMockLlmService('{"score": 70}');

    processor.setPrisma(mockPrisma);
    processor.setLlmService(mockLlmService);

    const job = createMockJob();
    await processor.process(job);

    expect(mockLlmService.complete).toHaveBeenCalledWith(
      'scoring',
      expect.stringContaining('Include only pediatric studies'),
      expect.objectContaining({
        temperature: 0.1,
        maxTokens: 50,
        responseFormat: 'json',
      }),
    );

    expect(mockLlmService.complete).toHaveBeenCalledWith(
      'scoring',
      expect.stringContaining('Test Article'),
      expect.anything(),
    );
  });

  it('falls back to score 50 without LLM service', async () => {
    const articles = [
      { id: 'art-1', title: 'Test Article', abstract: 'Test abstract' },
    ];
    mockPrisma = createMockPrisma(articles);
    processor.setPrisma(mockPrisma);
    // Not setting LLM service

    const job = createMockJob();
    await processor.process(job);

    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-1' },
        data: { customFilterScore: 50 },
      }),
    );
  });

  it('handles invalid LLM response by defaulting to 50', async () => {
    const articles = [
      { id: 'art-1', title: 'Test Article', abstract: 'Test abstract' },
    ];
    mockPrisma = createMockPrisma(articles);
    mockLlmService = createMockLlmService('invalid json');

    processor.setPrisma(mockPrisma);
    processor.setLlmService(mockLlmService);

    const job = createMockJob();
    await processor.process(job);

    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-1' },
        data: { customFilterScore: 50 },
      }),
    );
  });

  it('handles out-of-range score by defaulting to 50', async () => {
    const articles = [
      { id: 'art-1', title: 'Test Article', abstract: 'Test abstract' },
    ];
    mockPrisma = createMockPrisma(articles);
    mockLlmService = createMockLlmService('{"score": 150}');

    processor.setPrisma(mockPrisma);
    processor.setLlmService(mockLlmService);

    const job = createMockJob();
    await processor.process(job);

    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-1' },
        data: { customFilterScore: 50 },
      }),
    );
  });

  it('checks for cancellation between batches', async () => {
    const articles = [
      { id: 'art-1', title: 'Article 1', abstract: 'Abstract 1' },
    ];
    mockPrisma = createMockPrisma(articles);
    processor.setPrisma(mockPrisma);

    const job = createMockJob();
    await processor.process(job);

    expect(mockRedis.get).toHaveBeenCalledWith('task:cancelled:task-001');
  });

  it('stops processing when cancelled', async () => {
    const articles = Array.from({ length: 20 }, (_, i) => ({
      id: `art-${i}`,
      title: `Article ${i}`,
      abstract: `Abstract ${i}`,
    }));
    mockPrisma = createMockPrisma(articles);
    processor.setPrisma(mockPrisma);

    // Cancel after first check
    mockRedis.get.mockResolvedValue('1');

    const job = createMockJob();
    await processor.process(job);

    // Should not have processed any articles since cancellation is checked first
    expect(mockPrisma.article.update).not.toHaveBeenCalled();
  });

  it('reports progress correctly', async () => {
    const articles = [
      { id: 'art-1', title: 'Article 1', abstract: 'Abstract 1' },
      { id: 'art-2', title: 'Article 2', abstract: 'Abstract 2' },
    ];
    mockPrisma = createMockPrisma(articles);
    processor.setPrisma(mockPrisma);

    const job = createMockJob();
    await processor.process(job);

    // Should have published progress events
    expect(mockRedis.publish).toHaveBeenCalled();

    // Check final progress was 100
    const finalCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.progress === 100;
    });
    expect(finalCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('handles LLM service errors gracefully', async () => {
    const articles = [
      { id: 'art-1', title: 'Article 1', abstract: 'Abstract 1' },
    ];
    mockPrisma = createMockPrisma(articles);
    mockLlmService = {
      complete: vi.fn().mockRejectedValue(new Error('LLM service unavailable')),
    } as any;

    processor.setPrisma(mockPrisma);
    processor.setLlmService(mockLlmService);

    const job = createMockJob();
    await processor.process(job);

    // Should set score to null on error
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-1' },
        data: { customFilterScore: null },
      }),
    );
  });
});
