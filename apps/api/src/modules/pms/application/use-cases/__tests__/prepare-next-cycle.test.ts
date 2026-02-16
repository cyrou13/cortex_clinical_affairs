import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrepareNextCycleUseCase } from '../prepare-next-cycle.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        updateFrequency: 'ANNUAL',
        cycles: [
          {
            name: 'PMS Cycle 1 - 2025',
            endDate: new Date('2025-12-31'),
          },
        ],
      }),
    },
    gapRegistryEntry: {
      findMany: vi.fn().mockResolvedValue([
        {
          recommendedActivity: 'LITERATURE_UPDATE',
          severity: 'HIGH',
          description: 'Gap 1',
        },
        {
          recommendedActivity: 'LITERATURE_UPDATE',
          severity: 'MEDIUM',
          description: 'Gap 2',
        },
        {
          recommendedActivity: 'COMPLAINTS',
          severity: 'HIGH',
          description: 'Gap 3',
        },
      ]),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('PrepareNextCycleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: PrepareNextCycleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new PrepareNextCycleUseCase(prisma);
  });

  it('generates next cycle suggestion with date range', async () => {
    const result = await useCase.execute('plan-1');

    expect(result.pmsPlanId).toBe('plan-1');
    expect(result.suggestedName).toContain('PMS Cycle');
    expect(result.suggestedStartDate).toBe('2026-01-01'); // Day after last cycle end
    expect(result.openGapsCount).toBe(3);
  });

  it('calculates suggested end date based on update frequency', async () => {
    const result = await useCase.execute('plan-1');

    const startDate = new Date(result.suggestedStartDate);
    const endDate = new Date(result.suggestedEndDate);
    const monthDiff =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() -
      startDate.getMonth();

    expect(monthDiff).toBe(12); // Annual = 12 months
  });

  it('aggregates recommended activities by type', async () => {
    const result = await useCase.execute('plan-1');

    expect(result.recommendedActivities).toHaveLength(2);
    const litUpdate = result.recommendedActivities.find(
      (a) => a.activityType === 'LITERATURE_UPDATE',
    );
    expect(litUpdate?.gapCount).toBe(2);

    const complaints = result.recommendedActivities.find((a) => a.activityType === 'COMPLAINTS');
    expect(complaints?.gapCount).toBe(1);
  });

  it('sorts activities by gap count descending', async () => {
    const result = await useCase.execute('plan-1');

    expect(result.recommendedActivities[0]?.gapCount).toBeGreaterThanOrEqual(
      result.recommendedActivities[1]?.gapCount || 0,
    );
  });

  it('handles semi-annual frequency', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          updateFrequency: 'SEMI_ANNUAL',
          cycles: [
            {
              name: 'PMS Cycle 1 - 2025',
              endDate: new Date('2025-06-30'),
            },
          ],
        }),
      },
    });
    useCase = new PrepareNextCycleUseCase(prisma);

    const result = await useCase.execute('plan-1');

    const startDate = new Date(result.suggestedStartDate);
    const endDate = new Date(result.suggestedEndDate);
    const monthDiff =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() -
      startDate.getMonth();

    expect(monthDiff).toBe(6);
  });

  it('handles quarterly frequency', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          updateFrequency: 'QUARTERLY',
          cycles: [
            {
              name: 'PMS Cycle 1 - Q1 2026',
              endDate: new Date('2026-03-31'),
            },
          ],
        }),
      },
    });
    useCase = new PrepareNextCycleUseCase(prisma);

    const result = await useCase.execute('plan-1');

    const startDate = new Date(result.suggestedStartDate);
    const endDate = new Date(result.suggestedEndDate);
    const monthDiff =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() -
      startDate.getMonth();

    expect(monthDiff).toBe(3);
  });

  it('handles plan with no previous cycles', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          updateFrequency: 'ANNUAL',
          cycles: [],
        }),
      },
    });
    useCase = new PrepareNextCycleUseCase(prisma);

    const result = await useCase.execute('plan-1');

    expect(result.suggestedName).toContain('PMS Cycle 1');
    expect(result.suggestedStartDate).toBeDefined();
  });

  it('handles plan with no open gaps', async () => {
    prisma = makePrisma({
      gapRegistryEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    });
    useCase = new PrepareNextCycleUseCase(prisma);

    const result = await useCase.execute('plan-1');

    expect(result.openGapsCount).toBe(0);
    expect(result.recommendedActivities).toEqual([]);
  });

  it('throws NotFoundError when plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    useCase = new PrepareNextCycleUseCase(prisma);

    await expect(useCase.execute('missing-id')).rejects.toThrow('not found');
  });
});
