import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ManageResponsibilitiesUseCase } from '../manage-responsibilities.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({ id: 'plan-1' }),
    },
    pmsResponsibility: {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: args.data.id,
          pmsPlanId: args.data.pmsPlanId,
          activityType: args.data.activityType,
          userId: args.data.userId,
          role: args.data.role,
          description: args.data.description,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'resp-1' }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'resp-1',
          pmsPlanId: 'plan-1',
          activityType: 'LITERATURE_UPDATE',
          userId: 'user-2',
          role: 'REVIEWER',
          description: null,
        },
        {
          id: 'resp-2',
          pmsPlanId: 'plan-1',
          activityType: 'VIGILANCE_MONITORING',
          userId: 'user-3',
          role: 'OWNER',
          description: 'Vigilance lead',
        },
      ]),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('ManageResponsibilitiesUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ManageResponsibilitiesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ManageResponsibilitiesUseCase(prisma);
  });

  describe('add', () => {
    const validInput = {
      pmsPlanId: 'plan-1',
      activityType: 'LITERATURE_UPDATE',
      userId: 'user-2',
      role: 'REVIEWER',
      assignedBy: 'user-1',
    };

    it('adds a responsibility successfully', async () => {
      const result = await useCase.add(validInput);

      expect(result.pmsPlanId).toBe('plan-1');
      expect(result.activityType).toBe('LITERATURE_UPDATE');
      expect(result.userId).toBe('user-2');
      expect(result.role).toBe('REVIEWER');
    });

    it('creates responsibility with correct data in prisma', async () => {
      await useCase.add(validInput);

      expect(prisma.pmsResponsibility.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pmsPlanId: 'plan-1',
            activityType: 'LITERATURE_UPDATE',
            userId: 'user-2',
            role: 'REVIEWER',
            description: null,
          }),
        }),
      );
    });

    it('includes optional description when provided', async () => {
      await useCase.add({
        ...validInput,
        description: 'Lead reviewer for literature updates',
      });

      expect(prisma.pmsResponsibility.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Lead reviewer for literature updates',
          }),
        }),
      );
    });

    it('sets description to null when not provided', async () => {
      await useCase.add(validInput);

      const callData = vi.mocked(prisma.pmsResponsibility.create).mock.calls[0]![0]!.data;
      expect(callData.description).toBeNull();
    });

    it('throws ValidationError for invalid activity type', async () => {
      await expect(useCase.add({ ...validInput, activityType: 'INVALID_TYPE' })).rejects.toThrow(
        'Invalid activity type',
      );
    });

    it('throws NotFoundError when plan does not exist', async () => {
      prisma = makePrisma({
        pmsPlan: { findUnique: vi.fn().mockResolvedValue(null) },
      });
      useCase = new ManageResponsibilitiesUseCase(prisma);

      await expect(useCase.add(validInput)).rejects.toThrow('not found');
    });

    it('accepts all valid activity types', async () => {
      const validTypes = [
        'LITERATURE_UPDATE',
        'NAMED_DEVICE_SEARCH',
        'USER_SURVEYS',
        'VIGILANCE_MONITORING',
        'COMPLAINTS',
        'INSTALLED_BASE',
        'TREND_ANALYSIS',
      ];

      for (const activityType of validTypes) {
        vi.clearAllMocks();
        prisma = makePrisma();
        useCase = new ManageResponsibilitiesUseCase(prisma);

        const result = await useCase.add({ ...validInput, activityType });
        expect(result.activityType).toBe(activityType);
      }
    });
  });

  describe('remove', () => {
    it('removes a responsibility and returns deleted true', async () => {
      const result = await useCase.remove('resp-1');

      expect(result.deleted).toBe(true);
      expect(prisma.pmsResponsibility.delete).toHaveBeenCalledWith({
        where: { id: 'resp-1' },
      });
    });
  });

  describe('list', () => {
    it('lists responsibilities for a plan ordered by activityType', async () => {
      const result = await useCase.list('plan-1');

      expect(result).toHaveLength(2);
      expect(prisma.pmsResponsibility.findMany).toHaveBeenCalledWith({
        where: { pmsPlanId: 'plan-1' },
        orderBy: { activityType: 'asc' },
      });
    });

    it('returns responsibility data with all expected fields', async () => {
      const result = await useCase.list('plan-1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'resp-1',
          pmsPlanId: 'plan-1',
          activityType: 'LITERATURE_UPDATE',
          userId: 'user-2',
          role: 'REVIEWER',
        }),
      );
    });
  });
});
