import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CreatePmsPlanUseCase } from '../create-pms-plan.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue({ id: 'project-1' }),
    },
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cer-v1',
        status: 'LOCKED',
        projectId: 'project-1',
      }),
    },
    pmsPlan: {
      create: vi.fn().mockResolvedValue({
        id: 'plan-1',
        projectId: 'project-1',
        cerVersionId: 'cer-v1',
        status: 'DRAFT',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('CreatePmsPlanUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CreatePmsPlanUseCase;

  const validInput = {
    projectId: 'project-1',
    cerVersionId: 'cer-v1',
    updateFrequency: 'ANNUALLY',
    dataCollectionMethods: ['LITERATURE_REVIEW', 'VIGILANCE'],
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CreatePmsPlanUseCase(prisma, mockEventBus as any);
  });

  it('creates a PMS plan successfully and returns DRAFT status', async () => {
    const result = await useCase.execute(validInput);

    expect(result.projectId).toBe('project-1');
    expect(result.cerVersionId).toBe('cer-v1');
    expect(result.status).toBe('DRAFT');
    expect(result.pmsPlanId).toBeDefined();
  });

  it('calls prisma.pmsPlan.create with correct data', async () => {
    await useCase.execute(validInput);

    expect((prisma as any).pmsPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-1',
          cerVersionId: 'cer-v1',
          updateFrequency: 'ANNUALLY',
          dataCollectionMethods: ['LITERATURE_REVIEW', 'VIGILANCE'],
          status: 'DRAFT',
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('publishes a pms.plan.created event', async () => {
    await useCase.execute(validInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.plan.created',
        aggregateType: 'PmsPlan',
        data: expect.objectContaining({
          projectId: 'project-1',
          status: 'DRAFT',
        }),
      }),
    );
  });

  it('throws NotFoundError when project does not exist', async () => {
    prisma = makePrisma({
      project: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new CreatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    prisma = makePrisma({
      cerVersion: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new CreatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('throws ValidationError when CER version is not LOCKED', async () => {
    prisma = makePrisma({
      cerVersion: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cer-v1',
          status: 'DRAFT',
          projectId: 'project-1',
        }),
      },
    });
    useCase = new CreatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'CER version must be locked',
    );
  });

  it('throws ValidationError when CER version belongs to a different project', async () => {
    prisma = makePrisma({
      cerVersion: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cer-v1',
          status: 'LOCKED',
          projectId: 'other-project',
        }),
      },
    });
    useCase = new CreatePmsPlanUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'does not belong to this project',
    );
  });

  it('throws ValidationError when updateFrequency is empty', async () => {
    await expect(
      useCase.execute({ ...validInput, updateFrequency: '   ' }),
    ).rejects.toThrow('Update frequency is required');
  });

  it('trims updateFrequency before saving', async () => {
    await useCase.execute({ ...validInput, updateFrequency: '  ANNUALLY  ' });

    expect((prisma as any).pmsPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          updateFrequency: 'ANNUALLY',
        }),
      }),
    );
  });
});
