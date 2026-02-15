import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ImportComplaintsUseCase } from '../import-complaints.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({ id: 'cycle-1' }),
    },
    complaint: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'complaint-new' }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), close: vi.fn() };

describe('ImportComplaintsUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ImportComplaintsUseCase;

  const validInput = {
    pmsCycleId: 'cycle-1',
    complaints: [
      {
        date: '2026-01-10',
        reportDate: '2026-01-11',
        description: 'Complaint A',
        deviceIdentifier: 'DEV-001',
        severity: 'LOW',
        classification: 'MALFUNCTION',
      },
      {
        date: '2026-01-12',
        reportDate: '2026-01-13',
        description: 'Complaint B',
        deviceIdentifier: 'DEV-002',
        severity: 'HIGH',
        classification: 'INJURY',
        externalId: 'EXT-001',
      },
    ],
    source: 'ZOHO_DESK',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ImportComplaintsUseCase(prisma, mockEventBus as any);
  });

  it('imports complaints and returns imported count', async () => {
    const result = await useCase.execute(validInput);

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(prisma.complaint.create).toHaveBeenCalledTimes(2);
  });

  it('skips complaints with duplicate externalId', async () => {
    prisma = makePrisma({
      complaint: {
        findFirst: vi.fn().mockImplementation(({ where }: any) => {
          if (where.externalId === 'EXT-001') return { id: 'existing' };
          return null;
        }),
        create: vi.fn().mockResolvedValue({ id: 'new' }),
      },
    });
    useCase = new ImportComplaintsUseCase(prisma, mockEventBus as any);

    const result = await useCase.execute(validInput);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('publishes a pms.complaints.imported event', async () => {
    await useCase.execute(validInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pms.complaints.imported',
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          imported: 2,
          source: 'ZOHO_DESK',
        }),
      }),
    );
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new ImportComplaintsUseCase(prisma, mockEventBus as any);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('captures errors for individual complaint failures', async () => {
    prisma = makePrisma({
      complaint: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 'ok' })
          .mockRejectedValueOnce(new Error('DB constraint violation')),
      },
    });
    useCase = new ImportComplaintsUseCase(prisma, mockEventBus as any);

    const result = await useCase.execute(validInput);

    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rowIndex).toBe(1);
    expect(result.errors[0].message).toContain('DB constraint violation');
  });
});
