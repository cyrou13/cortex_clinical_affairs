import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkUpstreamUseCase } from './link-upstream.js';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  slsSession?: Record<string, unknown> | null;
  soaAnalysis?: Record<string, unknown> | null;
  validationStudy?: Record<string, unknown> | null;
  existingLink?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: 'cer-1', status: 'DRAFT' },
      ),
    },
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.slsSession !== undefined
          ? overrides.slsSession
          : { id: 'sls-1', status: 'LOCKED', lockedAt: new Date('2024-01-01') },
      ),
    },
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soaAnalysis !== undefined
          ? overrides.soaAnalysis
          : { id: 'soa-1', status: 'LOCKED', lockedAt: new Date('2024-01-01') },
      ),
    },
    validationStudy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.validationStudy !== undefined
          ? overrides.validationStudy
          : { id: 'val-1', status: 'LOCKED', lockedAt: new Date('2024-01-01') },
      ),
    },
    cerUpstreamLink: {
      findFirst: vi.fn().mockResolvedValue(overrides?.existingLink ?? null),
      create: vi.fn().mockResolvedValue({ id: 'link-1' }),
    },
  } as any;
}

describe('LinkUpstreamUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links a locked SLS session to CER', async () => {
    const prisma = makePrisma();
    const useCase = new LinkUpstreamUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: 'cer-1',
      moduleType: 'SLS',
      moduleId: 'sls-1',
      userId: 'user-1',
    });

    expect(result.moduleType).toBe('SLS');
    expect(result.moduleId).toBe('sls-1');
    expect(result.linkId).toBeTruthy();
    expect(prisma.cerUpstreamLink.create).toHaveBeenCalled();
  });

  it('throws for invalid module type', async () => {
    const prisma = makePrisma();
    const useCase = new LinkUpstreamUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        moduleType: 'INVALID',
        moduleId: 'mod-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid upstream module type');
  });

  it('throws when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new LinkUpstreamUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'missing',
        moduleType: 'SLS',
        moduleId: 'sls-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when CER version is locked', async () => {
    const prisma = makePrisma({ cerVersion: { id: 'cer-1', status: 'LOCKED' } });
    const useCase = new LinkUpstreamUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        moduleType: 'SLS',
        moduleId: 'sls-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked CER version');
  });

  it('throws when upstream module is not locked', async () => {
    const prisma = makePrisma({
      slsSession: { id: 'sls-1', status: 'ACTIVE', lockedAt: null },
    });
    const useCase = new LinkUpstreamUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        moduleType: 'SLS',
        moduleId: 'sls-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('must be locked');
  });

  it('throws when duplicate link exists', async () => {
    const prisma = makePrisma({
      existingLink: { id: 'existing-link' },
    });
    const useCase = new LinkUpstreamUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        moduleType: 'SLS',
        moduleId: 'sls-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('already linked');
  });

  it('links SOA module', async () => {
    const prisma = makePrisma();
    const useCase = new LinkUpstreamUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: 'cer-1',
      moduleType: 'SOA',
      moduleId: 'soa-1',
      userId: 'user-1',
    });

    expect(result.moduleType).toBe('SOA');
  });
});
