import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BulkScreenArticlesUseCase } from './bulk-screen-articles.js';

const TEST_SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = 'user-1';
const TEST_EXCLUSION_CODE_ID = '880e8400-e29b-41d4-a716-446655440002';

const ARTICLE_UUIDS = [
  'aa0e8400-e29b-41d4-a716-446655440001',
  'aa0e8400-e29b-41d4-a716-446655440002',
  'aa0e8400-e29b-41d4-a716-446655440003',
];

function makeArticles(count: number, overrides?: Partial<Record<string, unknown>>) {
  return Array.from({ length: count }, (_, i) => ({
    id: ARTICLE_UUIDS[i],
    sessionId: TEST_SESSION_ID,
    title: `Article ${i + 1}`,
    status: 'SCORED',
    aiCategory: 'uncertain',
    ...overrides,
  }));
}

function makeSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TEST_SESSION_ID,
    status: 'DRAFT',
    projectId: 'project-1',
    ...overrides,
  };
}

function makePrisma(overrides?: { articles?: unknown[]; sessionResult?: unknown }) {
  return {
    slsSession: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.sessionResult !== undefined ? overrides.sessionResult : makeSession(),
        ),
    },
    article: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.articles !== undefined ? overrides.articles : makeArticles(3),
        ),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    screeningDecision: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    exclusionCode: {
      count: vi.fn().mockResolvedValue(1),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('BulkScreenArticlesUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: BulkScreenArticlesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new BulkScreenArticlesUseCase(prisma);
  });

  it('bulk includes all articles successfully', async () => {
    const result = await useCase.execute(
      TEST_SESSION_ID,
      {
        articleIds: [ARTICLE_UUIDS[0], ARTICLE_UUIDS[1], ARTICLE_UUIDS[2]],
        decision: 'INCLUDED',
        reason: 'Relevant to PICO',
      },
      TEST_USER_ID,
    );

    expect(result.successCount).toBe(3);
    expect(result.totalRequested).toBe(3);
    expect(prisma.article.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ARTICLE_UUIDS } },
      data: { status: 'INCLUDED' },
    });
    expect(prisma.screeningDecision.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          articleId: ARTICLE_UUIDS[0],
          decision: 'INCLUDED',
          reason: 'Relevant to PICO',
        }),
      ]),
    });
  });

  it('bulk excludes articles with exclusion code', async () => {
    prisma = makePrisma({ articles: makeArticles(2) });
    useCase = new BulkScreenArticlesUseCase(prisma);

    const result = await useCase.execute(
      TEST_SESSION_ID,
      {
        articleIds: [ARTICLE_UUIDS[0], ARTICLE_UUIDS[1]],
        decision: 'EXCLUDED',
        exclusionCodeId: TEST_EXCLUSION_CODE_ID,
        reason: 'Wrong population',
      },
      TEST_USER_ID,
    );

    expect(result.successCount).toBe(2);
  });

  it('throws when excluding without exclusion code', async () => {
    await expect(
      useCase.execute(
        TEST_SESSION_ID,
        {
          articleIds: [ARTICLE_UUIDS[0]],
          decision: 'EXCLUDED',
          reason: 'Wrong',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('Exclusion code is required');
  });

  it('throws when session is LOCKED', async () => {
    prisma = makePrisma({ sessionResult: makeSession({ status: 'LOCKED' }) });
    useCase = new BulkScreenArticlesUseCase(prisma);

    await expect(
      useCase.execute(
        TEST_SESSION_ID,
        {
          articleIds: [ARTICLE_UUIDS[0]],
          decision: 'INCLUDED',
          reason: 'Relevant',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('session is locked');
  });

  it('skips articles with invalid transitions', async () => {
    const mixedArticles = [
      ...makeArticles(2),
      {
        id: ARTICLE_UUIDS[2],
        sessionId: TEST_SESSION_ID,
        title: 'Excluded',
        status: 'EXCLUDED',
        aiCategory: null,
      },
    ];
    prisma = makePrisma({ articles: mixedArticles });
    useCase = new BulkScreenArticlesUseCase(prisma);

    const result = await useCase.execute(
      TEST_SESSION_ID,
      {
        articleIds: [ARTICLE_UUIDS[0], ARTICLE_UUIDS[1], ARTICLE_UUIDS[2]],
        decision: 'INCLUDED',
        reason: 'Relevant',
      },
      TEST_USER_ID,
    );

    // article-3 is EXCLUDED (terminal), can't go to INCLUDED
    expect(result.successCount).toBe(2);
    expect(result.totalRequested).toBe(3);
  });

  it('throws when no articles can transition', async () => {
    prisma = makePrisma({
      articles: makeArticles(2, { status: 'EXCLUDED' }),
    });
    useCase = new BulkScreenArticlesUseCase(prisma);

    await expect(
      useCase.execute(
        TEST_SESSION_ID,
        {
          articleIds: [ARTICLE_UUIDS[0], ARTICLE_UUIDS[1]],
          decision: 'INCLUDED',
          reason: 'Relevant',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('No articles can transition');
  });

  it('throws when no valid articles found in session', async () => {
    prisma = makePrisma({ articles: [] });
    useCase = new BulkScreenArticlesUseCase(prisma);

    await expect(
      useCase.execute(
        TEST_SESSION_ID,
        {
          articleIds: [ARTICLE_UUIDS[0]],
          decision: 'INCLUDED',
          reason: 'Relevant',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('No valid articles');
  });

  it('detects AI overrides in bulk', async () => {
    prisma = makePrisma({
      articles: makeArticles(2, { aiCategory: 'likely_irrelevant' }),
    });
    useCase = new BulkScreenArticlesUseCase(prisma);

    await useCase.execute(
      TEST_SESSION_ID,
      {
        articleIds: [ARTICLE_UUIDS[0], ARTICLE_UUIDS[1]],
        decision: 'INCLUDED',
        reason: 'Actually relevant',
      },
      TEST_USER_ID,
    );

    const createManyCall = prisma.screeningDecision.createMany.mock.calls[0][0];
    expect(createManyCall.data[0].isAiOverride).toBe(true);
    expect(createManyCall.data[1].isAiOverride).toBe(true);
  });

  it('creates audit log entry', async () => {
    await useCase.execute(
      TEST_SESSION_ID,
      {
        articleIds: [ARTICLE_UUIDS[0], ARTICLE_UUIDS[1]],
        decision: 'INCLUDED',
        reason: 'Relevant',
      },
      TEST_USER_ID,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'sls.articles.bulkScreened',
        targetType: 'slsSession',
        targetId: TEST_SESSION_ID,
      }),
    });
  });
});
