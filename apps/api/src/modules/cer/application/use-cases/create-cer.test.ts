import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCerUseCase } from './create-cer.js';

function makePrisma(overrides?: {
  project?: Record<string, unknown> | null;
  slsSessions?: Array<Record<string, unknown>>;
  soaAnalyses?: Array<Record<string, unknown>>;
  validationStudies?: Array<Record<string, unknown>>;
}) {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.project !== undefined ? overrides.project : { id: 'proj-1' },
      ),
    },
    slsSession: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.slsSessions ?? [{ id: 'sls-1', lockedAt: new Date('2024-01-01') }],
      ),
    },
    soaAnalysis: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.soaAnalyses ?? [{ id: 'soa-1', lockedAt: new Date('2024-01-02') }],
      ),
    },
    validationStudy: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.validationStudies ?? [{ id: 'val-1', lockedAt: new Date('2024-01-03') }],
      ),
    },
    cerVersion: {
      create: vi.fn().mockResolvedValue({ id: 'cer-1' }),
    },
    cerUpstreamLink: {
      create: vi.fn().mockResolvedValue({ id: 'link-1' }),
    },
  } as any;
}

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CreateCerUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates CER with correct version number for INITIAL', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: 'proj-1',
      regulatoryContext: 'CE_MDR',
      versionType: 'INITIAL',
      userId: 'user-1',
    });

    expect(result.versionNumber).toBe('1.0.0');
    expect(result.regulatoryContext).toBe('CE_MDR');
    expect(result.cerVersionId).toBeTruthy();
    expect(prisma.cerVersion.create).toHaveBeenCalled();
  });

  it('creates upstream links for all locked modules', async () => {
    const prisma = makePrisma({
      slsSessions: [
        { id: 'sls-1', lockedAt: new Date('2024-01-01') },
        { id: 'sls-2', lockedAt: new Date('2024-01-02') },
      ],
    });
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: 'proj-1',
      regulatoryContext: 'CE_MDR',
      versionType: 'INITIAL',
      userId: 'user-1',
    });

    // 2 SLS + 1 SOA + 1 Validation = 4 links
    expect(result.upstreamLinksCount).toBe(4);
    expect(prisma.cerUpstreamLink.create).toHaveBeenCalledTimes(4);
  });

  it('emits cer.version.created event', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await useCase.execute({
      projectId: 'proj-1',
      regulatoryContext: 'CE_MDR',
      versionType: 'INITIAL',
      userId: 'user-1',
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'cer.version.created' }),
    );
  });

  it('throws for invalid regulatory context', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        regulatoryContext: 'INVALID',
        versionType: 'INITIAL',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid regulatory context');
  });

  it('throws for invalid version type', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        regulatoryContext: 'CE_MDR',
        versionType: 'INVALID',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid version type');
  });

  it('throws when project not found', async () => {
    const prisma = makePrisma({ project: null });
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'missing',
        regulatoryContext: 'CE_MDR',
        versionType: 'INITIAL',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when no locked SLS sessions', async () => {
    const prisma = makePrisma({ slsSessions: [] });
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        regulatoryContext: 'CE_MDR',
        versionType: 'INITIAL',
        userId: 'user-1',
      }),
    ).rejects.toThrow('SLS');
  });

  it('throws when no locked SOA analyses', async () => {
    const prisma = makePrisma({ soaAnalyses: [] });
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        regulatoryContext: 'CE_MDR',
        versionType: 'INITIAL',
        userId: 'user-1',
      }),
    ).rejects.toThrow('SOA');
  });

  it('throws when no locked validation studies', async () => {
    const prisma = makePrisma({ validationStudies: [] });
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        regulatoryContext: 'CE_MDR',
        versionType: 'INITIAL',
        userId: 'user-1',
      }),
    ).rejects.toThrow('VALIDATION');
  });

  it('computes ANNUAL_UPDATE version correctly', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new CreateCerUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: 'proj-1',
      regulatoryContext: 'CE_MDR',
      versionType: 'ANNUAL_UPDATE',
      currentVersion: '1.0.0',
      userId: 'user-1',
    });

    expect(result.versionNumber).toBe('2.0.0');
  });
});
