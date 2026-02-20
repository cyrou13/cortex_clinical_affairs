import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockDatasetUseCase } from './lock-dataset.js';

const SESSION_ID = 'sess-1';
const USER_ID = 'user-1';
const PROJECT_ID = 'proj-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makeArticles(statuses: string[]) {
  return statuses.map((status, i) => ({
    id: `art-${i + 1}`,
    status,
    relevanceScore: status === 'INCLUDED' ? 80 : 20,
  }));
}

function makePrisma(overrides: {
  session?: Record<string, unknown> | null;
  pendingCount?: number;
  articles?: Array<Record<string, unknown>>;
  gatesMet?: boolean;
}) {
  const session =
    overrides.session !== undefined
      ? overrides.session
      : {
          id: SESSION_ID,
          projectId: PROJECT_ID,
          status: 'SCREENING',
          likelyRelevantThreshold: 75,
          uncertainLowerThreshold: 40,
          deduplicationStats: { doiDuplicates: 10, pmidDuplicates: 5, titleFuzzyDuplicates: 3 },
        };

  const articles = overrides.articles ?? makeArticles(['INCLUDED', 'EXCLUDED', 'EXCLUDED']);

  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(session),
      update: vi.fn().mockResolvedValue({ ...session, status: 'LOCKED' }),
    },
    article: {
      count: vi.fn().mockResolvedValue(overrides.pendingCount ?? 0),
      findMany: vi.fn().mockResolvedValue(articles),
      groupBy: vi.fn().mockResolvedValue([
        { status: 'INCLUDED', _count: 1 },
        { status: 'EXCLUDED', _count: 2 },
      ]),
    },
    screeningDecision: {
      count: vi.fn().mockResolvedValue(overrides.gatesMet === false ? 0 : 10),
    },
    exclusionCode: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    slsQuery: {
      findMany: vi.fn().mockResolvedValue([{ id: 'q-1', name: 'Query 1' }]),
    },
    queryExecution: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'exec-1',
          database: 'PubMed',
          resultCount: 100,
          queryVersion: { query: { id: 'q-1', name: 'Query 1' } },
        },
      ]),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('LockDatasetUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('locks session when all conditions are met', async () => {
    const prisma = makePrisma({});
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(result.sessionId).toBe(SESSION_ID);
    expect(result.lockedAt).toBeDefined();
    expect(result.prismaStatistics).toBeDefined();
    expect(prisma.slsSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SESSION_ID },
        data: expect.objectContaining({ status: 'LOCKED' }),
      }),
    );
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma({ session: null });
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await expect(useCase.execute({ sessionId: 'missing', userId: USER_ID })).rejects.toThrow(
      'not found',
    );
  });

  it('throws LockConflictError when session already locked', async () => {
    const prisma = makePrisma({
      session: { id: SESSION_ID, projectId: PROJECT_ID, status: 'LOCKED' },
    });
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await expect(useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })).rejects.toThrow(
      'locked',
    );
  });

  it('throws ValidationError when pending articles remain', async () => {
    const prisma = makePrisma({ pendingCount: 5 });
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await expect(useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })).rejects.toThrow(
      '5 article(s) still pending',
    );
  });

  it('throws ValidationError when review gates not met', async () => {
    // Gates not met: 0 spot-checks but articles need 10% checked
    const articles = [
      ...makeArticles(['INCLUDED', 'INCLUDED', 'INCLUDED']),
      // Add likely relevant articles with aiCategory so gate validation detects them
      { id: 'art-lr-1', status: 'INCLUDED', relevanceScore: 80, aiCategory: 'likely_relevant' },
      { id: 'art-lr-2', status: 'INCLUDED', relevanceScore: 85, aiCategory: 'likely_relevant' },
      { id: 'art-lr-3', status: 'INCLUDED', relevanceScore: 90, aiCategory: 'likely_relevant' },
      { id: 'art-lr-4', status: 'INCLUDED', relevanceScore: 92, aiCategory: 'likely_relevant' },
      { id: 'art-lr-5', status: 'INCLUDED', relevanceScore: 88, aiCategory: 'likely_relevant' },
      { id: 'art-lr-6', status: 'INCLUDED', relevanceScore: 82, aiCategory: 'likely_relevant' },
      { id: 'art-lr-7', status: 'INCLUDED', relevanceScore: 78, aiCategory: 'likely_relevant' },
      { id: 'art-lr-8', status: 'INCLUDED', relevanceScore: 95, aiCategory: 'likely_relevant' },
      { id: 'art-lr-9', status: 'INCLUDED', relevanceScore: 77, aiCategory: 'likely_relevant' },
      { id: 'art-lr-10', status: 'INCLUDED', relevanceScore: 81, aiCategory: 'likely_relevant' },
    ];
    const prisma = makePrisma({ articles, gatesMet: false });
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await expect(useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })).rejects.toThrow(
      'review gates not met',
    );
  });

  it('emits domain event on successful lock', async () => {
    const prisma = makePrisma({});
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'sls.dataset.locked',
        aggregateId: SESSION_ID,
        aggregateType: 'SlsSession',
        data: expect.objectContaining({
          sessionId: SESSION_ID,
          projectId: PROJECT_ID,
        }),
      }),
    );
  });

  it('generates PRISMA statistics during lock', async () => {
    const prisma = makePrisma({});
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(result.prismaStatistics).toHaveProperty('identification');
    expect(result.prismaStatistics).toHaveProperty('deduplication');
    expect(result.prismaStatistics).toHaveProperty('screening');
    expect(result.prismaStatistics).toHaveProperty('inclusion');
  });

  it('stores prismaStatistics in session update', async () => {
    const prisma = makePrisma({});
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(prisma.slsSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prismaStatistics: expect.any(Object),
          lockedAt: expect.any(Date),
          lockedById: USER_ID,
        }),
      }),
    );
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma({});
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'sls.dataset.locked',
          targetType: 'slsSession',
          targetId: SESSION_ID,
        }),
      }),
    );
  });

  it('returns article counts', async () => {
    const prisma = makePrisma({});
    const useCase = new LockDatasetUseCase(prisma, eventBus);

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(result.includedCount).toBe(1);
    expect(result.excludedCount).toBe(2);
    expect(result.totalArticles).toBe(3);
  });
});
