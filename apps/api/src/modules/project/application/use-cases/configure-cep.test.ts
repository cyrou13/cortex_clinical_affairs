import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureCepUseCase } from './configure-cep.js';

function makePrisma() {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    },
    cep: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cep-1',
        projectId: 'proj-1',
        scope: null,
        objectives: null,
        deviceClassification: null,
        clinicalBackground: null,
        searchStrategy: null,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'cep-1',
        projectId: 'proj-1',
        scope: 'Evaluate safety and performance',
        objectives: 'Demonstrate equivalence',
        deviceClassification: 'SaMD Class IIa',
        clinicalBackground: null,
        searchStrategy: null,
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ConfigureCepUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ConfigureCepUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ConfigureCepUseCase(prisma);
  });

  it('updates CEP fields for a project', async () => {
    const result = await useCase.execute(
      'proj-1',
      {
        scope: 'Evaluate safety and performance',
        objectives: 'Demonstrate equivalence',
        deviceClassification: 'SaMD Class IIa',
      },
      'user-1',
    );

    expect(result.scope).toBe('Evaluate safety and performance');
    expect(prisma.cep.update).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      data: expect.objectContaining({
        scope: 'Evaluate safety and performance',
        objectives: 'Demonstrate equivalence',
        deviceClassification: 'SaMD Class IIa',
      }),
    });
  });

  it('throws NotFoundError when CEP does not exist', async () => {
    prisma.cep.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute('proj-1', { scope: 'test' }, 'user-1'),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when project is not ACTIVE', async () => {
    prisma.project.findUnique.mockResolvedValue({ status: 'COMPLETED' });

    await expect(
      useCase.execute('proj-1', { scope: 'test' }, 'user-1'),
    ).rejects.toThrow('Cannot modify CEP');
  });

  it('allows partial updates', async () => {
    await useCase.execute('proj-1', { scope: 'Updated scope' }, 'user-1');

    expect(prisma.cep.update).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      data: { scope: 'Updated scope' },
    });
  });

  it('creates audit log entry', async () => {
    await useCase.execute('proj-1', { scope: 'New scope' }, 'user-1');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'cep.configured',
          targetType: 'cep',
        }),
      }),
    );
  });
});
