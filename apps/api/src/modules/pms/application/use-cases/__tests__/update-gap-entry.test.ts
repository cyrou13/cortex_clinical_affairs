import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UpdateGapEntryUseCase } from '../update-gap-entry.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    gapRegistryEntry: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'gap-1',
        pmsPlanId: 'plan-1',
        sourceModule: 'SOA',
        sourceId: 'q-1',
        description: 'Original description',
        severity: 'MEDIUM',
        recommendedActivity: 'LITERATURE_UPDATE',
        status: 'OPEN',
        manuallyCreated: false,
        resolvedAt: null,
        resolutionNotes: null,
      }),
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'gap-1',
          pmsPlanId: 'plan-1',
          sourceModule: 'SOA',
          sourceId: 'q-1',
          description: 'Original description',
          severity: 'MEDIUM',
          recommendedActivity: 'LITERATURE_UPDATE',
          status: 'OPEN',
          manuallyCreated: false,
          resolvedAt: null,
          resolutionNotes: null,
          ...args.data,
        }),
      ),
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: args.data.id,
          pmsPlanId: args.data.pmsPlanId,
          sourceModule: args.data.sourceModule,
          sourceId: args.data.sourceId,
          description: args.data.description,
          severity: args.data.severity,
          recommendedActivity: args.data.recommendedActivity,
          status: args.data.status,
          manuallyCreated: args.data.manuallyCreated,
          resolvedAt: null,
          resolutionNotes: null,
        }),
      ),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('UpdateGapEntryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: UpdateGapEntryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new UpdateGapEntryUseCase(prisma);
  });

  describe('execute (update)', () => {
    it('updates gap entry description successfully', async () => {
      const result = await useCase.execute({
        gapEntryId: 'gap-1',
        description: 'Updated description',
        userId: 'user-1',
      });

      expect(result.id).toBe('gap-1');
      expect(prisma.gapRegistryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'gap-1' },
          data: expect.objectContaining({
            description: 'Updated description',
          }),
        }),
      );
    });

    it('updates gap entry severity', async () => {
      await useCase.execute({
        gapEntryId: 'gap-1',
        severity: 'HIGH',
        userId: 'user-1',
      });

      expect(prisma.gapRegistryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'HIGH',
          }),
        }),
      );
    });

    it('updates gap entry recommendedActivity', async () => {
      await useCase.execute({
        gapEntryId: 'gap-1',
        recommendedActivity: 'VIGILANCE_MONITORING',
        userId: 'user-1',
      });

      expect(prisma.gapRegistryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendedActivity: 'VIGILANCE_MONITORING',
          }),
        }),
      );
    });

    it('transitions status from OPEN to IN_PROGRESS', async () => {
      await useCase.execute({
        gapEntryId: 'gap-1',
        status: 'IN_PROGRESS',
        userId: 'user-1',
      });

      expect(prisma.gapRegistryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });

    it('transitions status from IN_PROGRESS to RESOLVED with resolvedAt and resolvedBy', async () => {
      prisma = makePrisma({
        gapRegistryEntry: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'gap-1',
            pmsPlanId: 'plan-1',
            sourceModule: 'SOA',
            sourceId: 'q-1',
            description: 'Desc',
            severity: 'MEDIUM',
            recommendedActivity: 'LITERATURE_UPDATE',
            status: 'IN_PROGRESS',
            manuallyCreated: false,
            resolvedAt: null,
            resolutionNotes: null,
          }),
          update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'gap-1', ...args.data }),
          ),
          create: vi.fn(),
        },
      });
      useCase = new UpdateGapEntryUseCase(prisma);

      await useCase.execute({
        gapEntryId: 'gap-1',
        status: 'RESOLVED',
        resolutionNotes: 'Resolved via literature update',
        userId: 'user-1',
      });

      const callData = prisma.gapRegistryEntry.update.mock.calls[0][0].data;
      expect(callData.status).toBe('RESOLVED');
      expect(callData.resolvedAt).toBeInstanceOf(Date);
      expect(callData.resolvedBy).toBe('user-1');
      expect(callData.resolutionNotes).toBe('Resolved via literature update');
    });

    it('sets resolutionNotes to null when resolving without notes', async () => {
      prisma = makePrisma({
        gapRegistryEntry: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'gap-1',
            status: 'IN_PROGRESS',
          }),
          update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'gap-1', ...args.data }),
          ),
          create: vi.fn(),
        },
      });
      useCase = new UpdateGapEntryUseCase(prisma);

      await useCase.execute({
        gapEntryId: 'gap-1',
        status: 'RESOLVED',
        userId: 'user-1',
      });

      const callData = prisma.gapRegistryEntry.update.mock.calls[0][0].data;
      expect(callData.resolutionNotes).toBeNull();
    });

    it('only includes provided fields in update data', async () => {
      await useCase.execute({
        gapEntryId: 'gap-1',
        description: 'Only description',
        userId: 'user-1',
      });

      const callData = prisma.gapRegistryEntry.update.mock.calls[0][0].data;
      expect(callData).toHaveProperty('description');
      expect(callData).not.toHaveProperty('severity');
      expect(callData).not.toHaveProperty('status');
      expect(callData).not.toHaveProperty('recommendedActivity');
    });

    it('throws NotFoundError when gap entry does not exist', async () => {
      prisma = makePrisma({
        gapRegistryEntry: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          create: vi.fn(),
        },
      });
      useCase = new UpdateGapEntryUseCase(prisma);

      await expect(
        useCase.execute({
          gapEntryId: 'gap-999',
          description: 'New desc',
          userId: 'user-1',
        }),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError for invalid severity', async () => {
      await expect(
        useCase.execute({
          gapEntryId: 'gap-1',
          severity: 'EXTREME',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Invalid gap severity');
    });

    it('throws ValidationError for invalid status transition (OPEN to RESOLVED)', async () => {
      await expect(
        useCase.execute({
          gapEntryId: 'gap-1',
          status: 'RESOLVED',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Cannot transition gap from OPEN to RESOLVED');
    });

    it('accepts all valid severities', async () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      for (const severity of validSeverities) {
        vi.clearAllMocks();
        prisma = makePrisma();
        useCase = new UpdateGapEntryUseCase(prisma);

        await useCase.execute({
          gapEntryId: 'gap-1',
          severity,
          userId: 'user-1',
        });

        expect(prisma.gapRegistryEntry.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ severity }),
          }),
        );
      }
    });
  });

  describe('addManual', () => {
    const validManualInput = {
      pmsPlanId: 'plan-1',
      description: 'Manually identified gap',
      severity: 'HIGH',
      recommendedActivity: 'USER_SURVEYS',
      userId: 'user-1',
    };

    it('creates a manual gap entry successfully', async () => {
      const result = await useCase.addManual(validManualInput);

      expect(result.pmsPlanId).toBe('plan-1');
      expect(result.description).toBe('Manually identified gap');
      expect(result.severity).toBe('HIGH');
      expect(result.manuallyCreated).toBe(true);
    });

    it('creates gap entry with correct data', async () => {
      await useCase.addManual(validManualInput);

      expect(prisma.gapRegistryEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pmsPlanId: 'plan-1',
            sourceModule: 'CER',
            description: 'Manually identified gap',
            severity: 'HIGH',
            recommendedActivity: 'USER_SURVEYS',
            status: 'OPEN',
            manuallyCreated: true,
          }),
        }),
      );
    });

    it('generates unique IDs for manual entries', async () => {
      await useCase.addManual(validManualInput);

      const callData = prisma.gapRegistryEntry.create.mock.calls[0][0].data;
      expect(callData.id).toBeDefined();
      expect(callData.sourceId).toBeDefined();
    });

    it('throws ValidationError for invalid severity in manual entry', async () => {
      await expect(
        useCase.addManual({ ...validManualInput, severity: 'EXTREME' }),
      ).rejects.toThrow('Invalid gap severity');
    });

    it('accepts all valid severities for manual entries', async () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      for (const severity of validSeverities) {
        vi.clearAllMocks();
        prisma = makePrisma();
        useCase = new UpdateGapEntryUseCase(prisma);

        const result = await useCase.addManual({
          ...validManualInput,
          severity,
        });

        expect(result.severity).toBe(severity);
      }
    });
  });
});
