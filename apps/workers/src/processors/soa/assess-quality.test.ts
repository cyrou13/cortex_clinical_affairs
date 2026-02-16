import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessQualityProcessor } from './assess-quality.js';

function makeMockJob(metadata: any) {
  return {
    data: {
      taskId: 'task-1',
      type: 'soa:assess-quality',
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
          journal: 'Test Journal',
          publicationYear: 2023,
          abstract: 'Test abstract',
          pdfTextContent: 'Sample article content...',
        },
      ),
    },
    gridCell: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.gridCells ?? [
          {
            gridColumn: { name: 'study_type', displayName: 'Study Type' },
            value: 'RCT',
            aiExtractedValue: 'RCT',
            confidenceScore: 95,
          },
        ],
      ),
    },
    articleQualityAssessment: {
      upsert: vi.fn().mockResolvedValue({ id: 'assessment-1' }),
    },
  } as any;
}

function makeMockLlmService() {
  return {
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        overallQuality: 'HIGH',
        overallScore: 85,
        criteria: {
          methodology: {
            score: 90,
            rating: 'EXCELLENT',
            justification: 'Well-designed RCT with proper randomization',
            concerns: [],
          },
          sample_size: {
            score: 80,
            rating: 'GOOD',
            justification: 'Adequate sample size for statistical power',
            concerns: ['Could benefit from larger sample'],
          },
        },
        strengths: ['Rigorous methodology', 'Good statistical analysis'],
        weaknesses: ['Limited follow-up period'],
        recommendation: 'High-quality evidence suitable for regulatory submission',
      }),
      usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      cost: 0.002,
      model: 'gpt-4',
      provider: 'openai',
      cached: false,
      latencyMs: 2000,
    }),
  } as any;
}

describe('AssessQualityProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes articles and assesses quality', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new AssessQualityProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1'],
      qualityCriteria: [
        { id: 'crit-1', name: 'methodology', description: 'Study design and methodology' },
        { id: 'crit-2', name: 'sample_size', description: 'Sample size adequacy' },
      ],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(llmService.complete).toHaveBeenCalledWith(
      'scoring',
      expect.stringContaining('Test Article'),
      expect.objectContaining({ responseFormat: 'json' }),
    );
    expect(prisma.articleQualityAssessment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          overallQuality: 'HIGH',
          overallScore: 85,
        }),
      }),
    );
  });

  it('skips articles without PDF text', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma({ article: { id: 'article-1', pdfTextContent: null } });
    const llmService = makeMockLlmService();
    const processor = new AssessQualityProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1'],
      qualityCriteria: [{ id: 'crit-1', name: 'methodology', description: 'Study design' }],
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
    const processor = new AssessQualityProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1', 'article-2'],
      qualityCriteria: [{ id: 'crit-1', name: 'methodology', description: 'Study design' }],
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
    const processor = new AssessQualityProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1', 'article-2', 'article-3'],
      qualityCriteria: [{ id: 'crit-1', name: 'methodology', description: 'Study design' }],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(1);
    expect(llmService.complete).toHaveBeenCalledTimes(1);
  });

  it('validates LLM response with Zod schema', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();

    // Invalid response - missing required fields
    llmService.complete.mockResolvedValueOnce({
      content: JSON.stringify({
        overallQuality: 'HIGH',
        // Missing overallScore, criteria, strengths, weaknesses, recommendation
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      model: 'gpt-4',
      provider: 'openai',
      cached: false,
      latencyMs: 1500,
    });

    const processor = new AssessQualityProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1'],
      qualityCriteria: [{ id: 'crit-1', name: 'methodology', description: 'Study design' }],
    });

    const result = await processor.process(job);

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(prisma.articleQualityAssessment.upsert).not.toHaveBeenCalled();
  });

  it('reports progress after each article', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new AssessQualityProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      gridId: 'grid-1',
      soaAnalysisId: 'soa-1',
      articleIds: ['article-1', 'article-2'],
      qualityCriteria: [{ id: 'crit-1', name: 'methodology', description: 'Study design' }],
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
