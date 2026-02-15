import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UpdateComplaintUseCase } from '../update-complaint.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    complaint: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'complaint-1',
        status: 'OPEN',
        description: 'Original description',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'complaint-1',
        status: 'INVESTIGATING',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('UpdateComplaintUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: UpdateComplaintUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new UpdateComplaintUseCase(prisma);
  });

  it('updates complaint fields and returns updated fields list', async () => {
    const result = await useCase.execute({
      complaintId: 'complaint-1',
      description: 'Updated description',
      severity: 'CRITICAL',
      userId: 'user-1',
    });

    expect(result.id).toBe('complaint-1');
    expect(result.updatedFields).toEqual(['description', 'severity']);
    expect(prisma.complaint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { description: 'Updated description', severity: 'CRITICAL' },
      }),
    );
  });

  it('transitions complaint status correctly (OPEN -> INVESTIGATING)', async () => {
    const result = await useCase.execute({
      complaintId: 'complaint-1',
      status: 'INVESTIGATING',
      userId: 'user-1',
    });

    expect(result.status).toBe('INVESTIGATING');
    expect(result.updatedFields).toContain('status');
  });

  it('throws NotFoundError when complaint does not exist', async () => {
    prisma = makePrisma({
      complaint: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new UpdateComplaintUseCase(prisma);

    await expect(
      useCase.execute({ complaintId: 'missing-id', description: 'X', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError for invalid status transition (OPEN -> RESOLVED)', async () => {
    await expect(
      useCase.execute({
        complaintId: 'complaint-1',
        status: 'RESOLVED',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Cannot transition complaint');
  });

  it('sets resolutionDate when transitioning to RESOLVED', async () => {
    prisma = makePrisma({
      complaint: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'complaint-1',
          status: 'INVESTIGATING',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'complaint-1',
          status: 'RESOLVED',
        }),
      },
    });
    useCase = new UpdateComplaintUseCase(prisma);

    await useCase.execute({
      complaintId: 'complaint-1',
      status: 'RESOLVED',
      userId: 'user-1',
    });

    expect(prisma.complaint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolutionDate: expect.any(Date),
        }),
      }),
    );
  });
});
