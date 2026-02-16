import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface GetSoaLockReadinessInput {
  soaAnalysisId: string;
}

interface SoaLockReadinessResult {
  canLock: boolean;
  blockers: string[];
  summary: {
    sectionCount: number;
    finalizedSections: number;
    articleCount: number;
    reviewedArticles: number;
    claimCount: number;
    linkedClaims: number;
    traceabilityPercentage: number;
    similarDeviceCount: number;
    activeTaskCount: number;
  };
}

export class GetSoaLockReadinessUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: GetSoaLockReadinessInput): Promise<SoaLockReadinessResult> {
    const { soaAnalysisId } = input;

    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true, status: true, type: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const blockers: string[] = [];

    // Check if already locked
    if (soa.status === 'LOCKED') {
      blockers.push('SOA is already locked');
    }

    // Check sections
    const sections = await this.prisma.thematicSection.findMany({
      where: { soaAnalysisId },
      select: { id: true, status: true, title: true },
    });

    const finalizedSections = sections.filter((s) => s.status === 'FINALIZED');
    const nonFinalizedSections = sections.filter((s) => s.status !== 'FINALIZED');

    if (nonFinalizedSections.length > 0) {
      for (const section of nonFinalizedSections) {
        blockers.push(`Section "${section.title}" is not finalized`);
      }
    }

    // Check extraction grids
    const grids = await this.prisma.extractionGrid.findMany({
      where: { soaAnalysisId },
      select: {
        id: true,
        name: true,
        cells: {
          select: { id: true, validationStatus: true },
        },
      },
    });

    let totalArticles = 0;
    let reviewedArticles = 0;

    for (const grid of grids) {
      const articleIds = new Set(grid.cells.map((cell: { id: string }) => cell.id));
      totalArticles += articleIds.size;

      const reviewed = grid.cells.filter(
        (cell: { validationStatus: string }) => cell.validationStatus !== 'PENDING',
      );
      reviewedArticles += reviewed.length;

      if (grid.cells.length > 0 && reviewed.length === 0) {
        blockers.push(`Extraction grid "${grid.name}" has no reviewed articles`);
      }
    }

    // Check claims traceability
    const claims = await this.prisma.claim.findMany({
      where: { soaAnalysisId },
      select: {
        id: true,
        statementText: true,
        claimArticleLinks: {
          select: { id: true },
        },
      },
    });

    const linkedClaims = claims.filter((claim) => claim.claimArticleLinks.length > 0);
    const unlinkedClaims = claims.filter((claim) => claim.claimArticleLinks.length === 0);

    if (unlinkedClaims.length > 0) {
      blockers.push(`${unlinkedClaims.length} claims have no article links`);
    }

    const traceabilityPercentage =
      claims.length > 0 ? Math.round((linkedClaims.length / claims.length) * 100) : 100;

    // Check quality assessments
    const soaArticles = await (this.prisma as any).soaSlsLink.findMany({
      where: { soaAnalysisId },
      select: { slsSessionId: true },
    });

    if (soaArticles.length > 0) {
      const slsSessionIds = soaArticles.map((link: { slsSessionId: string }) => link.slsSessionId);

      const articles = await this.prisma.article.findMany({
        where: {
          sessionId: { in: slsSessionIds },
          status: { in: ['FINAL_INCLUDED', 'INCLUDED'] },
        },
        select: { id: true },
      });

      const articleIds = articles.map((a: { id: string }) => a.id);

      if (articleIds.length > 0) {
        const qualityAssessments = await this.prisma.qualityAssessment.findMany({
          where: { soaAnalysisId, articleId: { in: articleIds } },
          select: { articleId: true },
        });

        const assessedArticleIds = new Set(
          qualityAssessments.map((qa: { articleId: string }) => qa.articleId),
        );

        const unassessedCount = articleIds.length - assessedArticleIds.size;
        if (unassessedCount > 0) {
          blockers.push(`${unassessedCount} articles missing quality assessment`);
        }
      }
    }

    // Check similar devices for Clinical SOA
    const similarDevices = await this.prisma.similarDevice.findMany({
      where: { soaAnalysisId },
      select: { id: true },
    });

    if ((soa.type === 'CLINICAL' || soa.type === 'SOA_CLINICAL') && similarDevices.length === 0) {
      blockers.push('Clinical SOA requires at least one similar device in Section 6');
    }

    // Check active async tasks
    const activeTasks = await this.prisma.asyncTask.findMany({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
        metadata: {
          path: ['soaAnalysisId'],
          equals: soaAnalysisId,
        },
      },
      select: { id: true, type: true },
    });

    if (activeTasks.length > 0) {
      const taskTypes = activeTasks.map((t: { type: string }) => t.type).join(', ');
      blockers.push(`${activeTasks.length} active async tasks in progress: ${taskTypes}`);
    }

    return {
      canLock: blockers.length === 0 && soa.status !== 'LOCKED',
      blockers,
      summary: {
        sectionCount: sections.length,
        finalizedSections: finalizedSections.length,
        articleCount: totalArticles,
        reviewedArticles,
        claimCount: claims.length,
        linkedClaims: linkedClaims.length,
        traceabilityPercentage,
        similarDeviceCount: similarDevices.length,
        activeTaskCount: activeTasks.length,
      },
    };
  }
}
