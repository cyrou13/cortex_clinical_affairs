import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateStudyUseCase } from './create-study.js';

function makePrisma(overrides?: {
  project?: Record<string, unknown> | null;
  soa?: Record<string, unknown> | null;
  soaBenchmarks?: Array<Record<string, unknown>>;
}) {
  return {
    project: {
      findUnique: vi
        .fn()
        .mockResolvedValue(overrides?.project !== undefined ? overrides.project : { id: 'proj-1' }),
    },
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.soa !== undefined
            ? overrides.soa
            : { id: 'soa-1', status: 'LOCKED', projectId: 'proj-1' },
        ),
    },
    validationStudy: {
      create: vi.fn().mockResolvedValue({ id: 'study-1' }),
    },
    soaBenchmark: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.soaBenchmarks ?? [
          { id: 'bm-1', name: 'Sensitivity', threshold: 0.9, unit: '%', metricType: 'SENSITIVITY' },
          {
            id: 'bm-2',
            name: 'Specificity',
            threshold: 0.85,
            unit: '%',
            metricType: 'SPECIFICITY',
          },
        ],
      ),
    },
    acceptanceCriterion: {
      create: vi.fn().mockResolvedValue({ id: 'crit-1' }),
    },
  } as any;
}

describe('CreateStudyUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a validation study with correct type', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'My Validation',
      type: 'STANDALONE',
      soaAnalysisId: 'soa-1',
      userId: 'user-1',
    });

    expect(result.type).toBe('STANDALONE');
    expect(result.name).toBe('My Validation');
    expect(result.soaAnalysisId).toBe('soa-1');
    expect(prisma.validationStudy.create).toHaveBeenCalled();
  });

  it('auto-imports benchmarks from SOA', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'Study',
      type: 'STANDALONE',
      soaAnalysisId: 'soa-1',
      userId: 'user-1',
    });

    expect(result.benchmarkCount).toBe(2);
    expect(prisma.acceptanceCriterion.create).toHaveBeenCalledTimes(2);
  });

  it('creates MRMC study', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'MRMC Study',
      type: 'MRMC',
      soaAnalysisId: 'soa-1',
      userId: 'user-1',
    });

    expect(result.type).toBe('MRMC');
  });

  it('throws for invalid study type', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'Study',
        type: 'INVALID',
        soaAnalysisId: 'soa-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid study type');
  });

  it('throws for empty name', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: '  ',
        type: 'STANDALONE',
        soaAnalysisId: 'soa-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('name is required');
  });

  it('throws for missing project', async () => {
    const prisma = makePrisma({ project: null });
    const useCase = new CreateStudyUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'missing',
        name: 'Study',
        type: 'STANDALONE',
        soaAnalysisId: 'soa-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws for missing SOA', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new CreateStudyUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'Study',
        type: 'STANDALONE',
        soaAnalysisId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when SOA is not locked', async () => {
    const prisma = makePrisma({
      soa: { id: 'soa-1', status: 'DRAFT', projectId: 'proj-1' },
    });
    const useCase = new CreateStudyUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'Study',
        type: 'STANDALONE',
        soaAnalysisId: 'soa-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('must be locked');
  });

  it('throws when SOA belongs to different project', async () => {
    const prisma = makePrisma({
      soa: { id: 'soa-1', status: 'LOCKED', projectId: 'other-proj' },
    });
    const useCase = new CreateStudyUseCase(prisma);

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        name: 'Study',
        type: 'STANDALONE',
        soaAnalysisId: 'soa-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('does not belong');
  });

  it('handles SOA with no benchmarks', async () => {
    const prisma = makePrisma({ soaBenchmarks: [] });
    const useCase = new CreateStudyUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'Study',
      type: 'STANDALONE',
      soaAnalysisId: 'soa-1',
      userId: 'user-1',
    });

    expect(result.benchmarkCount).toBe(0);
  });

  it('creates study without SOA link', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: 'Standalone Study',
      type: 'STANDALONE',
      userId: 'user-1',
    });

    expect(result.validationStudyId).toBeDefined();
    expect(result.name).toBe('Standalone Study');
    expect(result.soaAnalysisId).toBeUndefined();
    expect(result.benchmarkCount).toBe(0);
    expect(prisma.soaAnalysis.findUnique).not.toHaveBeenCalled();
    expect(prisma.acceptanceCriterion.create).not.toHaveBeenCalled();
  });

  it('trims the study name', async () => {
    const prisma = makePrisma();
    const useCase = new CreateStudyUseCase(prisma);

    const result = await useCase.execute({
      projectId: 'proj-1',
      name: '  My Study  ',
      type: 'STANDALONE',
      soaAnalysisId: 'soa-1',
      userId: 'user-1',
    });

    expect(result.name).toBe('My Study');
  });
});
