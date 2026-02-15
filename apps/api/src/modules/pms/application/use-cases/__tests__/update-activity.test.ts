import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UpdateActivityUseCase } from '../update-activity.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmcfActivity: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'activity-1',
        status: 'IN_PROGRESS',
        title: 'Original Title',
        activityType: 'COMPLAINTS',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'activity-1',
        title: 'Updated Title',
        status: 'IN_PROGRESS',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('UpdateActivityUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: UpdateActivityUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new UpdateActivityUseCase(prisma);
  });

  it('updates activity fields and returns updated fields list', async () => {
    const result = await useCase.execute({
      activityId: 'activity-1',
      title: 'Updated Title',
      description: 'New description',
      userId: 'user-1',
    });

    expect(result.activityId).toBe('activity-1');
    expect(result.title).toBe('Updated Title');
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.updatedFields).toEqual(['title', 'description']);
  });

  it('calls prisma update with only provided fields', async () => {
    await useCase.execute({
      activityId: 'activity-1',
      findingsSummary: 'Some findings',
      userId: 'user-1',
    });

    expect(prisma.pmcfActivity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { findingsSummary: 'Some findings' },
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
    useCase = new UpdateActivityUseCase(prisma);

    await expect(
      useCase.execute({ activityId: 'missing-id', title: 'X', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when activity is COMPLETED', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          status: 'COMPLETED',
          title: 'Original Title',
        }),
        update: vi.fn(),
      },
    });
    useCase = new UpdateActivityUseCase(prisma);

    await expect(
      useCase.execute({ activityId: 'activity-1', title: 'X', userId: 'user-1' }),
    ).rejects.toThrow('Cannot update a completed activity');
  });
});
