import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkSlsSessionsUseCase } from './link-sls-sessions.js';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  sessions?: Array<Record<string, unknown>>;
  existingLinks?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soa !== undefined
          ? overrides.soa
          : { id: 'soa-1', status: 'DRAFT', projectId: 'proj-1' },
      ),
    },
    slsSession: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sessions ?? [{ id: 'sess-1' }],
      ),
    },
    soaSlsLink: {
      findMany: vi.fn().mockResolvedValue(overrides?.existingLinks ?? []),
      create: vi.fn().mockResolvedValue({ id: 'link-1' }),
    },
  } as any;
}

describe('LinkSlsSessionsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links a session successfully', async () => {
    const prisma = makePrisma();
    const useCase = new LinkSlsSessionsUseCase(prisma);

    const result = await useCase.execute({
      soaAnalysisId: 'soa-1',
      slsSessionIds: ['sess-1'],
    });

    expect(result.linkedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it('skips already linked sessions', async () => {
    const prisma = makePrisma({
      existingLinks: [{ slsSessionId: 'sess-1' }],
    });
    const useCase = new LinkSlsSessionsUseCase(prisma);

    const result = await useCase.execute({
      soaAnalysisId: 'soa-1',
      slsSessionIds: ['sess-1'],
    });

    expect(result.linkedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('throws for missing SOA', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new LinkSlsSessionsUseCase(prisma);

    await expect(
      useCase.execute({ soaAnalysisId: 'missing', slsSessionIds: ['sess-1'] }),
    ).rejects.toThrow('not found');
  });

  it('throws for locked SOA', async () => {
    const prisma = makePrisma({
      soa: { id: 'soa-1', status: 'LOCKED', projectId: 'proj-1' },
    });
    const useCase = new LinkSlsSessionsUseCase(prisma);

    await expect(
      useCase.execute({ soaAnalysisId: 'soa-1', slsSessionIds: ['sess-1'] }),
    ).rejects.toThrow('locked SOA');
  });

  it('throws when session is not locked', async () => {
    const prisma = makePrisma({ sessions: [] });
    const useCase = new LinkSlsSessionsUseCase(prisma);

    await expect(
      useCase.execute({ soaAnalysisId: 'soa-1', slsSessionIds: ['sess-1'] }),
    ).rejects.toThrow('not locked');
  });

  it('throws for empty session list', async () => {
    const prisma = makePrisma();
    const useCase = new LinkSlsSessionsUseCase(prisma);

    await expect(
      useCase.execute({ soaAnalysisId: 'soa-1', slsSessionIds: [] }),
    ).rejects.toThrow('At least one');
  });

  it('links new sessions and skips existing', async () => {
    const prisma = makePrisma({
      sessions: [{ id: 'sess-1' }, { id: 'sess-2' }],
      existingLinks: [{ slsSessionId: 'sess-1' }],
    });
    const useCase = new LinkSlsSessionsUseCase(prisma);

    const result = await useCase.execute({
      soaAnalysisId: 'soa-1',
      slsSessionIds: ['sess-1', 'sess-2'],
    });

    expect(result.linkedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });
});
