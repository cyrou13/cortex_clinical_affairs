import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@cortex/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cortex/shared')>();
  return {
    ...actual,
    generateId: vi.fn().mockReturnValue('version-uuid-1'),
  };
});

import { UpdateQueryUseCase } from './update-query.js';

function makePrisma(overrides?: {
  queryResult?: unknown;
  sessionResult?: unknown;
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : { id: 'session-1', projectId: 'project-1', status: 'DRAFT' },
      ),
    },
    slsQuery: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.queryResult !== undefined
          ? overrides.queryResult
          : {
              id: 'query-1',
              sessionId: 'session-1',
              name: 'PubMed Search',
              queryString: '(spinal fusion) AND outcomes',
              version: 1,
              isActive: true,
              parentQueryId: null,
              createdById: 'user-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
      ),
      update: vi.fn().mockResolvedValue({
        id: 'query-1',
        sessionId: 'session-1',
        name: 'PubMed Search',
        queryString: '(lumbar fusion) AND outcomes',
        version: 2,
        isActive: true,
        parentQueryId: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    queryVersion: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('UpdateQueryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: UpdateQueryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new UpdateQueryUseCase(prisma);
  });

  it('updates a query and increments version', async () => {
    const result = await useCase.execute(
      'query-1',
      { queryString: '(lumbar fusion) AND outcomes' },
      'user-1',
    );

    expect(result.version).toBe(2);
    expect(result.queryString).toBe('(lumbar fusion) AND outcomes');
    expect(prisma.slsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'query-1' },
        data: expect.objectContaining({
          queryString: '(lumbar fusion) AND outcomes',
          version: 2,
        }),
      }),
    );
  });

  it('creates a QueryVersion record with diff', async () => {
    await useCase.execute(
      'query-1',
      { queryString: '(lumbar fusion) AND outcomes' },
      'user-1',
    );

    expect(prisma.queryVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queryId: 'query-1',
          version: 2,
          queryString: '(lumbar fusion) AND outcomes',
          diff: {
            before: '(spinal fusion) AND outcomes',
            after: '(lumbar fusion) AND outcomes',
          },
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('creates an audit log entry', async () => {
    await useCase.execute(
      'query-1',
      { queryString: '(lumbar fusion) AND outcomes' },
      'user-1',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'sls.query.updated',
          targetType: 'slsQuery',
          targetId: 'query-1',
          before: expect.objectContaining({
            queryString: '(spinal fusion) AND outcomes',
            version: 1,
          }),
          after: expect.objectContaining({
            queryString: '(lumbar fusion) AND outcomes',
            version: 2,
          }),
        }),
      }),
    );
  });

  it('throws NotFoundError when query does not exist', async () => {
    prisma = makePrisma({ queryResult: null });
    useCase = new UpdateQueryUseCase(prisma);

    await expect(
      useCase.execute('query-1', { queryString: 'test query' }, 'user-1'),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({
      sessionResult: { id: 'session-1', projectId: 'project-1', status: 'LOCKED' },
    });
    useCase = new UpdateQueryUseCase(prisma);

    await expect(
      useCase.execute('query-1', { queryString: 'test query' }, 'user-1'),
    ).rejects.toThrow('locked session');
  });

  it('throws ValidationError for invalid query syntax', async () => {
    await expect(
      useCase.execute('query-1', { queryString: 'AND AND' }, 'user-1'),
    ).rejects.toThrow('Invalid query syntax');
  });

  it('throws ValidationError for empty queryString', async () => {
    await expect(
      useCase.execute('query-1', { queryString: '' }, 'user-1'),
    ).rejects.toThrow();
  });

  it('throws ValidationError for missing queryString', async () => {
    await expect(
      useCase.execute('query-1', {}, 'user-1'),
    ).rejects.toThrow();
  });

  it('handles version increment from version 3 to 4', async () => {
    prisma = makePrisma({
      queryResult: {
        id: 'query-1',
        sessionId: 'session-1',
        name: 'PubMed Search',
        queryString: 'old query',
        version: 3,
        isActive: true,
        parentQueryId: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    prisma.slsQuery.update.mockResolvedValue({
      id: 'query-1',
      version: 4,
      queryString: 'new query',
    });
    useCase = new UpdateQueryUseCase(prisma);

    await useCase.execute('query-1', { queryString: 'new query' }, 'user-1');

    expect(prisma.slsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 4 }),
      }),
    );

    expect(prisma.queryVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 4 }),
      }),
    );
  });
});
