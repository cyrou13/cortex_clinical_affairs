import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ReassignActivityUseCase } from '../reassign-activity.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmcfActivity: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'activity-1',
        status: 'IN_PROGRESS',
        assigneeId: 'user-old',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'activity-1',
        assigneeId: 'user-new',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('ReassignActivityUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ReassignActivityUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ReassignActivityUseCase(prisma);
  });

  it('reassigns an activity and returns previous and new assignee', async () => {
    const result = await useCase.execute('activity-1', 'user-new', 'admin-1');

    expect(result.activityId).toBe('activity-1');
    expect(result.previousAssigneeId).toBe('user-old');
    expect(result.newAssigneeId).toBe('user-new');
    expect(prisma.pmcfActivity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'activity-1' },
        data: { assigneeId: 'user-new' },
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
    useCase = new ReassignActivityUseCase(prisma);

    await expect(
      useCase.execute('missing-id', 'user-new', 'admin-1'),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when activity is COMPLETED', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          status: 'COMPLETED',
          assigneeId: 'user-old',
        }),
        update: vi.fn(),
      },
    });
    useCase = new ReassignActivityUseCase(prisma);

    await expect(
      useCase.execute('activity-1', 'user-new', 'admin-1'),
    ).rejects.toThrow('Cannot reassign a completed activity');
  });

  it('allows reassigning a PLANNED activity', async () => {
    prisma = makePrisma({
      pmcfActivity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          status: 'PLANNED',
          assigneeId: 'user-old',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'activity-1',
          assigneeId: 'user-new',
        }),
      },
    });
    useCase = new ReassignActivityUseCase(prisma);

    const result = await useCase.execute('activity-1', 'user-new', 'admin-1');
    expect(result.newAssigneeId).toBe('user-new');
  });
});
