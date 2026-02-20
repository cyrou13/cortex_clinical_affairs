import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpotCheckSamplingService } from './spot-check-sampling.js';

function makePrisma(overrides: {
  session?: Record<string, unknown> | null;
  articles?: Array<Record<string, unknown>>;
  spotCheckedIds?: string[];
}) {
  const session =
    overrides.session !== undefined
      ? overrides.session
      : {
          id: 'sess-1',
          status: 'IN_PROGRESS',
          likelyRelevantThreshold: 75,
          uncertainLowerThreshold: 40,
        };

  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(session),
    },
    screeningDecision: {
      findMany: vi
        .fn()
        .mockResolvedValue((overrides.spotCheckedIds ?? []).map((id) => ({ articleId: id }))),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(overrides.articles ?? []),
    },
  } as any;
}

const makeArticles = (count: number, scoreBase = 80) =>
  Array.from({ length: count }, (_, i) => ({
    id: `art-${i + 1}`,
    title: `Article ${i + 1}`,
    abstract: `Abstract ${i + 1}`,
    relevanceScore: scoreBase + i,
    aiCategory: scoreBase >= 75 ? 'likely_relevant' : 'likely_irrelevant',
    aiReasoning: 'AI reasoning',
    aiExclusionCode: null,
    status: 'SCORED',
  }));

describe('SpotCheckSamplingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns articles for likely_relevant category', async () => {
    const articles = makeArticles(5, 80);
    const prisma = makePrisma({ articles });
    const service = new SpotCheckSamplingService(prisma);

    const result = await service.generateSample('sess-1', 'likely_relevant', 3);

    expect(result).toHaveLength(3);
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: 'sess-1',
          aiCategory: 'likely_relevant',
        }),
      }),
    );
  });

  it('returns articles for likely_irrelevant category', async () => {
    const articles = makeArticles(5, 20);
    const prisma = makePrisma({ articles });
    const service = new SpotCheckSamplingService(prisma);

    const result = await service.generateSample('sess-1', 'likely_irrelevant', 3);

    expect(result).toHaveLength(3);
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: 'sess-1',
          aiCategory: 'likely_irrelevant',
        }),
      }),
    );
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma({ session: null });
    const service = new SpotCheckSamplingService(prisma);

    await expect(service.generateSample('missing-sess', 'likely_relevant', 5)).rejects.toThrow(
      'not found',
    );
  });

  it('excludes already spot-checked articles', async () => {
    const articles = makeArticles(3, 80);
    const prisma = makePrisma({ articles, spotCheckedIds: ['art-already-checked'] });
    const service = new SpotCheckSamplingService(prisma);

    await service.generateSample('sess-1', 'likely_relevant', 3);

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ['art-already-checked'] },
        }),
      }),
    );
  });

  it('returns fewer articles if not enough eligible', async () => {
    const articles = makeArticles(2, 80);
    const prisma = makePrisma({ articles });
    const service = new SpotCheckSamplingService(prisma);

    const result = await service.generateSample('sess-1', 'likely_relevant', 10);

    expect(result).toHaveLength(2);
  });

  it('returns empty array when no articles match', async () => {
    const prisma = makePrisma({ articles: [] });
    const service = new SpotCheckSamplingService(prisma);

    const result = await service.generateSample('sess-1', 'likely_relevant', 5);

    expect(result).toHaveLength(0);
  });

  it('uses aiCategory for filtering regardless of session thresholds', async () => {
    const session = {
      id: 'sess-1',
      status: 'IN_PROGRESS',
      likelyRelevantThreshold: 80,
      uncertainLowerThreshold: 30,
    };
    const prisma = makePrisma({ session, articles: [] });
    const service = new SpotCheckSamplingService(prisma);

    await service.generateSample('sess-1', 'likely_relevant', 5);

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          aiCategory: 'likely_relevant',
        }),
      }),
    );
  });
});
