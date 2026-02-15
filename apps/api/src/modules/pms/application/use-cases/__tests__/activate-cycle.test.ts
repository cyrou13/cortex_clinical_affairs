import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ActivateCycleUseCase } from '../activate-cycle.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        status: 'PLANNED',
        pmsPlanId: 'plan-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        status: 'ACTIVE',
      }),
    },
    pmcfActivity: {
      count: vi.fn().mockResolvedValue(3),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('ActivateCycleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ActivateCycleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ActivateCycleUseCase(prisma, mockEventBus as any);
  });

  it('activates a PLANNED cycle and returns ACTIVE status', async () => {
    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.status).toBe('ACTIVE');
    expect(result.activatedAt).toBeDefined();
    expect((prisma as any).pmsCycle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cycle-1' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('publishes a pms.cycle.activated event', async () => {
    await useCase.execute('cycle-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.cycle.activated',
        aggregateType: 'PmsCycle',
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new ActivateCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow('not found');
  });

  it('throws ValidationError when cycle is already ACTIVE', async () => {
    prisma = makePrisma({
      pmsCycle: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cycle-1',
          status: 'ACTIVE',
          pmsPlanId: 'plan-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ActivateCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      'Cannot activate cycle',
    );
  });

  it('throws ValidationError when cycle has no activities', async () => {
    prisma = makePrisma({
      pmcfActivity: { count: vi.fn().mockResolvedValue(0) },
    });
    useCase = new ActivateCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      'no activities',
    );
  });
});
