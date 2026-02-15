import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSoaUseCase } from './create-soa.js';

function makePrisma(overrides?: {
  project?: Record<string, unknown> | null;
  sessions?: Array<Record<string, unknown>>;
}) {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.project !== undefined ? overrides.project : { id: 'proj-1' },
      ),
    },
    slsSession: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sessions ?? [{ id: 'sess-1', status: 'LOCKED' }],
      ),
    },
    soaAnalysis: {
      create: vi.fn().mockResolvedValue({ id: 'soa-1' }),
    },
    soaSlsLink: {
      create: vi.fn().mockResolvedValue({ id: 'link-1' }),
    },
    thematicSection: {
      create: vi.fn().mockResolvedValue({ id: 'sec-1' }),
    },
  } as any;
}

describe('CreateSoaUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates SOA with correct type and sections', async () => {
    const prisma = makePrisma();
    const useCase = new CreateSoaUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'Clinical SOA',
      type: 'CLINICAL',
      slsSessionIds: ['sess-1'],
      userId: 'user-1',
    });

    expect(result.type).toBe('CLINICAL');
    expect(result.sectionCount).toBe(6);
    expect(prisma.soaAnalysis.create).toHaveBeenCalled();
    expect(prisma.soaSlsLink.create).toHaveBeenCalledTimes(1);
    expect(prisma.thematicSection.create).toHaveBeenCalledTimes(6);
  });

  it('creates SIMILAR_DEVICE SOA with 5 sections', async () => {
    const prisma = makePrisma();
    const useCase = new CreateSoaUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'Device SOA',
      type: 'SIMILAR_DEVICE',
      slsSessionIds: ['sess-1'],
      userId: 'user-1',
    });

    expect(result.sectionCount).toBe(5);
  });

  it('throws for invalid SOA type', async () => {
    const prisma = makePrisma();
    const useCase = new CreateSoaUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'Bad SOA',
        type: 'INVALID',
        slsSessionIds: ['sess-1'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid SOA type');
  });

  it('throws for empty name', async () => {
    const prisma = makePrisma();
    const useCase = new CreateSoaUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: '  ',
        type: 'CLINICAL',
        slsSessionIds: ['sess-1'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('name is required');
  });

  it('throws when no SLS sessions provided', async () => {
    const prisma = makePrisma();
    const useCase = new CreateSoaUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'SOA',
        type: 'CLINICAL',
        slsSessionIds: [],
        userId: 'user-1',
      }),
    ).rejects.toThrow('At least one locked SLS session');
  });

  it('throws for missing project', async () => {
    const prisma = makePrisma({ project: null });
    const useCase = new CreateSoaUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'missing',
        name: 'SOA',
        type: 'CLINICAL',
        slsSessionIds: ['sess-1'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when SLS session is not locked', async () => {
    const prisma = makePrisma({
      sessions: [{ id: 'sess-1', status: 'ACTIVE' }],
    });
    const useCase = new CreateSoaUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'SOA',
        type: 'CLINICAL',
        slsSessionIds: ['sess-1'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('must be locked');
  });

  it('throws when SLS session not found', async () => {
    const prisma = makePrisma({ sessions: [] });
    const useCase = new CreateSoaUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'SOA',
        type: 'CLINICAL',
        slsSessionIds: ['missing'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('links multiple SLS sessions', async () => {
    const prisma = makePrisma({
      sessions: [
        { id: 'sess-1', status: 'LOCKED' },
        { id: 'sess-2', status: 'LOCKED' },
      ],
    });
    const useCase = new CreateSoaUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'SOA',
      type: 'CLINICAL',
      slsSessionIds: ['sess-1', 'sess-2'],
      userId: 'user-1',
    });

    expect(prisma.soaSlsLink.create).toHaveBeenCalledTimes(2);
    expect(result.soaAnalysisId).toBeTruthy();
  });
});
