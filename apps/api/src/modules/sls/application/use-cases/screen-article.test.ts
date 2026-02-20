import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScreenArticleUseCase } from './screen-article.js';

const TEST_SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_ARTICLE_ID = '770e8400-e29b-41d4-a716-446655440001';
const TEST_USER_ID = 'user-1';
const TEST_EXCLUSION_CODE_ID = '880e8400-e29b-41d4-a716-446655440002';

function makeArticle(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TEST_ARTICLE_ID,
    sessionId: TEST_SESSION_ID,
    title: 'Test Article',
    status: 'SCORED',
    relevanceScore: 0.72,
    aiCategory: 'uncertain',
    aiExclusionCode: null,
    ...overrides,
  };
}

function makeSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TEST_SESSION_ID,
    status: 'DRAFT',
    projectId: 'project-1',
    ...overrides,
  };
}

function makePrisma(overrides?: { articleResult?: unknown; sessionResult?: unknown }) {
  return {
    article: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.articleResult !== undefined ? overrides.articleResult : makeArticle(),
        ),
      update: vi.fn().mockImplementation(({ data }) => ({
        ...makeArticle(),
        ...data,
      })),
    },
    slsSession: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.sessionResult !== undefined ? overrides.sessionResult : makeSession(),
        ),
    },
    screeningDecision: {
      create: vi.fn().mockResolvedValue({ id: 'decision-1' }),
    },
    exclusionCode: {
      count: vi.fn().mockResolvedValue(1),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ScreenArticleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ScreenArticleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ScreenArticleUseCase(prisma);
  });

  it('includes an article with valid transition SCORED -> INCLUDED', async () => {
    const result = await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'INCLUDED',
        reason: 'Relevant to PICO',
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe('INCLUDED');
    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: TEST_ARTICLE_ID },
      data: { status: 'INCLUDED' },
    });
    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        articleId: TEST_ARTICLE_ID,
        userId: TEST_USER_ID,
        decision: 'INCLUDED',
        reason: 'Relevant to PICO',
        previousStatus: 'SCORED',
        newStatus: 'INCLUDED',
        isAiOverride: false,
      }),
    });
  });

  it('excludes an article with exclusion code', async () => {
    const result = await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'EXCLUDED',
        exclusionCodeId: TEST_EXCLUSION_CODE_ID,
        reason: 'Wrong population',
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe('EXCLUDED');
    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        decision: 'EXCLUDED',
        exclusionCodeId: TEST_EXCLUSION_CODE_ID,
      }),
    });
  });

  it('skips an article', async () => {
    const result = await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'SKIPPED',
        reason: 'Need more context',
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe('SKIPPED');
  });

  it('throws ValidationError when excluding without exclusion code', async () => {
    await expect(
      useCase.execute(
        {
          articleId: TEST_ARTICLE_ID,
          decision: 'EXCLUDED',
          reason: 'Wrong population',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('Exclusion code is required');
  });

  it('throws NotFoundError when article does not exist', async () => {
    prisma = makePrisma({ articleResult: null });
    useCase = new ScreenArticleUseCase(prisma);

    await expect(
      useCase.execute(
        {
          articleId: TEST_ARTICLE_ID,
          decision: 'INCLUDED',
          reason: 'Relevant',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({ sessionResult: makeSession({ status: 'LOCKED' }) });
    useCase = new ScreenArticleUseCase(prisma);

    await expect(
      useCase.execute(
        {
          articleId: TEST_ARTICLE_ID,
          decision: 'INCLUDED',
          reason: 'Relevant',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('session is locked');
  });

  it('throws ValidationError for invalid transition EXCLUDED -> INCLUDED', async () => {
    prisma = makePrisma({ articleResult: makeArticle({ status: 'EXCLUDED' }) });
    useCase = new ScreenArticleUseCase(prisma);

    await expect(
      useCase.execute(
        {
          articleId: TEST_ARTICLE_ID,
          decision: 'INCLUDED',
          reason: 'Relevant',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('Invalid status transition');
  });

  it('detects AI override when AI says likely_irrelevant but user includes', async () => {
    prisma = makePrisma({
      articleResult: makeArticle({ aiCategory: 'likely_irrelevant' }),
    });
    useCase = new ScreenArticleUseCase(prisma);

    await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'INCLUDED',
        reason: 'Actually relevant',
      },
      TEST_USER_ID,
    );

    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isAiOverride: true,
      }),
    });
  });

  it('detects AI override when AI says likely_relevant but user excludes', async () => {
    prisma = makePrisma({
      articleResult: makeArticle({ aiCategory: 'likely_relevant' }),
    });
    useCase = new ScreenArticleUseCase(prisma);

    await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'EXCLUDED',
        exclusionCodeId: TEST_EXCLUSION_CODE_ID,
        reason: 'Not relevant to PICO',
      },
      TEST_USER_ID,
    );

    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isAiOverride: true,
      }),
    });
  });

  it('does not flag AI override when no aiCategory', async () => {
    prisma = makePrisma({
      articleResult: makeArticle({ aiCategory: null }),
    });
    useCase = new ScreenArticleUseCase(prisma);

    await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'INCLUDED',
        reason: 'Relevant',
      },
      TEST_USER_ID,
    );

    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isAiOverride: false,
      }),
    });
  });

  it('throws ValidationError for missing reason', async () => {
    await expect(
      useCase.execute(
        {
          articleId: TEST_ARTICLE_ID,
          decision: 'INCLUDED',
          reason: '',
        },
        TEST_USER_ID,
      ),
    ).rejects.toThrow('Reason is required');
  });

  it('creates audit log entry', async () => {
    await useCase.execute(
      {
        articleId: TEST_ARTICLE_ID,
        decision: 'INCLUDED',
        reason: 'Relevant',
      },
      TEST_USER_ID,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: TEST_USER_ID,
        action: 'sls.article.screened',
        targetType: 'article',
        targetId: TEST_ARTICLE_ID,
      }),
    });
  });
});
