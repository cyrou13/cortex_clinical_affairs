import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { FinalizeCerUpdateDecisionUseCase } from '../finalize-cer-update-decision.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    cerUpdateDecision: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'decision-1',
        status: 'DRAFT',
        pmsCycleId: 'cycle-1',
        conclusion: 'CER_UPDATE_NOT_REQUIRED',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'decision-1',
        status: 'FINALIZED',
      }),
    },
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({ pmsPlanId: 'plan-1', id: 'cycle-1' }),
    },
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({ projectId: 'project-1' }),
    },
    gapRegistryEntry: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('FinalizeCerUpdateDecisionUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: FinalizeCerUpdateDecisionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);
  });

  it('finalizes a draft decision and returns FINALIZED status', async () => {
    const result = await useCase.execute({ decisionId: 'decision-1', userId: 'user-1' });

    expect(result.id).toBe('decision-1');
    expect(result.status).toBe('FINALIZED');
    expect(result.conclusion).toBe('CER_UPDATE_NOT_REQUIRED');
    expect(result.decidedAt).toBeDefined();
    expect(result.gapsResolved).toBe(0);
    expect(result.newGapsCreated).toBe(0);
    expect(prisma.cerUpdateDecision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'decision-1' },
        data: expect.objectContaining({ status: 'FINALIZED' }),
      }),
    );
  });

  it('publishes a pms.update-decision.finalized event', async () => {
    await useCase.execute({ decisionId: 'decision-1', userId: 'user-1' });

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.update-decision.finalized',
        aggregateType: 'CerUpdateDecision',
        data: expect.objectContaining({
          decisionId: 'decision-1',
          pmsCycleId: 'cycle-1',
        }),
      }),
    );
  });

  it('publishes a pms.cer-update-required event when conclusion requires CER update', async () => {
    prisma = makePrisma({
      cerUpdateDecision: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'decision-1',
          status: 'DRAFT',
          pmsCycleId: 'cycle-1',
          conclusion: 'CER_UPDATE_REQUIRED',
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    });
    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);

    await useCase.execute({ decisionId: 'decision-1', userId: 'user-1' });

    const publishCalls = mockEventBus.publish.mock.calls;
    expect(publishCalls).toHaveLength(2);
    expect(publishCalls[1]![0]).toMatchObject({
      eventType: 'pms.cer-update-required',
    });
  });

  it('resolves gaps when resolvedGapIds are provided', async () => {
    const input = {
      decisionId: 'decision-1',
      userId: 'user-1',
      resolvedGapIds: ['gap-1', 'gap-2', 'gap-3'],
    };

    prisma = makePrisma({
      gapRegistryEntry: {
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
        create: vi.fn(),
      },
    });
    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);

    const result = await useCase.execute(input);

    expect(result.gapsResolved).toBe(3);
    expect(prisma.gapRegistryEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['gap-1', 'gap-2', 'gap-3'] },
          pmsPlanId: 'plan-1',
          status: 'OPEN',
        }),
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedBy: 'user-1',
        }),
      }),
    );
  });

  it('creates new gaps when newGapDescriptions are provided', async () => {
    const input = {
      decisionId: 'decision-1',
      userId: 'user-1',
      newGapDescriptions: [
        {
          description: 'New gap from PMS findings',
          severity: 'HIGH',
          recommendedActivity: 'LITERATURE_UPDATE',
        },
        {
          description: 'Another gap',
          severity: 'MEDIUM',
          recommendedActivity: 'COMPLAINTS',
        },
      ],
    };

    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);

    const result = await useCase.execute(input);

    expect(result.newGapsCreated).toBe(2);
    expect(prisma.gapRegistryEntry.create).toHaveBeenCalledTimes(2);
    expect(prisma.gapRegistryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          sourceModule: 'PMS',
          sourceId: 'cycle-1',
          description: 'New gap from PMS findings',
          severity: 'HIGH',
          recommendedActivity: 'LITERATURE_UPDATE',
          status: 'OPEN',
          manuallyCreated: false,
        }),
      }),
    );
  });

  it('updates decision with gap counts', async () => {
    const input = {
      decisionId: 'decision-1',
      userId: 'user-1',
      resolvedGapIds: ['gap-1', 'gap-2'],
      newGapDescriptions: [
        {
          description: 'New gap',
          severity: 'HIGH',
          recommendedActivity: 'LITERATURE_UPDATE',
        },
      ],
    };

    prisma = makePrisma({
      gapRegistryEntry: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        create: vi.fn().mockResolvedValue({}),
      },
    });
    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);

    await useCase.execute(input);

    expect(prisma.cerUpdateDecision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FINALIZED',
          newGapsIdentified: 1,
          gapsResolved: 2,
        }),
      }),
    );
  });

  it('throws NotFoundError when decision does not exist', async () => {
    prisma = makePrisma({
      cerUpdateDecision: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute({ decisionId: 'missing-id', userId: 'user-1' })).rejects.toThrow(
      'not found',
    );
  });

  it('throws ValidationError when decision is already finalized', async () => {
    prisma = makePrisma({
      cerUpdateDecision: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'decision-1',
          status: 'FINALIZED',
          pmsCycleId: 'cycle-1',
          conclusion: 'CER_UPDATE_NOT_REQUIRED',
        }),
        update: vi.fn(),
      },
    });
    useCase = new FinalizeCerUpdateDecisionUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute({ decisionId: 'decision-1', userId: 'user-1' })).rejects.toThrow(
      'already finalized',
    );
  });
});
