import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CompleteActivityUseCase } from '../complete-activity.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmcfActivity: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'activity-1',
        status: 'IN_PROGRESS',
        activityType: 'COMPLAINTS',
        pmsCycleId: 'cycle-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'activity-1',
        status: 'COMPLETED',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('CompleteActivityUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CompleteActivityUseCase;

  const validInput = {
    activityId: 'activity-1',
    findingsSummary: 'No significant findings',
    conclusions: 'Device performance remains acceptable',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CompleteActivityUseCase(prisma, mockEventBus as any);
  });

  it('completes an IN_PROGRESS activity with findings and conclusions', async () => {
    const result = await useCase.execute(validInput);

    expect(result.activityId).toBe('activity-1');
    expect(result.status).toBe('COMPLETED');
    expect(result.activityType).toBe('COMPLAINTS');
    expect(result.completedAt).toBeDefined();
    expect(prisma.pmcfActivity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          findingsSummary: 'No significant findings',
          conclusions: 'Device performance remains acceptable',
        }),
      }),
    );
  });

  it('publishes a pms.activity.completed event', async () => {
    await useCase.execute(validInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.activity.completed',
        aggregateType: 'PmcfActivity',
        data: expect.objectContaining({
          activityId: 'activity-1',
          status: 'COMPLETED',
        }),
      }),
    );
  });

  it('throws NotFoundError when activity does not exist', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new CompleteActivityUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('throws ValidationError when activity is PLANNED (not IN_PROGRESS)', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          status: 'PLANNED',
          activityType: 'COMPLAINTS',
          pmsCycleId: 'cycle-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new CompleteActivityUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Cannot complete activity',
    );
  });

  it('throws ValidationError when findings summary is empty', async () => {
    await expect(
      useCase.execute({ ...validInput, findingsSummary: '   ' }),
    ).rejects.toThrow('Findings summary is required');
  });

  it('throws ValidationError when conclusions are empty', async () => {
    await expect(
      useCase.execute({ ...validInput, conclusions: '   ' }),
    ).rejects.toThrow('Conclusions are required');
  });
});
