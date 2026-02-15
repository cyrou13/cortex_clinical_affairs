import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ManageInstalledBaseUseCase } from '../manage-installed-base.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({ id: 'cycle-1' }),
    },
    installedBaseEntry: {
      create: vi.fn().mockResolvedValue({
        id: 'ib-1',
        pmsCycleId: 'cycle-1',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-03-31'),
        totalUnitsShipped: 5000,
        activeDevices: 3000,
        regionBreakdown: null,
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'ib-1',
        pmsCycleId: 'cycle-1',
        totalUnitsShipped: 5000,
        activeDevices: 3000,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'ib-1',
        totalUnitsShipped: 6000,
        activeDevices: 3500,
      }),
      delete: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('ManageInstalledBaseUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ManageInstalledBaseUseCase;

  const createInput = {
    pmsCycleId: 'cycle-1',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    totalUnitsShipped: 5000,
    activeDevices: 3000,
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ManageInstalledBaseUseCase(prisma);
  });

  it('creates an installed base entry successfully', async () => {
    const result = await useCase.create(createInput);

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.totalUnitsShipped).toBe(5000);
    expect(result.activeDevices).toBe(3000);
    expect(prisma.installedBaseEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          totalUnitsShipped: 5000,
          activeDevices: 3000,
          source: 'MANUAL',
        }),
      }),
    );
  });

  it('throws NotFoundError when cycle does not exist on create', async () => {
    prisma = makePrisma({
      pmsCycle: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new ManageInstalledBaseUseCase(prisma);

    await expect(useCase.create(createInput)).rejects.toThrow('not found');
  });

  it('throws ValidationError for negative unit counts', async () => {
    await expect(
      useCase.create({ ...createInput, totalUnitsShipped: -1 }),
    ).rejects.toThrow('non-negative');
  });

  it('updates an existing installed base entry', async () => {
    const result = await useCase.update('ib-1', { totalUnitsShipped: 6000 });

    expect(result.totalUnitsShipped).toBe(6000);
    expect(prisma.installedBaseEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ib-1' },
        data: expect.objectContaining({ totalUnitsShipped: 6000 }),
      }),
    );
  });

  it('throws NotFoundError when entry does not exist on update', async () => {
    prisma = makePrisma({
      installedBaseEntry: {
        ...makePrisma().installedBaseEntry as any,
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    useCase = new ManageInstalledBaseUseCase(prisma);

    await expect(
      useCase.update('missing-id', { totalUnitsShipped: 1000 }),
    ).rejects.toThrow('not found');
  });
});
