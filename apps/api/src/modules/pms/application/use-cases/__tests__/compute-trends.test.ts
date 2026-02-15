import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ComputeTrendsUseCase } from '../compute-trends.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
      }),
    },
    complaint: {
      findMany: vi.fn().mockResolvedValue([
        { severity: 'HIGH', classification: 'MALFUNCTION', isIncident: false },
        { severity: 'HIGH', classification: 'INJURY', isIncident: true },
        { severity: 'LOW', classification: 'MALFUNCTION', isIncident: false },
      ]),
    },
    installedBaseEntry: {
      findFirst: vi.fn().mockResolvedValue({
        activeDevices: 1000,
        totalUnitsShipped: 2000,
      }),
    },
    trendAnalysis: {
      create: vi.fn().mockResolvedValue({ id: 'trend-1' }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('ComputeTrendsUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ComputeTrendsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ComputeTrendsUseCase(prisma);
  });

  it('computes trends with severity and classification distributions', async () => {
    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.status).toBe('DRAFT');
    expect(result.severityDistribution).toEqual({ HIGH: 2, LOW: 1 });
    expect(result.classificationDistribution).toEqual({ MALFUNCTION: 2, INJURY: 1 });
    expect(result.complaintTrends).toHaveLength(1);
    expect(result.complaintTrends[0]!.complaintCount).toBe(3);
    expect(result.complaintTrends[0]!.incidentCount).toBe(1);
  });

  it('calculates complaint rate per 1000 devices', async () => {
    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.complaintTrends[0]!.complaintRate).toBe(3);
    expect(result.complaintTrends[0]!.incidentRate).toBe(1);
  });

  it('creates a trendAnalysis record in DRAFT status', async () => {
    await useCase.execute('cycle-1', 'user-1');

    expect(prisma.trendAnalysis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          status: 'DRAFT',
          severityDistribution: { HIGH: 2, LOW: 1 },
        }),
      }),
    );
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new ComputeTrendsUseCase(prisma);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow('not found');
  });

  it('defaults to 1 active device when no installed base exists', async () => {
    prisma = makePrisma({
      installedBaseEntry: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    useCase = new ComputeTrendsUseCase(prisma);

    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.complaintTrends[0]!.complaintRate).toBe(3000);
  });
});
