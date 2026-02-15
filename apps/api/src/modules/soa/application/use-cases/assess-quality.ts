import type { PrismaClient } from '@prisma/client';
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

    const soaAnalysis = await (this.prisma as any).soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true },
    });

    if (!soaAnalysis) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soaAnalysis.status === 'LOCKED') {
      throw new ValidationError('Cannot assess quality on a locked SOA analysis');
    }

    const links = await (this.prisma as any).soaSlsLink.findMany({
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

    await (this.prisma as any).qualityAssessment.create({
      data: {
        id: qualityAssessmentId,
        soaAnalysisId: input.soaAnalysisId,
        articleId: input.articleId,
        assessmentType: input.assessmentType,
        assessmentData: input.assessmentData,
        dataContributionLevel: input.dataContributionLevel,
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
}
