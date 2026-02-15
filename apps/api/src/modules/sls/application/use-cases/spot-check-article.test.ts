import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpotCheckArticleUseCase } from './spot-check-article.js';

const TEST_ARTICLE_ID = '770e8400-e29b-41d4-a716-446655440001';
const TEST_SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = 'user-1';
const TEST_EXCLUSION_CODE_ID = '880e8400-e29b-41d4-a716-446655440002';

function makeArticle(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TEST_ARTICLE_ID,
    sessionId: TEST_SESSION_ID,
    status: 'SCORED',
    relevanceScore: 85,
    aiCategory: 'likely_relevant',
    ...overrides,
  };
}

function makeSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TEST_SESSION_ID,
    status: 'SCREENING',
    ...overrides,
  };
}

function makePrisma(overrides?: {
  article?: unknown;
  session?: unknown;
}) {
  return {
    article: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.article !== undefined ? overrides.article : makeArticle(),
      ),
      update: vi.fn().mockImplementation(({ data }) => ({
        ...makeArticle(),
        ...data,
      })),
    },
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.session !== undefined ? overrides.session : makeSession(),
      ),
    },
    screeningDecision: {
      create: vi.fn().mockResolvedValue({ id: 'decision-1' }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('SpotCheckArticleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: SpotCheckArticleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new SpotCheckArticleUseCase(prisma);
  });

  it('logs agreement when user agrees with AI', async () => {
    const result = await useCase.execute({
      articleId: TEST_ARTICLE_ID,
      userId: TEST_USER_ID,
      agrees: true,
      reason: 'AI classification is correct',
    });

    expect(result.action).toBe('agreed');
    expect(result.articleId).toBe(TEST_ARTICLE_ID);
    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        articleId: TEST_ARTICLE_ID,
        isAiOverride: false,
        reason: 'AI classification is correct',
      }),
    });
    // Article status should NOT change on agreement
    expect(prisma.article.update).not.toHaveBeenCalled();
  });

  it('applies override when user disagrees and provides corrected decision', async () => {
    const result = await useCase.execute({
      articleId: TEST_ARTICLE_ID,
      userId: TEST_USER_ID,
      agrees: false,
      correctedDecision: 'EXCLUDED',
      exclusionCodeId: TEST_EXCLUSION_CODE_ID,
      reason: 'Actually wrong population',
    });

    expect(result.action).toBe('overridden');
    expect(result.newStatus).toBe('EXCLUDED');
    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: TEST_ARTICLE_ID },
      data: { status: 'EXCLUDED' },
    });
    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isAiOverride: true,
        decision: 'EXCLUDED',
        exclusionCodeId: TEST_EXCLUSION_CODE_ID,
      }),
    });
  });

  it('throws when disagreeing without corrected decision', async () => {
    await expect(
      useCase.execute({
        articleId: TEST_ARTICLE_ID,
        userId: TEST_USER_ID,
        agrees: false,
        reason: 'Disagree',
      }),
    ).rejects.toThrow('Corrected decision is required');
  });

  it('throws when excluding without exclusion code', async () => {
    await expect(
      useCase.execute({
        articleId: TEST_ARTICLE_ID,
        userId: TEST_USER_ID,
        agrees: false,
        correctedDecision: 'EXCLUDED',
        reason: 'Wrong population',
      }),
    ).rejects.toThrow('Exclusion code is required');
  });

  it('throws NotFoundError when article not found', async () => {
    prisma = makePrisma({ article: null });
    useCase = new SpotCheckArticleUseCase(prisma);

    await expect(
      useCase.execute({
        articleId: TEST_ARTICLE_ID,
        userId: TEST_USER_ID,
        agrees: true,
        reason: 'OK',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is locked', async () => {
    prisma = makePrisma({ session: makeSession({ status: 'LOCKED' }) });
    useCase = new SpotCheckArticleUseCase(prisma);

    await expect(
      useCase.execute({
        articleId: TEST_ARTICLE_ID,
        userId: TEST_USER_ID,
        agrees: true,
        reason: 'OK',
      }),
    ).rejects.toThrow('session is locked');
  });

  it('creates audit log for overrides', async () => {
    await useCase.execute({
      articleId: TEST_ARTICLE_ID,
      userId: TEST_USER_ID,
      agrees: false,
      correctedDecision: 'INCLUDED',
      reason: 'Actually relevant',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'sls.article.spotCheckOverride',
        targetId: TEST_ARTICLE_ID,
      }),
    });
  });

  it('uses default reason for agreement when not provided', async () => {
    await useCase.execute({
      articleId: TEST_ARTICLE_ID,
      userId: TEST_USER_ID,
      agrees: true,
      reason: '',
    });

    expect(prisma.screeningDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: 'Agrees with AI decision',
      }),
    });
  });
});
