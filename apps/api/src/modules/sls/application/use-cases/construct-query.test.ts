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

import { ConstructQueryUseCase } from './construct-query.js';

const mockGenerateId = vi.mocked(generateId);

function makePrisma(overrides?: { sessionResult?: unknown }) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : {
              id: 'session-1',
              projectId: 'project-1',
              status: 'DRAFT',
            },
      ),
    },
    slsQuery: {
      create: vi.fn().mockResolvedValue({
        id: 'query-uuid-1',
        sessionId: 'session-1',
        name: 'PubMed Search',
        queryString: '(spinal fusion) AND outcomes',
        version: 1,
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

describe('ConstructQueryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ConstructQueryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateId.mockReturnValueOnce('query-uuid-1').mockReturnValueOnce('version-uuid-1');

    prisma = makePrisma();
    useCase = new ConstructQueryUseCase(prisma);
  });

  const validInput = {
    name: 'PubMed Search',
    queryString: '(spinal fusion) AND outcomes',
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('creates a query successfully', async () => {
    const result = await useCase.execute(validInput, 'user-1');

    expect(result.id).toBe('query-uuid-1');
    expect(result.version).toBe(1);
    expect(prisma.slsQuery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'query-uuid-1',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'PubMed Search',
          queryString: '(spinal fusion) AND outcomes',
          version: 1,
          isActive: true,
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('creates an initial QueryVersion', async () => {
    await useCase.execute(validInput, 'user-1');

    expect(prisma.queryVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queryId: 'query-uuid-1',
          version: 1,
          queryString: '(spinal fusion) AND outcomes',
          diff: expect.anything(),
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('creates an audit log entry', async () => {
    await useCase.execute(validInput, 'user-1');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'sls.query.created',
          targetType: 'slsQuery',
          targetId: 'query-uuid-1',
        }),
      }),
    );
  });

  it('throws NotFoundError when session does not exist', async () => {
    prisma = makePrisma({ sessionResult: null });
    useCase = new ConstructQueryUseCase(prisma);

    await expect(useCase.execute(validInput, 'user-1')).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({
      sessionResult: { id: 'session-1', projectId: 'project-1', status: 'LOCKED' },
    });
    useCase = new ConstructQueryUseCase(prisma);

    await expect(useCase.execute(validInput, 'user-1')).rejects.toThrow('locked session');
  });

  it('throws ValidationError for invalid query syntax', async () => {
    await expect(
      useCase.execute({ ...validInput, queryString: 'AND AND' }, 'user-1'),
    ).rejects.toThrow('Invalid query syntax');
  });

  it('throws ValidationError for empty name', async () => {
    await expect(useCase.execute({ ...validInput, name: '' }, 'user-1')).rejects.toThrow();
  });

  it('throws ValidationError for empty queryString', async () => {
    await expect(useCase.execute({ ...validInput, queryString: '' }, 'user-1')).rejects.toThrow();
  });

  it('throws ValidationError for missing sessionId', async () => {
    const { sessionId: _sessionId, ...rest } = validInput;
    await expect(useCase.execute(rest, 'user-1')).rejects.toThrow();
  });

  it('allows query creation in SCREENING session', async () => {
    prisma = makePrisma({
      sessionResult: { id: 'session-1', projectId: 'project-1', status: 'SCREENING' },
    });
    useCase = new ConstructQueryUseCase(prisma);

    const result = await useCase.execute(validInput, 'user-1');
    expect(result.id).toBe('query-uuid-1');
  });
});
