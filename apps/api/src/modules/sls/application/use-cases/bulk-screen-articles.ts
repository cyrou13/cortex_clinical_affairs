import type { PrismaClient, Prisma } from '@prisma/client';
import { BulkScreenArticlesInput } from '@cortex/shared';
import { ValidationError } from '../../../../shared/errors/index.js';
import { validateTransition } from '../../domain/entities/article.js';
import type { ArticleStatusEnum } from '@cortex/shared';

export class BulkScreenArticlesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(sessionId: string, input: unknown, userId: string) {
    const parsed = BulkScreenArticlesInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { articleIds, decision, exclusionCodeId, reason } = parsed.data;

    // Validate exclusion code required for EXCLUDED
    if (decision === 'EXCLUDED' && !exclusionCodeId) {
      throw new ValidationError('Exclusion code is required when excluding articles');
    }

    // Validate session is not LOCKED
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ValidationError('Session not found');
    }

    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot screen articles: session is locked');
    }

    // Fetch all articles
    const articles = await this.prisma.article.findMany({
      where: {
        id: { in: articleIds },
        sessionId,
      },
    });

    if (articles.length === 0) {
      throw new ValidationError('No valid articles found in session');
    }

    const newStatus = decision as ArticleStatusEnum;
    let successCount = 0;
    const screeningDecisions: Array<{
      articleId: string;
      userId: string;
      decision: string;
      exclusionCodeId: string | null;
      reason: string;
      isAiOverride: boolean;
      previousStatus: string;
      newStatus: string;
    }> = [];

    // Validate transitions and prepare updates
    for (const article of articles) {
      if (!validateTransition(article.status as ArticleStatusEnum, newStatus)) {
        continue; // Skip invalid transitions
      }

      const isAiOverride = this.detectAiOverride(article, decision);

      screeningDecisions.push({
        articleId: article.id,
        userId,
        decision,
        exclusionCodeId: exclusionCodeId ?? null,
        reason,
        isAiOverride,
        previousStatus: article.status,
        newStatus,
      });

      successCount++;
    }

    if (successCount === 0) {
      throw new ValidationError('No articles can transition to the requested status');
    }

    // Batch update articles + create screening decisions in transaction
    const validArticleIds = screeningDecisions.map((d) => d.articleId);

    await this.prisma.article.updateMany({
      where: { id: { in: validArticleIds } },
      data: { status: newStatus },
    });

    await this.prisma.screeningDecision.createMany({
      data: screeningDecisions,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.articles.bulkScreened',
        targetType: 'slsSession',
        targetId: sessionId,
        after: {
          decision,
          articleCount: successCount,
          totalRequested: articleIds.length,
          exclusionCodeId: exclusionCodeId ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { successCount, totalRequested: articleIds.length };
  }

  private detectAiOverride(
    article: { aiCategory: string | null },
    decision: string,
  ): boolean {
    if (!article.aiCategory) return false;
    if (article.aiCategory === 'likely_irrelevant' && decision === 'INCLUDED') return true;
    if (article.aiCategory === 'likely_relevant' && decision === 'EXCLUDED') return true;
    return false;
  }
}
