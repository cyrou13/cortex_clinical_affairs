import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkSoaBenchmarksUseCase } from './link-soa-benchmarks.js';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  benchmarks?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.soa !== undefined ? overrides.soa : { id: 'soa-1', type: 'SIMILAR_DEVICE' },
        ),
    },
    soaBenchmark: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.benchmarks ?? [
          { id: 'bm-1', name: 'Sensitivity', threshold: 0.9, unit: '%', metricType: 'SENSITIVITY' },
          {
            id: 'bm-2',
            name: 'Specificity',
            threshold: 0.85,
            unit: '%',
            metricType: 'SPECIFICITY',
          },
          { id: 'bm-3', name: 'Accuracy', threshold: 0.92, unit: '%', metricType: 'ACCURACY' },
        ],
      ),
    },
    acceptanceCriterion: {
      create: vi.fn().mockResolvedValue({ id: 'crit-1' }),
    },
  } as any;
}

describe('LinkSoaBenchmarksUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports all benchmarks from SOA as acceptance criteria', async () => {
    const prisma = makePrisma();
    const useCase = new LinkSoaBenchmarksUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      soaAnalysisId: 'soa-1',
    });

    expect(result.importedCount).toBe(3);
    expect(result.benchmarks).toHaveLength(3);
    expect(prisma.acceptanceCriterion.create).toHaveBeenCalledTimes(3);
  });

  it('maps benchmark data correctly to acceptance criteria', async () => {
    const prisma = makePrisma({
      benchmarks: [
        {
          id: 'bm-1',
          name: 'Test Metric',
          threshold: 0.95,
          unit: 'ratio',
          metricType: 'SENSITIVITY',
        },
      ],
    });
    const useCase = new LinkSoaBenchmarksUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      soaAnalysisId: 'soa-1',
    });

    expect(result.benchmarks[0]!.name).toBe('Test Metric');
    expect(result.benchmarks[0]!.threshold).toBe(0.95);
    expect(result.benchmarks[0]!.unit).toBe('ratio');
    expect(prisma.acceptanceCriterion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStudyId: 'study-1',
          soaBenchmarkId: 'bm-1',
          name: 'Test Metric',
          threshold: 0.95,
        }),
      }),
    );
  });

  it('handles SOA with no benchmarks', async () => {
    const prisma = makePrisma({ benchmarks: [] });
    const useCase = new LinkSoaBenchmarksUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      soaAnalysisId: 'soa-1',
    });

    expect(result.importedCount).toBe(0);
    expect(result.benchmarks).toHaveLength(0);
  });

  it('throws when SOA not found', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new LinkSoaBenchmarksUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'study-1',
        soaAnalysisId: 'missing',
      }),
    ).rejects.toThrow('not found');
  });
});
