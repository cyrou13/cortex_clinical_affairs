import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ApprovePmsPlanUseCase } from '../approve-pms-plan.js';

vi.mock('../../../domain/value-objects/plan-status.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../domain/value-objects/plan-status.js')>();
  return { ...actual };
});

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'DRAFT',
        projectId: 'project-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: 'user-1',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('ApprovePmsPlanUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ApprovePmsPlanUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ApprovePmsPlanUseCase(prisma, mockEventBus as any);
  });

  it('approves a DRAFT PMS plan successfully', async () => {
    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.pmsPlanId).toBe('plan-1');
    expect(result.status).toBe('APPROVED');
    expect(result.approvedAt).toBeDefined();
  });

  it('updates plan status to APPROVED with approvedAt and approvedById', async () => {
    await useCase.execute('plan-1', 'user-1');

    expect(prisma.pmsPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedById: 'user-1',
        }),
      }),
    );

    const callData = prisma.pmsPlan.update.mock.calls[0][0].data;
    expect(callData.approvedAt).toBeInstanceOf(Date);
  });

  it('publishes a pms.plan.approved event', async () => {
    await useCase.execute('plan-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.plan.approved',
        aggregateType: 'PmsPlan',
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          projectId: 'project-1',
          status: 'APPROVED',
        }),
      }),
    );
  });

  it('returns approvedAt as ISO string', async () => {
    const result = await useCase.execute('plan-1', 'user-1');

    expect(typeof result.approvedAt).toBe('string');
    expect(() => new Date(result.approvedAt)).not.toThrow();
  });

  it('throws NotFoundError when plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new ApprovePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'not found',
    );
  });

  it('throws ValidationError when plan is already APPROVED', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          status: 'APPROVED',
          projectId: 'project-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ApprovePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'Cannot approve PMS plan in APPROVED status',
    );
  });

  it('throws ValidationError when plan is ACTIVE', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          status: 'ACTIVE',
          projectId: 'project-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ApprovePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'Cannot approve PMS plan in ACTIVE status',
    );
  });

  it('does not publish event when approval fails', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new ApprovePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
