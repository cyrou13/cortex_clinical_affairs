import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapResultsUseCase } from './map-results.js';

function makePrisma(overrides?: {
  study?: Record<string, unknown> | null;
  activeImport?: Record<string, unknown> | null;
  criteria?: Array<Record<string, unknown>>;
}) {
  return {
    validationStudy: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.study !== undefined
            ? overrides.study
            : { id: 'study-1', status: 'IN_PROGRESS', type: 'STANDALONE' },
        ),
    },
    dataImport: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.activeImport !== undefined
          ? overrides.activeImport
          : {
              id: 'import-1',
              data: [
                { case_id: 'C001', ground_truth: 'POSITIVE', prediction: 'POSITIVE' },
                { case_id: 'C002', ground_truth: 'POSITIVE', prediction: 'POSITIVE' },
                { case_id: 'C003', ground_truth: 'NEGATIVE', prediction: 'NEGATIVE' },
                { case_id: 'C004', ground_truth: 'NEGATIVE', prediction: 'NEGATIVE' },
                { case_id: 'C005', ground_truth: 'POSITIVE', prediction: 'NEGATIVE' },
              ],
            },
      ),
    },
    acceptanceCriterion: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.criteria ?? [
          {
            id: 'crit-1',
            name: 'Sensitivity',
            threshold: 0.5,
            unit: '%',
            metricType: 'SENSITIVITY',
          },
          {
            id: 'crit-2',
            name: 'Specificity',
            threshold: 0.5,
            unit: '%',
            metricType: 'SPECIFICITY',
          },
        ],
      ),
    },
    resultsMapping: {
      create: vi.fn().mockResolvedValue({ id: 'map-1' }),
    },
  } as any;
}

describe('MapResultsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps results for all acceptance criteria', async () => {
    const prisma = makePrisma();
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    expect(result.totalCriteria).toBe(2);
    expect(result.endpointResults).toHaveLength(2);
    expect(prisma.resultsMapping.create).toHaveBeenCalledTimes(2);
  });

  it('computes sensitivity correctly from imported data', async () => {
    // Data has 3 positives (2 correct, 1 FN) and 2 negatives (2 correct)
    // Sensitivity = 2/(2+1) = 0.667
    const prisma = makePrisma();
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    const sensitivityResult = result.endpointResults.find((r) => r.criterionName === 'Sensitivity');
    expect(sensitivityResult).toBeDefined();
    expect(sensitivityResult!.computedValue).toBeCloseTo(2 / 3, 4);
    expect(sensitivityResult!.result).toBe('MET'); // 0.667 >= 0.5
  });

  it('computes specificity correctly', async () => {
    // 2 TN out of 2 negatives -> specificity = 1.0
    const prisma = makePrisma();
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    const specificityResult = result.endpointResults.find((r) => r.criterionName === 'Specificity');
    expect(specificityResult).toBeDefined();
    expect(specificityResult!.computedValue).toBe(1.0);
    expect(specificityResult!.result).toBe('MET');
  });

  it('marks criteria as NOT_MET when below threshold', async () => {
    const prisma = makePrisma({
      criteria: [
        { id: 'crit-1', name: 'Sensitivity', threshold: 0.9, unit: '%', metricType: 'SENSITIVITY' },
      ],
    });
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    expect(result.endpointResults[0]!.result).toBe('NOT_MET');
    expect(result.overallNotMet).toBe(1);
  });

  it('counts overall MET and NOT_MET', async () => {
    const prisma = makePrisma({
      criteria: [
        { id: 'crit-1', name: 'Sensitivity', threshold: 0.5, unit: '%', metricType: 'SENSITIVITY' },
        { id: 'crit-2', name: 'Specificity', threshold: 0.5, unit: '%', metricType: 'SPECIFICITY' },
        { id: 'crit-3', name: 'Accuracy', threshold: 0.99, unit: '%', metricType: 'ACCURACY' },
      ],
    });
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    expect(result.overallMet + result.overallNotMet).toBe(3);
  });

  it('includes statistics in endpoint results', async () => {
    const prisma = makePrisma();
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    expect(result.endpointResults[0]!.statistics).toBeDefined();
    expect(result.endpointResults[0]!.statistics!.sampleSize).toBe(5);
    expect(result.endpointResults[0]!.statistics!.sensitivityCI).toBeDefined();
    expect(result.endpointResults[0]!.statistics!.specificityCI).toBeDefined();
  });

  it('throws when study not found', async () => {
    const prisma = makePrisma({ study: null });
    const useCase = new MapResultsUseCase(prisma);

    await expect(
      useCase.execute({ validationStudyId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws when no active import', async () => {
    const prisma = makePrisma({ activeImport: null });
    const useCase = new MapResultsUseCase(prisma);

    await expect(
      useCase.execute({ validationStudyId: 'study-1', userId: 'user-1' }),
    ).rejects.toThrow('No active data import');
  });

  it('throws when no acceptance criteria', async () => {
    const prisma = makePrisma({ criteria: [] });
    const useCase = new MapResultsUseCase(prisma);

    await expect(
      useCase.execute({ validationStudyId: 'study-1', userId: 'user-1' }),
    ).rejects.toThrow('No acceptance criteria');
  });

  it('saves result mapping to database for each criterion', async () => {
    const prisma = makePrisma();
    const useCase = new MapResultsUseCase(prisma);

    await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    expect(prisma.resultsMapping.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStudyId: 'study-1',
          acceptanceCriterionId: 'crit-1',
          result: expect.stringMatching(/^(MET|NOT_MET)$/),
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('handles PPV metric type', async () => {
    const prisma = makePrisma({
      criteria: [{ id: 'crit-1', name: 'PPV', threshold: 0.5, unit: '%', metricType: 'PPV' }],
    });
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    // PPV = 2 / (2 + 0) = 1.0 (no false positives in our test data)
    expect(result.endpointResults[0]!.computedValue).toBe(1.0);
  });

  it('handles NPV metric type', async () => {
    const prisma = makePrisma({
      criteria: [{ id: 'crit-1', name: 'NPV', threshold: 0.5, unit: '%', metricType: 'NPV' }],
    });
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    // NPV = 2 / (2 + 1) = 0.667
    expect(result.endpointResults[0]!.computedValue).toBeCloseTo(2 / 3, 4);
  });

  it('defaults to sensitivity for unknown metric type', async () => {
    const prisma = makePrisma({
      criteria: [
        { id: 'crit-1', name: 'Custom', threshold: 0.5, unit: '%', metricType: 'UNKNOWN_TYPE' },
      ],
    });
    const useCase = new MapResultsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      userId: 'user-1',
    });

    // Falls back to sensitivity = 2/3
    expect(result.endpointResults[0]!.computedValue).toBeCloseTo(2 / 3, 4);
  });
});
