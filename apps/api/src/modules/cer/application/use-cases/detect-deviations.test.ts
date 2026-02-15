import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetectDeviationsUseCase } from './detect-deviations.js';

const CER_VERSION_ID = 'cer-v1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  pccpCriteria?: Record<string, unknown>[];
  validationResults?: Record<string, unknown>[];
  soaBenchmarks?: Record<string, unknown>[];
  config?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: CER_VERSION_ID, projectId: PROJECT_ID },
      ),
    },
    pccpAcceptanceCriteria: {
      findMany: vi.fn().mockResolvedValue(overrides?.pccpCriteria ?? []),
    },
    pccpDeviationConfig: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.config !== undefined
          ? overrides.config
          : { mandatoryJustificationLevel: 'HIGH' },
      ),
    },
    validationResult: {
      findMany: vi.fn().mockResolvedValue(overrides?.validationResults ?? []),
    },
    soaBenchmark: {
      findMany: vi.fn().mockResolvedValue(overrides?.soaBenchmarks ?? []),
    },
    pccpDeviation: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id, ...data }),
      ),
    },
  } as any;
}

describe('DetectDeviationsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new DetectDeviationsUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('returns empty results when no PCCP criteria exist', async () => {
    const prisma = makePrisma();
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.detectedCount).toBe(0);
    expect(result.createdCount).toBe(0);
  });

  it('detects validation result deviations', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'sensitivity',
          expectedValue: '95',
          section: 'Performance',
          tolerance: 5,
        },
      ],
      validationResults: [
        { parameterName: 'sensitivity', value: '88' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.detectedCount).toBe(1);
    expect(result.deviations[0].source).toBe('VALIDATION_RESULT');
    expect(result.deviations[0].expectedValue).toBe('95');
    expect(result.deviations[0].actualValue).toBe('88');
  });

  it('detects SOA benchmark deviations', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'specificity',
          expectedValue: '98',
          section: 'Performance',
          tolerance: 5,
        },
      ],
      soaBenchmarks: [
        { parameterName: 'specificity', benchmarkValue: '92' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.detectedCount).toBe(1);
    expect(result.deviations[0].source).toBe('SOA_BENCHMARK');
  });

  it('creates PccpDeviation records for detected deviations', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'sensitivity',
          expectedValue: '95',
          section: 'Performance',
          tolerance: 5,
        },
      ],
      validationResults: [
        { parameterName: 'sensitivity', value: '80' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.createdCount).toBe(1);
    expect(prisma.pccpDeviation.create).toHaveBeenCalledTimes(1);
  });

  it('does not detect deviation when values match', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'sensitivity',
          expectedValue: '95',
          section: 'Performance',
          tolerance: 5,
        },
      ],
      validationResults: [
        { parameterName: 'sensitivity', value: '95' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.detectedCount).toBe(0);
  });

  it('computes LOW significance for small deviations', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'sensitivity',
          expectedValue: '100',
          section: 'Performance',
          tolerance: 10,
        },
      ],
      validationResults: [
        { parameterName: 'sensitivity', value: '95' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.deviations[0].significance).toBe('LOW');
  });

  it('computes CRITICAL significance for large deviations', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'sensitivity',
          expectedValue: '100',
          section: 'Performance',
          tolerance: 5,
        },
      ],
      validationResults: [
        { parameterName: 'sensitivity', value: '50' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.deviations[0].significance).toBe('CRITICAL');
  });

  it('detects both validation and SOA deviations together', async () => {
    const prisma = makePrisma({
      pccpCriteria: [
        {
          parameterName: 'sensitivity',
          expectedValue: '95',
          section: 'Performance',
          tolerance: 5,
        },
        {
          parameterName: 'specificity',
          expectedValue: '98',
          section: 'Performance',
          tolerance: 5,
        },
      ],
      validationResults: [
        { parameterName: 'sensitivity', value: '80' },
      ],
      soaBenchmarks: [
        { parameterName: 'specificity', benchmarkValue: '85' },
      ],
    });
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.detectedCount).toBe(2);
    expect(result.createdCount).toBe(2);
  });

  it('returns cerVersionId in result', async () => {
    const prisma = makePrisma();
    const useCase = new DetectDeviationsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.cerVersionId).toBe(CER_VERSION_ID);
  });
});
