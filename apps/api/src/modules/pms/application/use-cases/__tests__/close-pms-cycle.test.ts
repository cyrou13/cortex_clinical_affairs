import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ClosePmsCycleUseCase } from '../close-pms-cycle.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        pmsPlanId: 'plan-1',
        status: 'ACTIVE',
        completedAt: null,
        activities: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }],
      }),
      update: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        status: 'COMPLETED',
      }),
    },
    cerUpdateDecision: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'decision-1',
        pmsCycleId: 'cycle-1',
        status: 'FINALIZED',
        conclusion: 'CER_UPDATE_NOT_REQUIRED',
      }),
    },
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        projectId: 'project-1',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('ClosePmsCycleUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ClosePmsCycleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    // Mock PSUR report check (accessing ungenerated model)
    (prisma as any).psurReport = {
      findFirst: vi.fn().mockResolvedValue({ id: 'psur-1' }),
    };
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);
  });

  it('closes a PMS cycle when all validations pass', async () => {
    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.status).toBe('COMPLETED');
    expect(result.psurGenerated).toBe(true);
    expect(result.decisionFinalized).toBe(true);
    expect(result.completedAt).toBeDefined();
  });

  it('updates cycle status to COMPLETED', async () => {
    await useCase.execute('cycle-1', 'user-1');

    expect(prisma.pmsCycle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cycle-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('publishes regulatory loop closed event', async () => {
    await useCase.execute('cycle-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.regulatory-loop.closed',
        aggregateType: 'PmsCycle',
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          pmsPlanId: 'plan-1',
          cerUpdateRequired: false,
        }),
      }),
    );
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow('not found');
  });

  it('throws ValidationError when activities are not completed', async () => {
    prisma = makePrisma({
      pmsCycle: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cycle-1',
          pmsPlanId: 'plan-1',
          status: 'ACTIVE',
          completedAt: null,
          activities: [{ status: 'COMPLETED' }, { status: 'IN_PROGRESS' }],
        }),
      },
    });
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      '1 activities are not completed',
    );
  });

  it('throws ValidationError when PSUR is not generated', async () => {
    prisma = makePrisma();
    (prisma as any).psurReport = {
      findFirst: vi.fn().mockResolvedValue(null),
    };
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      'PSUR report must be generated',
    );
  });

  it('throws ValidationError when CER Update Decision is not finalized', async () => {
    prisma = makePrisma({
      cerUpdateDecision: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    (prisma as any).psurReport = {
      findFirst: vi.fn().mockResolvedValue({ id: 'psur-1' }),
    };
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('cycle-1', 'user-1')).rejects.toThrow(
      'CER Update Decision must be finalized',
    );
  });

  it('indicates cerUpdateRequired in event when decision requires update', async () => {
    prisma = makePrisma({
      cerUpdateDecision: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'decision-1',
          pmsCycleId: 'cycle-1',
          status: 'FINALIZED',
          conclusion: 'CER_UPDATE_REQUIRED',
        }),
      },
    });
    (prisma as any).psurReport = {
      findFirst: vi.fn().mockResolvedValue({ id: 'psur-1' }),
    };
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);

    await useCase.execute('cycle-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cerUpdateRequired: true,
        }),
      }),
    );
  });

  it('does not update cycle if already COMPLETED', async () => {
    prisma = makePrisma({
      pmsCycle: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cycle-1',
          pmsPlanId: 'plan-1',
          status: 'COMPLETED',
          completedAt: new Date('2026-03-31'),
          activities: [{ status: 'COMPLETED' }],
        }),
        update: vi.fn(),
      },
    });
    (prisma as any).psurReport = {
      findFirst: vi.fn().mockResolvedValue({ id: 'psur-1' }),
    };
    useCase = new ClosePmsCycleUseCase(prisma, mockEventBus as any);

    const result = await useCase.execute('cycle-1', 'user-1');

    expect(prisma.pmsCycle.update).not.toHaveBeenCalled();
    expect(result.status).toBe('COMPLETED');
  });
});
