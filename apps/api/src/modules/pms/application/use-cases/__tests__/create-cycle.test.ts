import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CreateCycleUseCase } from '../create-cycle.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'APPROVED',
        projectId: 'project-1',
      }),
    },
    pmsCycle: {
      create: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        pmsPlanId: 'plan-1',
        status: 'PLANNED',
      }),
    },
    pmsResponsibility: {
      findMany: vi.fn().mockResolvedValue([
        { activityType: 'LITERATURE_UPDATE', userId: 'user-2', description: 'Review literature' },
      ]),
    },
    pmcfActivity: {
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('CreateCycleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CreateCycleUseCase;

  const validInput = {
    pmsPlanId: 'plan-1',
    cerVersionId: 'cer-v1',
    name: 'PMS Cycle Q1 2026',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CreateCycleUseCase(prisma, mockEventBus as any);
  });

  it('creates a cycle with PLANNED status and returns activity count', async () => {
    const result = await useCase.execute(validInput);

    expect(result.pmsPlanId).toBe('plan-1');
    expect(result.status).toBe('PLANNED');
    expect(result.name).toBe('PMS Cycle Q1 2026');
    expect(result.activityCount).toBe(1);
    expect(result.pmsCycleId).toBeDefined();
  });

  it('creates activities from responsibilities', async () => {
    await useCase.execute(validInput);

    expect((prisma as any).pmcfActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityType: 'LITERATURE_UPDATE',
          assigneeId: 'user-2',
          status: 'PLANNED',
        }),
      }),
    );
  });

  it('publishes a pms.cycle.created event', async () => {
    await useCase.execute(validInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.cycle.created',
        aggregateType: 'PmsCycle',
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          status: 'PLANNED',
        }),
      }),
    );
  });

  it('throws NotFoundError when PMS plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new CreateCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('throws ValidationError when plan is not APPROVED or ACTIVE', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          status: 'DRAFT',
          projectId: 'project-1',
        }),
      },
    });
    useCase = new CreateCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'must be APPROVED or ACTIVE',
    );
  });

  it('throws ValidationError when end date is before start date', async () => {
    await expect(
      useCase.execute({ ...validInput, startDate: '2026-06-01', endDate: '2026-01-01' }),
    ).rejects.toThrow('End date must be after start date');
  });
});
