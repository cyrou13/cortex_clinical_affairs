import type { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  LockConflictError,
  ValidationError,
} from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createSoaLockedEvent } from '../../domain/events/soa-locked.js';

interface LockSoaInput {
  soaAnalysisId: string;
  userId: string;
}

interface LockSoaResult {
  soaAnalysisId: string;
  lockedAt: string;
  sectionCount: number;
}

export class LockSoaUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Validate all pre-lock conditions per Story 3.11 specification.
   * Throws ValidationError with detailed message if any check fails.
   */
  private async validatePreLockConditions(soaAnalysisId: string, soaType: string): Promise<void> {
    const blockers: string[] = [];

    // Check 1: All thematic sections must be FINALIZED
    const sections = await this.prisma.thematicSection.findMany({
      where: { soaAnalysisId },
      select: { id: true, status: true, title: true },
    });

    const nonFinalizedSections = sections.filter(
      (s: { status: string }) => s.status !== 'FINALIZED',
    );

    if (nonFinalizedSections.length > 0) {
      const titles = nonFinalizedSections.map((s: { title: string }) => s.title).join(', ');
      blockers.push(`${nonFinalizedSections.length} section(s) not finalized: ${titles}`);
    }

    // Check 2: All extraction grids must have reviewed articles
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

    for (const grid of grids) {
      const reviewedCells = grid.cells.filter(
        (cell: { validationStatus: string }) => cell.validationStatus !== 'PENDING',
      );
      if (grid.cells.length > 0 && reviewedCells.length === 0) {
        blockers.push(`Extraction grid "${grid.name}" has no reviewed articles`);
      }
    }

    // Check 3: All claims must have at least one article link (100% traceability)
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

    const unlinkedClaims = claims.filter(
      (claim: { claimArticleLinks: unknown[] }) => claim.claimArticleLinks.length === 0,
    );

    if (unlinkedClaims.length > 0) {
      blockers.push(
        `${unlinkedClaims.length} claim(s) have no supporting articles (traceability requirement)`,
      );
    }

    // Check 4: Quality assessment must be complete for all articles
    const soaArticles = await (this.prisma as any).soaSlsLink.findMany({
      where: { soaAnalysisId },
      select: {
        slsSessionId: true,
      },
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
          blockers.push(`${unassessedCount} article(s) missing quality assessment`);
        }
      }
    }

    // Check 5: If Clinical SOA, Section 6 must have at least one similar device
    if (soaType === 'CLINICAL' || soaType === 'SOA_CLINICAL') {
      const similarDevices = await this.prisma.similarDevice.findMany({
        where: { soaAnalysisId },
        select: { id: true },
      });

      if (similarDevices.length === 0) {
        blockers.push('Clinical SOA requires at least one similar device in Section 6');
      }
    }

    // Check 6: No active async tasks for this SOA
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
      blockers.push(`${activeTasks.length} active async task(s) in progress: ${taskTypes}`);
    }

    // If any blockers found, throw ValidationError with all issues
    if (blockers.length > 0) {
      throw new ValidationError(
        `Cannot lock SOA. Resolve the following issues:\n- ${blockers.join('\n- ')}`,
      );
    }
  }

  async execute(input: LockSoaInput): Promise<LockSoaResult> {
    const { soaAnalysisId, userId } = input;

    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true, status: true, projectId: true, type: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    if (soa.status === 'LOCKED') {
      throw new LockConflictError('SoaAnalysis', soaAnalysisId);
    }

    // Run all pre-lock validation checks
    await this.validatePreLockConditions(soaAnalysisId, soa.type);

    // Get counts for the result
    const sectionCount = await this.prisma.thematicSection.count({
      where: { soaAnalysisId },
    });

    const claimCount = await this.prisma.claim.count({
      where: { soaAnalysisId },
    });

    const now = new Date();

    await this.prisma.soaAnalysis.update({
      where: { id: soaAnalysisId },
      data: {
        status: 'LOCKED',
        lockedAt: now,
        lockedById: userId,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'soa.analysis.locked',
        targetType: 'soaAnalysis',
        targetId: soaAnalysisId,
        before: { status: soa.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: 'LOCKED',
          sectionCount,
          claimCount,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Emit domain event
    const event = createSoaLockedEvent(
      {
        soaAnalysisId,
        projectId: soa.projectId,
        sectionCount,
        claimCount,
      },
      userId,
      crypto.randomUUID(),
    );

    void this.eventBus.publish(event);

    return {
      soaAnalysisId,
      lockedAt: now.toISOString(),
      sectionCount,
    };
  }
}
