import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@cortex/shared';
import type * as CortexShared from '@cortex/shared';

vi.mock('@cortex/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof CortexShared>();
  return {
    ...actual,
    generateId: vi.fn(),
  };
});

import { ExecuteQueryUseCase } from './execute-query.js';

const generateIdMock = vi.mocked(generateId);

const TEST_SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';
const _TEST_QUERY_ID = '550e8400-e29b-41d4-a716-446655440000';

function makePrisma(overrides?: { queryResult?: unknown; sessionResult?: unknown }) {
  return {
    slsQuery: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.queryResult !== undefined
          ? overrides.queryResult
          : {
              id: 'query-1',
              sessionId: TEST_SESSION_ID,
              queryString: '(spinal fusion) AND (outcomes)',
              session:
                overrides?.sessionResult !== undefined
                  ? overrides.sessionResult
                  : {
                      id: TEST_SESSION_ID,
                      status: 'DRAFT',
                      projectId: 'project-1',
                    },
            },
      ),
    },
    queryExecution: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: data.id,
          queryId: data.queryId,
          database: data.database,
          status: data.status,
          articlesFound: 0,
          articlesImported: 0,
          executedAt: new Date(),
        }),
      ),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({
        id: 'task-1',
        type: 'sls.execute-query',
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

describe('ExecuteQueryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let useCase: ExecuteQueryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    generateIdMock
      .mockReturnValueOnce('exec-id-1')
      .mockReturnValueOnce('exec-id-2')
      .mockReturnValueOnce('exec-id-3');

    prisma = makePrisma();
    redis = makeRedis();
    useCase = new ExecuteQueryUseCase(prisma, redis);
  });

  it('creates QueryExecution records and enqueues task', async () => {
    const result = await useCase.execute(
      {
        queryId: '550e8400-e29b-41d4-a716-446655440000',
        databases: ['PUBMED', 'PMC'],
        sessionId: '660e8400-e29b-41d4-a716-446655440000',
      },
      'user-1',
    );

    expect(result.taskId).toBe('task-1');
    expect(result.executionIds).toEqual(['exec-id-1', 'exec-id-2']);

    // Should create 2 QueryExecution records
    expect(prisma.queryExecution.create).toHaveBeenCalledTimes(2);
    expect(prisma.queryExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'exec-id-1',
          database: 'PUBMED',
          status: 'RUNNING',
        }),
      }),
    );
    expect(prisma.queryExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'exec-id-2',
          database: 'PMC',
          status: 'RUNNING',
        }),
      }),
    );

    // Should enqueue task
    expect(prisma.asyncTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'sls.execute-query',
          status: 'PENDING',
        }),
      }),
    );
  });

  it('returns reproducibility statements', async () => {
    const result = await useCase.execute(
      {
        queryId: '550e8400-e29b-41d4-a716-446655440000',
        databases: ['PUBMED'],
        sessionId: '660e8400-e29b-41d4-a716-446655440000',
      },
      'user-1',
    );

    expect(result.reproducibilityStatements).toHaveLength(1);
    expect(result.reproducibilityStatements[0]).toContain('PUBMED');
    expect(result.reproducibilityStatements[0]).toContain('(spinal fusion) AND (outcomes)');
  });

  it('throws NotFoundError when query does not exist', async () => {
    prisma = makePrisma({ queryResult: null });
    useCase = new ExecuteQueryUseCase(prisma, redis);

    await expect(
      useCase.execute(
        {
          queryId: '550e8400-e29b-41d4-a716-446655440000',
          databases: ['PUBMED'],
          sessionId: '660e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({
      queryResult: {
        id: 'query-1',
        sessionId: '660e8400-e29b-41d4-a716-446655440000',
        queryString: 'test',
        session: {
          id: '660e8400-e29b-41d4-a716-446655440000',
          status: 'LOCKED',
          projectId: 'project-1',
        },
      },
    });
    useCase = new ExecuteQueryUseCase(prisma, redis);

    await expect(
      useCase.execute(
        {
          queryId: '550e8400-e29b-41d4-a716-446655440000',
          databases: ['PUBMED'],
          sessionId: '660e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow('session is locked');
  });

  it('throws ValidationError when query does not belong to session', async () => {
    prisma = makePrisma({
      queryResult: {
        id: 'query-1',
        sessionId: 'different-session-id',
        queryString: 'test',
        session: {
          id: 'different-session-id',
          status: 'DRAFT',
          projectId: 'project-1',
        },
      },
    });
    useCase = new ExecuteQueryUseCase(prisma, redis);

    await expect(
      useCase.execute(
        {
          queryId: '550e8400-e29b-41d4-a716-446655440000',
          databases: ['PUBMED'],
          sessionId: '660e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow('does not belong');
  });

  it('throws ValidationError for invalid input', async () => {
    await expect(
      useCase.execute(
        {
          queryId: 'not-a-uuid',
          databases: ['PUBMED'],
          sessionId: '660e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow();
  });

  it('throws ValidationError for empty databases array', async () => {
    await expect(
      useCase.execute(
        {
          queryId: '550e8400-e29b-41d4-a716-446655440000',
          databases: [],
          sessionId: '660e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow();
  });

  it('throws ValidationError for invalid database source', async () => {
    await expect(
      useCase.execute(
        {
          queryId: '550e8400-e29b-41d4-a716-446655440000',
          databases: ['SCOPUS'],
          sessionId: '660e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow();
  });
});
