import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoreArticlesUseCase } from './score-articles.js';

const TEST_SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';

function makePrisma(overrides?: {
  sessionResult?: unknown;
  articleResults?: unknown[];
  exclusionCodes?: unknown[];
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : {
              id: TEST_SESSION_ID,
              name: 'Test Session',
              type: 'SOA_CLINICAL',
              status: 'DRAFT',
              projectId: 'project-1',
              scopeFields: {
                population: 'Adults',
                intervention: 'Spinal fusion',
              },
            },
      ),
    },
    article: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.articleResults !== undefined
            ? overrides.articleResults
            : [{ id: 'article-1' }, { id: 'article-2' }, { id: 'article-3' }],
        ),
    },
    exclusionCode: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.exclusionCodes !== undefined
          ? overrides.exclusionCodes
          : [
              { code: 'E1', label: 'Wrong population', shortCode: 'WP' },
              { code: 'E2', label: 'Wrong intervention', shortCode: 'WI' },
            ],
      ),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({
        id: 'task-1',
        type: 'sls.score-articles',
        status: 'PENDING',
        progress: 0,
        metadata: {},
        createdBy: 'user-1',
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeRedis() {
  return {
    publish: vi.fn().mockResolvedValue(1),
  } as any;
}

describe('ScoreArticlesUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let useCase: ScoreArticlesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    redis = makeRedis();
    useCase = new ScoreArticlesUseCase(prisma, redis);
  });

  it('enqueues scoring task and returns taskId', async () => {
    const result = await useCase.execute(TEST_SESSION_ID, 'user-1');

    expect(result.taskId).toBe('task-1');

    // Should look up session
    expect(prisma.slsSession.findUnique).toHaveBeenCalledWith({
      where: { id: TEST_SESSION_ID },
    });

    // Should look up pending articles
    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: { sessionId: TEST_SESSION_ID, status: 'PENDING' },
      select: { id: true },
    });

    // Should look up exclusion codes
    expect(prisma.exclusionCode.findMany).toHaveBeenCalledWith({
      where: { sessionId: TEST_SESSION_ID },
      select: { code: true, label: true, shortCode: true },
    });

    // Should create async task
    expect(prisma.asyncTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'sls.score-articles',
          status: 'PENDING',
          metadata: expect.objectContaining({
            sessionId: TEST_SESSION_ID,
            articleIds: ['article-1', 'article-2', 'article-3'],
            totalArticles: 3,
            projectId: 'project-1',
          }),
        }),
      }),
    );
  });

  it('throws NotFoundError when session does not exist', async () => {
    prisma = makePrisma({ sessionResult: null });
    useCase = new ScoreArticlesUseCase(prisma, redis);

    await expect(useCase.execute(TEST_SESSION_ID, 'user-1')).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({
      sessionResult: {
        id: TEST_SESSION_ID,
        name: 'Test',
        type: 'SOA_CLINICAL',
        status: 'LOCKED',
        projectId: 'project-1',
        scopeFields: null,
      },
    });
    useCase = new ScoreArticlesUseCase(prisma, redis);

    await expect(useCase.execute(TEST_SESSION_ID, 'user-1')).rejects.toThrow('session is locked');
  });

  it('throws ValidationError when no pending articles', async () => {
    prisma = makePrisma({ articleResults: [] });
    useCase = new ScoreArticlesUseCase(prisma, redis);

    await expect(useCase.execute(TEST_SESSION_ID, 'user-1')).rejects.toThrow('No pending articles');
  });

  it('includes scope fields in task metadata', async () => {
    const result = await useCase.execute(TEST_SESSION_ID, 'user-1');

    expect(result.taskId).toBe('task-1');

    const createCall = prisma.asyncTask.create.mock.calls[0][0];
    expect(createCall.data.metadata.scopeFields).toEqual({
      population: 'Adults',
      intervention: 'Spinal fusion',
    });
  });

  it('includes exclusion codes in task metadata', async () => {
    await useCase.execute(TEST_SESSION_ID, 'user-1');

    const createCall = prisma.asyncTask.create.mock.calls[0][0];
    expect(createCall.data.metadata.exclusionCodes).toEqual([
      { code: 'E1', label: 'Wrong population', shortCode: 'WP' },
      { code: 'E2', label: 'Wrong intervention', shortCode: 'WI' },
    ]);
  });

  it('handles session with null scope fields', async () => {
    prisma = makePrisma({
      sessionResult: {
        id: TEST_SESSION_ID,
        name: 'Test',
        type: 'SOA_CLINICAL',
        status: 'DRAFT',
        projectId: 'project-1',
        scopeFields: null,
      },
    });
    useCase = new ScoreArticlesUseCase(prisma, redis);

    const result = await useCase.execute(TEST_SESSION_ID, 'user-1');
    expect(result.taskId).toBe('task-1');

    const createCall = prisma.asyncTask.create.mock.calls[0][0];
    expect(createCall.data.metadata.scopeFields).toBeNull();
  });

  it('passes session name and type in metadata', async () => {
    await useCase.execute(TEST_SESSION_ID, 'user-1');

    const createCall = prisma.asyncTask.create.mock.calls[0][0];
    expect(createCall.data.metadata.sessionName).toBe('Test Session');
    expect(createCall.data.metadata.sessionType).toBe('SOA_CLINICAL');
  });
});
