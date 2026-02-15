import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PopulateGapRegistryUseCase } from '../populate-gap-registry.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        cerVersionId: 'cer-v1',
      }),
    },
    gapRegistryEntry: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(2),
    },
    soaOpenQuestion: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'q-1', description: 'Open question about biocompatibility' },
        { id: 'q-2', description: 'Open question about fatigue testing' },
      ]),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('PopulateGapRegistryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: PopulateGapRegistryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new PopulateGapRegistryUseCase(prisma);
  });

  it('populates gap registry from SOA open questions', async () => {
    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.pmsPlanId).toBe('plan-1');
    expect(result.populated).toBe(2);
    expect(result.duplicates).toBe(0);
    expect(result.totalGaps).toBe(2);
  });

  it('creates gap entries with correct data for each open question', async () => {
    await useCase.execute('plan-1', 'user-1');

    expect((prisma as any).gapRegistryEntry.create).toHaveBeenCalledTimes(2);

    expect((prisma as any).gapRegistryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          sourceModule: 'SOA',
          sourceId: 'q-1',
          description: 'Open question about biocompatibility',
          severity: 'MEDIUM',
          recommendedActivity: 'LITERATURE_UPDATE',
          status: 'OPEN',
          manuallyCreated: false,
        }),
      }),
    );

    expect((prisma as any).gapRegistryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          sourceModule: 'SOA',
          sourceId: 'q-2',
          description: 'Open question about fatigue testing',
        }),
      }),
    );
  });

  it('skips duplicate entries and counts them', async () => {
    prisma = makePrisma({
      gapRegistryEntry: {
        findMany: vi.fn().mockResolvedValue([
          { sourceModule: 'SOA', sourceId: 'q-1' },
        ]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(2),
      },
    });
    useCase = new PopulateGapRegistryUseCase(prisma);

    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.populated).toBe(1);
    expect(result.duplicates).toBe(1);
    expect((prisma as any).gapRegistryEntry.create).toHaveBeenCalledTimes(1);
  });

  it('handles case where all entries are duplicates', async () => {
    prisma = makePrisma({
      gapRegistryEntry: {
        findMany: vi.fn().mockResolvedValue([
          { sourceModule: 'SOA', sourceId: 'q-1' },
          { sourceModule: 'SOA', sourceId: 'q-2' },
        ]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(2),
      },
    });
    useCase = new PopulateGapRegistryUseCase(prisma);

    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.populated).toBe(0);
    expect(result.duplicates).toBe(2);
    expect((prisma as any).gapRegistryEntry.create).not.toHaveBeenCalled();
  });

  it('handles case where no SOA open questions exist', async () => {
    prisma = makePrisma({
      soaOpenQuestion: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      gapRegistryEntry: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
      },
    });
    useCase = new PopulateGapRegistryUseCase(prisma);

    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.populated).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.totalGaps).toBe(0);
  });

  it('uses default description when question has no description', async () => {
    prisma = makePrisma({
      soaOpenQuestion: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'q-1', description: null },
        ]),
      },
      gapRegistryEntry: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    useCase = new PopulateGapRegistryUseCase(prisma);

    await useCase.execute('plan-1', 'user-1');

    expect((prisma as any).gapRegistryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: 'SOA open question',
        }),
      }),
    );
  });

  it('returns totalGaps from count query', async () => {
    prisma = makePrisma({
      gapRegistryEntry: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(15),
      },
    });
    useCase = new PopulateGapRegistryUseCase(prisma);

    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.totalGaps).toBe(15);
    expect((prisma as any).gapRegistryEntry.count).toHaveBeenCalledWith({
      where: { pmsPlanId: 'plan-1' },
    });
  });

  it('throws NotFoundError when plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new PopulateGapRegistryUseCase(prisma);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'not found',
    );
  });

  it('queries open questions using the plan cerVersionId', async () => {
    await useCase.execute('plan-1', 'user-1');

    expect((prisma as any).soaOpenQuestion.findMany).toHaveBeenCalledWith({
      where: { cerVersionId: 'cer-v1' },
    });
  });
});
