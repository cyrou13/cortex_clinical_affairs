import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CompleteCycleUseCase } from '../complete-cycle.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        status: 'ACTIVE',
        pmsPlanId: 'plan-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        status: 'COMPLETED',
      }),
    },
    pmcfActivity: {
      count: vi.fn().mockResolvedValue(0),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('CompleteCycleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CompleteCycleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CompleteCycleUseCase(prisma, mockEventBus as any);
  });

  it('completes an ACTIVE cycle and returns COMPLETED status', async () => {
    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBeDefined();
    expect((prisma as any).pmsCycle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cycle-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('publishes a pms.cycle.completed event', async () => {
    await useCase.execute('cycle-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.cycle.completed',
        aggregateType: 'PmsCycle',
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          status: 'COMPLETED',
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
    useCase = new CompleteCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow('not found');
  });

  it('throws ValidationError when cycle is not ACTIVE', async () => {
    prisma = makePrisma({
      pmsCycle: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cycle-1',
          status: 'PLANNED',
          pmsPlanId: 'plan-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new CompleteCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      'Cannot complete cycle',
    );
  });

  it('throws ValidationError when activities are not all completed', async () => {
    prisma = makePrisma({
      pmcfActivity: { count: vi.fn().mockResolvedValue(2) },
    });
    useCase = new CompleteCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      '2 activities are not completed',
    );
  });
});
