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

import { DuplicateQueryUseCase } from './duplicate-query.js';

const mockGenerateId = vi.mocked(generateId);

function makePrisma(overrides?: { queryResult?: unknown; sessionResult?: unknown }) {
  return {
    slsSession: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
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
              version: 3,
              isActive: true,
              parentQueryId: null,
              createdById: 'user-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
      ),
      create: vi.fn().mockResolvedValue({
        id: 'dup-query-uuid-1',
        sessionId: 'session-1',
        name: 'PubMed Search (copy)',
        queryString: '(spinal fusion) AND outcomes',
        version: 1,
        isActive: true,
        parentQueryId: 'query-1',
        createdById: 'user-2',
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

describe('DuplicateQueryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: DuplicateQueryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateId
      .mockReturnValueOnce('dup-query-uuid-1')
      .mockReturnValueOnce('dup-version-uuid-1');

    prisma = makePrisma();
    useCase = new DuplicateQueryUseCase(prisma);
  });

  it('duplicates a query with new ID and version 1', async () => {
    const result = await useCase.execute('query-1', 'user-2');

    expect(result.id).toBe('dup-query-uuid-1');
    expect(result.version).toBe(1);
    expect(result.parentQueryId).toBe('query-1');
    expect(result.name).toBe('PubMed Search (copy)');
    expect(prisma.slsQuery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'dup-query-uuid-1',
          sessionId: 'session-1',
          name: 'PubMed Search (copy)',
          queryString: '(spinal fusion) AND outcomes',
          version: 1,
          isActive: true,
          parentQueryId: 'query-1',
          createdById: 'user-2',
        }),
      }),
    );
  });

  it('creates an initial QueryVersion for the duplicate', async () => {
    await useCase.execute('query-1', 'user-2');

    expect(prisma.queryVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queryId: 'dup-query-uuid-1',
          version: 1,
          queryString: '(spinal fusion) AND outcomes',
          diff: expect.anything(),
          createdById: 'user-2',
        }),
      }),
    );
  });

  it('creates an audit log entry', async () => {
    await useCase.execute('query-1', 'user-2');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-2',
          action: 'sls.query.duplicated',
          targetType: 'slsQuery',
          targetId: 'dup-query-uuid-1',
          after: expect.objectContaining({
            parentQueryId: 'query-1',
            sessionId: 'session-1',
          }),
        }),
      }),
    );
  });

  it('throws NotFoundError when query does not exist', async () => {
    prisma = makePrisma({ queryResult: null });
    useCase = new DuplicateQueryUseCase(prisma);

    await expect(useCase.execute('query-1', 'user-2')).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({
      sessionResult: { id: 'session-1', projectId: 'project-1', status: 'LOCKED' },
    });
    useCase = new DuplicateQueryUseCase(prisma);

    await expect(useCase.execute('query-1', 'user-2')).rejects.toThrow('locked session');
  });

  it('throws NotFoundError when session does not exist', async () => {
    prisma = makePrisma({ sessionResult: null });
    useCase = new DuplicateQueryUseCase(prisma);

    await expect(useCase.execute('query-1', 'user-2')).rejects.toThrow('not found');
  });

  it('preserves query string from original', async () => {
    await useCase.execute('query-1', 'user-2');

    expect(prisma.slsQuery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queryString: '(spinal fusion) AND outcomes',
        }),
      }),
    );
  });
});
