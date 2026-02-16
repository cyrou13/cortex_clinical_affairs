import type {
  Prisma,
  PrismaClient,
  QualityAssessmentType,
  DataContributionLevel as PrismaDataContributionLevel,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

const ASSESSMENT_TYPES = ['QUADAS_2', 'INTERNAL_READING_GRID'] as const;
type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

const DATA_CONTRIBUTION_LEVELS = ['PIVOTAL', 'SUPPORTIVE', 'BACKGROUND'] as const;
type DataContributionLevel = (typeof DATA_CONTRIBUTION_LEVELS)[number];

interface AssessQualityInput {
  soaAnalysisId: string;
  articleId: string;
  assessmentType: string;
  assessmentData: Record<string, unknown>;
  dataContributionLevel: string;
  userId: string;
}

interface AssessQualityResult {
  qualityAssessmentId: string;
  assessmentType: AssessmentType;
  dataContributionLevel: DataContributionLevel;
}

interface QualitySummary {
  totalAssessments: number;
  quadas2Count: number;
  readingGridCount: number;
  contributionLevels: {
    pivotal: number;
    supportive: number;
    background: number;
  };
}

export class AssessQualityUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: AssessQualityInput): Promise<AssessQualityResult> {
    if (!ASSESSMENT_TYPES.includes(input.assessmentType as AssessmentType)) {
      throw new ValidationError(
        `Invalid assessment type: ${input.assessmentType}. Must be one of: ${ASSESSMENT_TYPES.join(', ')}`,
      );
    }

    if (!DATA_CONTRIBUTION_LEVELS.includes(input.dataContributionLevel as DataContributionLevel)) {
      throw new ValidationError(
        `Invalid data contribution level: ${input.dataContributionLevel}. Must be one of: ${DATA_CONTRIBUTION_LEVELS.join(', ')}`,
      );
    }

    const soaAnalysis = await this.prisma.soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true },
    });

    if (!soaAnalysis) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soaAnalysis.status === 'LOCKED') {
      throw new ValidationError('Cannot assess quality on a locked SOA analysis');
    }

    const links = await this.prisma.soaSlsLink.findMany({
      where: { soaAnalysisId: input.soaAnalysisId },
      select: { slsSessionId: true },
    });

    const sessionIds = links.map((l: { slsSessionId: string }) => l.slsSessionId);

    const article = await this.prisma.article.findFirst({
      where: {
        id: input.articleId,
        sessionId: { in: sessionIds },
      },
      select: { id: true },
    });

    if (!article) {
      throw new NotFoundError('Article', input.articleId);
    }

    const qualityAssessmentId = crypto.randomUUID();

    await this.prisma.qualityAssessment.create({
      data: {
        id: qualityAssessmentId,
        soaAnalysisId: input.soaAnalysisId,
        articleId: input.articleId,
        assessmentType: input.assessmentType as QualityAssessmentType,
        assessmentData: input.assessmentData as Prisma.InputJsonValue,
        dataContributionLevel: input.dataContributionLevel as PrismaDataContributionLevel,
        assessedById: input.userId,
        assessedAt: new Date().toISOString(),
      },
    });

    return {
      qualityAssessmentId,
      assessmentType: input.assessmentType as AssessmentType,
      dataContributionLevel: input.dataContributionLevel as DataContributionLevel,
    };
  }

  async getCombinedSummary(soaAnalysisId: string): Promise<QualitySummary> {
    const soaAnalysis = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soaAnalysis) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const assessments = await this.prisma.qualityAssessment.findMany({
      where: { soaAnalysisId },
      select: {
        assessmentType: true,
        dataContributionLevel: true,
      },
    });

    const summary: QualitySummary = {
      totalAssessments: assessments.length,
      quadas2Count: 0,
      readingGridCount: 0,
      contributionLevels: {
        pivotal: 0,
        supportive: 0,
        background: 0,
      },
    };

    for (const assessment of assessments) {
      if (assessment.assessmentType === 'QUADAS_2') {
        summary.quadas2Count++;
      } else if (assessment.assessmentType === 'INTERNAL_READING_GRID') {
        summary.readingGridCount++;
      }

      if (assessment.dataContributionLevel === 'PIVOTAL') {
        summary.contributionLevels.pivotal++;
      } else if (assessment.dataContributionLevel === 'SUPPORTIVE') {
        summary.contributionLevels.supportive++;
      } else if (assessment.dataContributionLevel === 'BACKGROUND') {
        summary.contributionLevels.background++;
      }
    }

    return summary;
  }
}
