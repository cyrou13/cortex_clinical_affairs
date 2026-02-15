import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@cortex/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cortex/shared')>();
  return {
    ...actual,
    generateId: vi.fn().mockReturnValue('session-uuid-1'),
  };
});

import { CreateSlsSessionUseCase } from './create-session.js';

function makePrisma(overrides?: {
  projectResult?: unknown;
}) {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.projectResult !== undefined
          ? overrides.projectResult
          : {
              id: 'project-1',
              name: 'Test Project',
              cep: { id: 'cep-1', projectId: 'project-1' },
            },
      ),
    },
    slsSession: {
      create: vi.fn().mockResolvedValue({
        id: 'session-uuid-1',
        projectId: 'project-1',
        cepId: 'cep-1',
        name: 'Clinical Literature Review',
        type: 'SOA_CLINICAL',
        status: 'DRAFT',
        scopeFields: null,
        createdById: 'user-1',
        lockedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        articles: [],
        queries: [],
        exclusionCodes: [],
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('CreateSlsSessionUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CreateSlsSessionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CreateSlsSessionUseCase(prisma);
  });

  it('creates an SLS session successfully', async () => {
    const result = await useCase.execute(
      {
        name: 'Clinical Literature Review',
        type: 'SOA_CLINICAL',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      },
      'user-1',
    );

    expect(result.id).toBe('session-uuid-1');
    expect(result.status).toBe('DRAFT');
    expect(prisma.slsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'session-uuid-1',
          name: 'Clinical Literature Review',
          type: 'SOA_CLINICAL',
          status: 'DRAFT',
          cepId: 'cep-1',
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('creates an audit log entry', async () => {
    await useCase.execute(
      {
        name: 'Clinical Literature Review',
        type: 'SOA_CLINICAL',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      },
      'user-1',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'sls.session.created',
          targetType: 'slsSession',
          targetId: 'session-uuid-1',
        }),
      }),
    );
  });

  it('throws NotFoundError when project does not exist', async () => {
    prisma = makePrisma({ projectResult: null });
    useCase = new CreateSlsSessionUseCase(prisma);

    await expect(
      useCase.execute(
        {
          name: 'Clinical Literature Review',
          type: 'SOA_CLINICAL',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when project has no CEP', async () => {
    prisma = makePrisma({
      projectResult: { id: 'project-1', name: 'Test Project', cep: null },
    });
    useCase = new CreateSlsSessionUseCase(prisma);

    await expect(
      useCase.execute(
        {
          name: 'Clinical Literature Review',
          type: 'SOA_CLINICAL',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow('configured CEP');
  });

  it('throws ValidationError for invalid session type', async () => {
    await expect(
      useCase.execute(
        {
          name: 'Clinical Literature Review',
          type: 'INVALID_TYPE',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow();
  });

  it('throws ValidationError for name too short', async () => {
    await expect(
      useCase.execute(
        {
          name: 'AB',
          type: 'SOA_CLINICAL',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        },
        'user-1',
      ),
    ).rejects.toThrow('at least 3 characters');
  });

  it('throws ValidationError for missing required fields', async () => {
    await expect(
      useCase.execute({ name: 'Valid Session Name' }, 'user-1'),
    ).rejects.toThrow();
  });

  it('passes scope fields to created session', async () => {
    const scopeFields = { indication: 'Spinal fusion', population: 'Adults' };

    await useCase.execute(
      {
        name: 'Clinical Literature Review',
        type: 'SOA_CLINICAL',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        scopeFields,
      },
      'user-1',
    );

    expect(prisma.slsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeFields,
        }),
      }),
    );
  });
});
