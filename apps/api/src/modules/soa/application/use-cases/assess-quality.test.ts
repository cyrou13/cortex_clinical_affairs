import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessQualityUseCase } from './assess-quality.js';

function makePrisma(overrides?: {
  soaAnalysis?: Record<string, unknown> | null;
  links?: Array<Record<string, unknown>>;
  article?: Record<string, unknown> | null;
  assessments?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.soaAnalysis !== undefined
            ? overrides.soaAnalysis
            : { id: 'soa-1', status: 'IN_PROGRESS' },
        ),
    },
    soaSlsLink: {
      findMany: vi.fn().mockResolvedValue(overrides?.links ?? [{ slsSessionId: 'sess-1' }]),
    },
    article: {
      findFirst: vi
        .fn()
        .mockResolvedValue(overrides?.article !== undefined ? overrides.article : { id: 'art-1' }),
    },
    qualityAssessment: {
      create: vi.fn().mockResolvedValue({ id: 'qa-1' }),
      findMany: vi.fn().mockResolvedValue(overrides?.assessments ?? []),
    },
  } as any;
}

const validInput = {
  soaAnalysisId: 'soa-1',
  articleId: 'art-1',
  assessmentType: 'QUADAS_2',
  assessmentData: { domain1: 'LOW_RISK', domain2: 'HIGH_RISK' },
  dataContributionLevel: 'PIVOTAL',
  userId: 'user-1',
};

describe('AssessQualityUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates quality assessment with valid input', async () => {
    const prisma = makePrisma();
    const useCase = new AssessQualityUseCase(prisma);

    const result = await useCase.execute(validInput);

    expect(result.qualityAssessmentId).toBeTruthy();
    expect(result.assessmentType).toBe('QUADAS_2');
    expect(result.dataContributionLevel).toBe('PIVOTAL');
    expect(prisma.qualityAssessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          soaAnalysisId: 'soa-1',
          articleId: 'art-1',
          assessmentType: 'QUADAS_2',
          dataContributionLevel: 'PIVOTAL',
        }),
      }),
    );
  });

  it('throws for invalid assessment type', async () => {
    const prisma = makePrisma();
    const useCase = new AssessQualityUseCase(prisma);

    await expect(
      useCase.execute({ ...validInput, assessmentType: 'INVALID_TYPE' }),
    ).rejects.toThrow('Invalid assessment type');
  });

  it('throws for invalid data contribution level', async () => {
    const prisma = makePrisma();
    const useCase = new AssessQualityUseCase(prisma);

    await expect(
      useCase.execute({ ...validInput, dataContributionLevel: 'INVALID_LEVEL' }),
    ).rejects.toThrow('Invalid data contribution level');
  });

  it('throws for missing SOA analysis', async () => {
    const prisma = makePrisma({ soaAnalysis: null });
    const useCase = new AssessQualityUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('throws for locked SOA analysis', async () => {
    const prisma = makePrisma({
      soaAnalysis: { id: 'soa-1', status: 'LOCKED' },
    });
    const useCase = new AssessQualityUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('locked');
  });

  it('throws for article not found in linked sessions', async () => {
    const prisma = makePrisma({ article: null });
    const useCase = new AssessQualityUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('accepts INTERNAL_READING_GRID assessment type', async () => {
    const prisma = makePrisma();
    const useCase = new AssessQualityUseCase(prisma);

    const result = await useCase.execute({
      ...validInput,
      assessmentType: 'INTERNAL_READING_GRID',
      dataContributionLevel: 'SUPPORTIVE',
    });

    expect(result.assessmentType).toBe('INTERNAL_READING_GRID');
    expect(result.dataContributionLevel).toBe('SUPPORTIVE');
  });

  it('returns combined summary with correct counts', async () => {
    const assessments = [
      { assessmentType: 'QUADAS_2', dataContributionLevel: 'PIVOTAL' },
      { assessmentType: 'QUADAS_2', dataContributionLevel: 'SUPPORTIVE' },
      { assessmentType: 'INTERNAL_READING_GRID', dataContributionLevel: 'PIVOTAL' },
      { assessmentType: 'INTERNAL_READING_GRID', dataContributionLevel: 'BACKGROUND' },
    ];
    const prisma = makePrisma({ assessments });
    const useCase = new AssessQualityUseCase(prisma);

    const summary = await useCase.getCombinedSummary('soa-1');

    expect(summary.totalAssessments).toBe(4);
    expect(summary.quadas2Count).toBe(2);
    expect(summary.readingGridCount).toBe(2);
    expect(summary.contributionLevels.pivotal).toBe(2);
    expect(summary.contributionLevels.supportive).toBe(1);
    expect(summary.contributionLevels.background).toBe(1);
  });

  it('returns empty summary for no assessments', async () => {
    const prisma = makePrisma({ assessments: [] });
    const useCase = new AssessQualityUseCase(prisma);

    const summary = await useCase.getCombinedSummary('soa-1');

    expect(summary.totalAssessments).toBe(0);
    expect(summary.quadas2Count).toBe(0);
    expect(summary.readingGridCount).toBe(0);
    expect(summary.contributionLevels.pivotal).toBe(0);
    expect(summary.contributionLevels.supportive).toBe(0);
    expect(summary.contributionLevels.background).toBe(0);
  });

  it('throws for missing SOA in combined summary', async () => {
    const prisma = makePrisma({ soaAnalysis: null });
    const useCase = new AssessQualityUseCase(prisma);

    await expect(useCase.getCombinedSummary('soa-1')).rejects.toThrow('not found');
  });
});
