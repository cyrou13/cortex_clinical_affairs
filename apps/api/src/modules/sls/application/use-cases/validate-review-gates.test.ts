import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateReviewGatesUseCase } from './validate-review-gates.js';

const TEST_SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';

function makeSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TEST_SESSION_ID,
    status: 'SCREENING',
    likelyRelevantThreshold: 75,
    uncertainLowerThreshold: 40,
    ...overrides,
  };
}

function makeArticles(configs: Array<{ status: string; relevanceScore: number | null }>) {
  return configs.map((c, i) => ({
    id: `article-${i}`,
    status: c.status,
    relevanceScore: c.relevanceScore,
  }));
}

function makePrisma(overrides?: {
  session?: unknown;
  articles?: unknown[];
  spotCheckCount?: number;
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.session !== undefined ? overrides.session : makeSession(),
      ),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(overrides?.articles ?? []),
    },
    screeningDecision: {
      count: vi.fn().mockResolvedValue(overrides?.spotCheckCount ?? 0),
    },
  } as any;
}

describe('ValidateReviewGatesUseCase', () => {
  let useCase: ValidateReviewGatesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('all gates met when all articles reviewed and spot-checks complete', async () => {
    const articles = makeArticles([
      { status: 'INCLUDED', relevanceScore: 85 },
      { status: 'INCLUDED', relevanceScore: 90 },
      { status: 'EXCLUDED', relevanceScore: 20 },
    ]);
    const prisma = makePrisma({ articles, spotCheckCount: 5 });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.allGatesMet).toBe(true);
    expect(result.allArticlesReviewed.met).toBe(true);
    expect(result.allArticlesReviewed.reviewed).toBe(3);
    expect(result.allArticlesReviewed.total).toBe(3);
  });

  it('gate fails when pending articles remain', async () => {
    const articles = makeArticles([
      { status: 'INCLUDED', relevanceScore: 85 },
      { status: 'PENDING', relevanceScore: null },
    ]);
    const prisma = makePrisma({ articles });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.allArticlesReviewed.met).toBe(false);
    expect(result.allArticlesReviewed.reviewed).toBe(1);
    expect(result.allGatesMet).toBe(false);
  });

  it('gate fails when scored articles remain (not yet human-reviewed)', async () => {
    const articles = makeArticles([
      { status: 'INCLUDED', relevanceScore: 85 },
      { status: 'SCORED', relevanceScore: 60 },
    ]);
    const prisma = makePrisma({ articles });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.allArticlesReviewed.met).toBe(false);
  });

  it('calculates likely relevant spot-check requirement', async () => {
    // 10 likely relevant articles (score >= 75) -> need 10% = 1 spot-check
    const articles = makeArticles(
      Array.from({ length: 10 }, () => ({ status: 'INCLUDED', relevanceScore: 85 })),
    );
    const prisma = makePrisma({ articles, spotCheckCount: 1 });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.likelyRelevantSpotChecked.required).toBe(1);
    expect(result.likelyRelevantSpotChecked.met).toBe(true);
  });

  it('likely relevant gate fails when not enough spot-checks', async () => {
    const articles = makeArticles(
      Array.from({ length: 20 }, () => ({ status: 'INCLUDED', relevanceScore: 85 })),
    );
    // Need 10% of 20 = 2, but only have 0
    const prisma = makePrisma({ articles, spotCheckCount: 0 });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.likelyRelevantSpotChecked.required).toBe(2);
    expect(result.likelyRelevantSpotChecked.met).toBe(false);
  });

  it('calculates likely irrelevant spot-check requirement', async () => {
    // 20 likely irrelevant articles (score < 40) -> need 5% = 1
    const articles = makeArticles(
      Array.from({ length: 20 }, () => ({ status: 'EXCLUDED', relevanceScore: 20 })),
    );
    const prisma = makePrisma({ articles, spotCheckCount: 1 });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.likelyIrrelevantSpotChecked.required).toBe(1);
    expect(result.likelyIrrelevantSpotChecked.met).toBe(true);
  });

  it('supports custom thresholds', async () => {
    const articles = makeArticles(
      Array.from({ length: 10 }, () => ({ status: 'INCLUDED', relevanceScore: 85 })),
    );
    const prisma = makePrisma({ articles, spotCheckCount: 2 });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID, {
      likelyRelevantPercentage: 0.20, // 20% -> 2 required
    });

    expect(result.likelyRelevantSpotChecked.required).toBe(2);
    expect(result.likelyRelevantSpotChecked.met).toBe(true);
  });

  it('throws NotFoundError when session not found', async () => {
    const prisma = makePrisma({ session: null });
    useCase = new ValidateReviewGatesUseCase(prisma);

    await expect(useCase.execute(TEST_SESSION_ID)).rejects.toThrow('not found');
  });

  it('handles empty article list', async () => {
    const prisma = makePrisma({ articles: [] });
    useCase = new ValidateReviewGatesUseCase(prisma);

    const result = await useCase.execute(TEST_SESSION_ID);

    expect(result.allArticlesReviewed.met).toBe(true);
    expect(result.allArticlesReviewed.total).toBe(0);
    expect(result.allGatesMet).toBe(true);
  });
});
