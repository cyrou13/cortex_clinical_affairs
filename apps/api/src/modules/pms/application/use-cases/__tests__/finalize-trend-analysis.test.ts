import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { FinalizeTrendAnalysisUseCase } from '../finalize-trend-analysis.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    trendAnalysis: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'trend-1',
        status: 'DRAFT',
        pmsCycleId: 'cycle-1',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'trend-1',
        status: 'FINALIZED',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('FinalizeTrendAnalysisUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: FinalizeTrendAnalysisUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new FinalizeTrendAnalysisUseCase(prisma);
  });

  it('finalizes a draft trend analysis with conclusions', async () => {
    const result = await useCase.execute('trend-1', 'No concerning trends identified', 'user-1');

    expect(result.trendAnalysisId).toBe('trend-1');
    expect(result.status).toBe('FINALIZED');
    expect(result.conclusions).toBe('No concerning trends identified');
    expect(prisma.trendAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trend-1' },
        data: { status: 'FINALIZED', conclusions: 'No concerning trends identified' },
      }),
    );
  });

  it('throws NotFoundError when trend analysis does not exist', async () => {
    prisma = makePrisma({
      trendAnalysis: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    useCase = new FinalizeTrendAnalysisUseCase(prisma);

    await expect(
      useCase.execute('missing-id', 'conclusions', 'user-1'),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when already finalized', async () => {
    prisma = makePrisma({
      trendAnalysis: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'trend-1',
          status: 'FINALIZED',
        }),
        update: vi.fn(),
      },
    });
    useCase = new FinalizeTrendAnalysisUseCase(prisma);

    await expect(
      useCase.execute('trend-1', 'conclusions', 'user-1'),
    ).rejects.toThrow('already finalized');
  });

  it('throws ValidationError when conclusions are empty', async () => {
    await expect(
      useCase.execute('trend-1', '   ', 'user-1'),
    ).rejects.toThrow('Conclusions are required');
  });
});
