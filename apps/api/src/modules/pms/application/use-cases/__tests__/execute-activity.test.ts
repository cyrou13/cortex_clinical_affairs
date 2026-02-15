import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ExecuteActivityUseCase } from '../execute-activity.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmcfActivity: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'activity-1',
        status: 'PLANNED',
        activityType: 'LITERATURE_UPDATE',
        pmsCycleId: 'cycle-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'activity-1',
        status: 'IN_PROGRESS',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('ExecuteActivityUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ExecuteActivityUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ExecuteActivityUseCase(prisma, mockEventBus as any);
  });

  it('starts a PLANNED activity and returns IN_PROGRESS status', async () => {
    const result = await useCase.execute('activity-1', 'user-1');

    expect(result.activityId).toBe('activity-1');
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.activityType).toBe('LITERATURE_UPDATE');
    expect(result.startedAt).toBeDefined();
    expect(prisma.pmcfActivity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'activity-1' },
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      }),
    );
  });

  it('publishes a pms.activity.started event', async () => {
    await useCase.execute('activity-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.activity.started',
        aggregateType: 'PmcfActivity',
        data: expect.objectContaining({
          activityId: 'activity-1',
          status: 'IN_PROGRESS',
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
    useCase = new ExecuteActivityUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow('not found');
  });

  it('throws ValidationError when activity is already IN_PROGRESS', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          status: 'IN_PROGRESS',
          activityType: 'LITERATURE_UPDATE',
          pmsCycleId: 'cycle-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ExecuteActivityUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('activity-1', 'user-1')).rejects.toThrow(
      'Cannot start activity',
    );
  });

  it('throws ValidationError when activity is COMPLETED', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          status: 'COMPLETED',
          activityType: 'LITERATURE_UPDATE',
          pmsCycleId: 'cycle-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ExecuteActivityUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('activity-1', 'user-1')).rejects.toThrow(
      'Cannot start activity',
    );
  });
});
