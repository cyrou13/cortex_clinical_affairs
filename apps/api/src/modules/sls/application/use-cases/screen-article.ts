import type { PrismaClient, Prisma } from '@prisma/client';
import { ScreenArticleInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { validateTransition } from '../../domain/entities/article.js';
import type { ArticleStatusEnum } from '@cortex/shared';

export class ScreenArticleUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: unknown, userId: string) {
    const parsed = ScreenArticleInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { articleId, decision, exclusionCodeId, reason } = parsed.data;

    // Validate exclusion code required for EXCLUDED
    if (decision === 'EXCLUDED' && !exclusionCodeId) {
      throw new ValidationError('Exclusion code is required when excluding an article');
    }

    // Fetch article
    const article = await (this.prisma as any).article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Validate session is not LOCKED
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: article.sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', article.sessionId);
    }

    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot screen articles: session is locked');
    }

    // Map decision to target article status
    const newStatus = decision as ArticleStatusEnum;

    // Validate lifecycle transition
    if (!validateTransition(article.status as ArticleStatusEnum, newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${article.status} to ${newStatus}`,
      );
    }

    // Determine if this is an AI override
    const isAiOverride = this.detectAiOverride(article, decision);

    // Update article status
    const updatedArticle = await (this.prisma as any).article.update({
      where: { id: articleId },
      data: { status: newStatus },
    });

    // Create screening decision record
    await (this.prisma as any).screeningDecision.create({
      data: {
        articleId,
        userId,
        decision,
        exclusionCodeId: exclusionCodeId ?? null,
        reason,
        isAiOverride,
        previousStatus: article.status,
        newStatus,
      },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.article.screened',
        targetType: 'article',
        targetId: articleId,
        before: { status: article.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: newStatus,
          decision,
          exclusionCodeId: exclusionCodeId ?? null,
          reason,
          isAiOverride,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return updatedArticle;
  }

  private detectAiOverride(
    article: { aiCategory: string | null; relevanceScore: number | null },
    decision: string,
  ): boolean {
    if (!article.aiCategory) return false;

    // AI said likely_irrelevant but user includes
    if (article.aiCategory === 'likely_irrelevant' && decision === 'INCLUDED') {
      return true;
    }

    // AI said likely_relevant but user excludes
    if (article.aiCategory === 'likely_relevant' && decision === 'EXCLUDED') {
      return true;
    }

    return false;
  }
}
