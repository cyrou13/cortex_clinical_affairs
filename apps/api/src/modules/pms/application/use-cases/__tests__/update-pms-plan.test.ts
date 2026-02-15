import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UpdatePmsPlanUseCase } from '../update-pms-plan.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'DRAFT',
        updateFrequency: 'ANNUALLY',
        dataCollectionMethods: ['LITERATURE_REVIEW'],
      }),
      update: vi.fn().mockResolvedValue({
        id: 'plan-1',
        status: 'DRAFT',
        updateFrequency: 'QUARTERLY',
        dataCollectionMethods: ['LITERATURE_REVIEW', 'VIGILANCE'],
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('UpdatePmsPlanUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: UpdatePmsPlanUseCase;

  const validInput = {
    pmsPlanId: 'plan-1',
    updateFrequency: 'QUARTERLY',
    dataCollectionMethods: ['LITERATURE_REVIEW', 'VIGILANCE'],
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new UpdatePmsPlanUseCase(prisma);
  });

  it('updates a PMS plan successfully and returns updated data', async () => {
    const result = await useCase.execute(validInput);

    expect(result.pmsPlanId).toBe('plan-1');
    expect(result.updateFrequency).toBe('QUARTERLY');
    expect(result.status).toBe('DRAFT');
  });

  it('calls prisma.pmsPlan.update with correct fields', async () => {
    await useCase.execute(validInput);

    expect(prisma.pmsPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({
          updateFrequency: 'QUARTERLY',
          dataCollectionMethods: ['LITERATURE_REVIEW', 'VIGILANCE'],
        }),
      }),
    );
  });

  it('only includes provided fields in update data', async () => {
    await useCase.execute({
      pmsPlanId: 'plan-1',
      updateFrequency: 'MONTHLY',
      userId: 'user-1',
    });

    expect(prisma.pmsPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          updateFrequency: 'MONTHLY',
        }),
      }),
    );

    const callData = prisma.pmsPlan.update.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('dataCollectionMethods');
  });

  it('trims updateFrequency before saving', async () => {
    await useCase.execute({
      pmsPlanId: 'plan-1',
      updateFrequency: '  QUARTERLY  ',
      userId: 'user-1',
    });

    expect(prisma.pmsPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          updateFrequency: 'QUARTERLY',
        }),
      }),
    );
  });

  it('throws NotFoundError when plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new UpdatePmsPlanUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('throws ValidationError when plan is not in DRAFT status', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          status: 'APPROVED',
        }),
        update: vi.fn(),
      },
    });
    useCase = new UpdatePmsPlanUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'only be updated in DRAFT status',
    );
  });

  it('throws ValidationError when plan is in ACTIVE status', async () => {
    prisma = makePrisma({
      pmsPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          status: 'ACTIVE',
        }),
        update: vi.fn(),
      },
    });
    useCase = new UpdatePmsPlanUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'only be updated in DRAFT status',
    );
  });
});
