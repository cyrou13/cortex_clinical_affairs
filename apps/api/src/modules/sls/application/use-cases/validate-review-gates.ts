import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

export interface ReviewGateStatus {
  allArticlesReviewed: { met: boolean; reviewed: number; total: number };
  likelyRelevantSpotChecked: { met: boolean; checked: number; required: number; total: number };
  likelyIrrelevantSpotChecked: { met: boolean; checked: number; required: number; total: number };
  allGatesMet: boolean;
}

export class ValidateReviewGatesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    sessionId: string,
    thresholds?: {
      likelyRelevantPercentage?: number;
      likelyIrrelevantPercentage?: number;
    },
  ): Promise<ReviewGateStatus> {
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    const likelyRelevantPct = thresholds?.likelyRelevantPercentage ?? 0.10;
    const likelyIrrelevantPct = thresholds?.likelyIrrelevantPercentage ?? 0.05;

    // Count articles by status
    const articles = await (this.prisma as any).article.findMany({
      where: { sessionId },
      select: { id: true, status: true, relevanceScore: true },
    });

    const totalArticles = articles.length;
    const pendingArticles = articles.filter(
      (a: { status: string }) => a.status === 'PENDING' || a.status === 'SCORED',
    );
    const reviewedArticles = totalArticles - pendingArticles.length;

    // Gate 1: All articles must have a human decision
    const allArticlesReviewed = {
      met: pendingArticles.length === 0,
      reviewed: reviewedArticles,
      total: totalArticles,
    };

    // Gate 2: Likely relevant spot-checked
    const likelyRelevant = articles.filter(
      (a: { relevanceScore: number | null }) =>
        a.relevanceScore !== null && a.relevanceScore >= (session.likelyRelevantThreshold ?? 75),
    );
    const likelyRelevantRequired = Math.ceil(likelyRelevant.length * likelyRelevantPct);

    // Count spot-checks for likely relevant
    const likelyRelevantIds = likelyRelevant.map((a: { id: string }) => a.id);
    const likelyRelevantSpotChecks = likelyRelevantIds.length > 0
      ? await (this.prisma as any).screeningDecision.count({
          where: {
            articleId: { in: likelyRelevantIds },
            decision: { not: 'SKIPPED' },
          },
        })
      : 0;

    const likelyRelevantSpotChecked = {
      met: likelyRelevantSpotChecks >= likelyRelevantRequired,
      checked: likelyRelevantSpotChecks,
      required: likelyRelevantRequired,
      total: likelyRelevant.length,
    };

    // Gate 3: Likely irrelevant spot-checked
    const likelyIrrelevant = articles.filter(
      (a: { relevanceScore: number | null }) =>
        a.relevanceScore !== null && a.relevanceScore < (session.uncertainLowerThreshold ?? 40),
    );
    const likelyIrrelevantRequired = Math.ceil(likelyIrrelevant.length * likelyIrrelevantPct);

    const likelyIrrelevantIds = likelyIrrelevant.map((a: { id: string }) => a.id);
    const likelyIrrelevantSpotChecks = likelyIrrelevantIds.length > 0
      ? await (this.prisma as any).screeningDecision.count({
          where: {
            articleId: { in: likelyIrrelevantIds },
            decision: { not: 'SKIPPED' },
          },
        })
      : 0;

    const likelyIrrelevantSpotChecked = {
      met: likelyIrrelevantSpotChecks >= likelyIrrelevantRequired,
      checked: likelyIrrelevantSpotChecks,
      required: likelyIrrelevantRequired,
      total: likelyIrrelevant.length,
    };

    return {
      allArticlesReviewed,
      likelyRelevantSpotChecked,
      likelyIrrelevantSpotChecked,
      allGatesMet:
        allArticlesReviewed.met &&
        likelyRelevantSpotChecked.met &&
        likelyIrrelevantSpotChecked.met,
    };
  }
}
