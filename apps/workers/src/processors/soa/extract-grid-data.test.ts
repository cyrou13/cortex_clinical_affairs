import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtractGridDataProcessor } from './extract-grid-data.js';

function makeMockJob(metadata: any) {
  return {
    data: {
      taskId: 'task-1',
      type: 'soa:extract-grid-data',
      metadata,
      createdBy: 'user-1',
    },
    updateProgress: vi.fn(),
  } as any;
}

function makeMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    publish: vi.fn(),
  } as any;
}

function makeMockPrisma(overrides?: { article?: any; gridCells?: any[] }) {
  return {
    article: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.article ?? {
          id: 'article-1',
          title: 'Test Article',
          authors: 'Smith et al.',
          publicationYear: 2023,
          pdfTextContent: 'Sample article content with study data...',
        },
      ),
    },
    gridCell: {
      upsert: vi.fn().mockResolvedValue({ id: 'cell-1' }),
      findMany: vi.fn().mockResolvedValue(overrides?.gridCells ?? []),
    },
  } as any;
}

function makeMockLlmService() {
  return {
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        columns: {
          author: {
            value: 'Smith et al.',
            confidence: 95,
            sourceQuote: 'Smith J, Doe A',
            pageNumber: 1,
          },
          year: { value: '2023', confidence: 100, sourceQuote: 'Published 2023', pageNumber: 1 },
          study_type: {
            value: 'RCT',
            confidence: 80,
            sourceQuote: 'randomized controlled trial',
            pageNumber: 2,
          },
        },
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      model: 'gpt-4',
      provider: 'openai',
      cached: false,
      latencyMs: 1500,
    }),
  } as any;
}

describe('ExtractGridDataProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes articles and extracts grid data', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ExtractGridDataProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1'],
      columnDefinitions: [
        { id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT' },
        { id: 'col-2', name: 'year', displayName: 'Year', dataType: 'NUMERIC' },
        { id: 'col-3', name: 'study_type', displayName: 'Study Type', dataType: 'TEXT' },
      ],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(llmService.complete).toHaveBeenCalledWith(
      'extraction',
      expect.stringContaining('Test Article'),
      expect.objectContaining({ responseFormat: 'json' }),
    );
    expect(prisma.gridCell.upsert).toHaveBeenCalledTimes(3);
  });

  it('skips articles without PDF text', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma({ article: { id: 'article-1', pdfTextContent: null } });
    const llmService = makeMockLlmService();
    const processor = new ExtractGridDataProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1'],
      columnDefinitions: [{ id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT' }],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(llmService.complete).not.toHaveBeenCalled();
  });

  it('handles LLM errors gracefully', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    llmService.complete.mockRejectedValueOnce(new Error('LLM timeout'));
    const processor = new ExtractGridDataProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1', 'article-2'],
      columnDefinitions: [{ id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT' }],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('supports cancellation', async () => {
    const redis = makeMockRedis();
    redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce('1'); // Not cancelled, then cancelled
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ExtractGridDataProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1', 'article-2', 'article-3'],
      columnDefinitions: [{ id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT' }],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(1);
    expect(llmService.complete).toHaveBeenCalledTimes(1);
  });

  it('maps confidence scores to levels correctly', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    llmService.complete.mockResolvedValueOnce({
      content: JSON.stringify({
        columns: {
          field_high: { value: 'High', confidence: 95 },
          field_medium: { value: 'Medium', confidence: 65 },
          field_low: { value: 'Low', confidence: 30 },
        },
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      model: 'gpt-4',
      provider: 'openai',
      cached: false,
      latencyMs: 1500,
    });
    const processor = new ExtractGridDataProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1'],
      columnDefinitions: [
        { id: 'col-1', name: 'field_high', displayName: 'High Confidence', dataType: 'TEXT' },
        { id: 'col-2', name: 'field_medium', displayName: 'Medium Confidence', dataType: 'TEXT' },
        { id: 'col-3', name: 'field_low', displayName: 'Low Confidence', dataType: 'TEXT' },
      ],
    });

    await processor.process(job);

    expect(prisma.gridCell.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ confidenceLevel: 'HIGH' }),
      }),
    );
    expect(prisma.gridCell.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ confidenceLevel: 'MEDIUM' }),
      }),
    );
    expect(prisma.gridCell.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ confidenceLevel: 'LOW' }),
      }),
    );
  });

  it('reports progress after each article', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ExtractGridDataProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1', 'article-2'],
      columnDefinitions: [{ id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT' }],
    });

    await processor.process(job);

    expect(redis.publish).toHaveBeenCalledTimes(2);
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('"current":1'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('"current":2'),
    );
  });
});
