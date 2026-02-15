import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ActivatePmsPlanUseCase } from '../activate-pms-plan.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'APPROVED',
        projectId: 'project-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'ACTIVE',
        activatedAt: new Date(),
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('ActivatePmsPlanUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ActivatePmsPlanUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ActivatePmsPlanUseCase(prisma, mockEventBus as any);
  });

  it('activates an APPROVED PMS plan successfully', async () => {
    const result = await useCase.execute('plan-1', 'user-1');

    expect(result.pmsPlanId).toBe('plan-1');
    expect(result.status).toBe('ACTIVE');
    expect(result.activatedAt).toBeDefined();
  });

  it('updates plan status to ACTIVE with activatedAt', async () => {
    await useCase.execute('plan-1', 'user-1');

    expect((prisma as any).pmsPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
        }),
      }),
    );

    const callData = (prisma as any).pmsPlan.update.mock.calls[0][0].data;
    expect(callData.activatedAt).toBeInstanceOf(Date);
  });

  it('publishes a pms.plan.activated event', async () => {
    await useCase.execute('plan-1', 'user-1');

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.plan.activated',
        aggregateType: 'PmsPlan',
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          projectId: 'project-1',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('returns activatedAt as ISO string', async () => {
    const result = await useCase.execute('plan-1', 'user-1');

    expect(typeof result.activatedAt).toBe('string');
    expect(() => new Date(result.activatedAt)).not.toThrow();
  });

  it('throws NotFoundError when plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new ActivatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'not found',
    );
  });

  it('throws ValidationError when plan is in DRAFT status', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          status: 'DRAFT',
          projectId: 'project-1',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ActivatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'Cannot activate PMS plan in DRAFT status',
    );
  });

  it('throws ValidationError when plan is already ACTIVE', async () => {
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
    useCase = new ActivatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow(
      'Cannot activate PMS plan in ACTIVE status',
    );
  });

  it('does not publish event when activation fails', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new ActivatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute('plan-1', 'user-1')).rejects.toThrow();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
