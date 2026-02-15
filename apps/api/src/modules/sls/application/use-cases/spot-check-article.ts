import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class SpotCheckArticleUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: {
    articleId: string;
    userId: string;
    agrees: boolean;
    correctedDecision?: 'INCLUDED' | 'EXCLUDED';
    exclusionCodeId?: string;
    reason: string;
  }) {
    const { articleId, userId, agrees, correctedDecision, exclusionCodeId, reason } = input;

    // Fetch article
    const article = await (this.prisma as any).article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Validate session not locked
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: article.sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', article.sessionId);
    }

    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot spot-check articles: session is locked');
    }

    if (agrees) {
      // Log agreement — create screening decision with isSpotCheck indicator
      await (this.prisma as any).screeningDecision.create({
        data: {
          articleId,
          userId,
          decision: article.status, // agree with current status
          reason: reason || 'Agrees with AI decision',
          isAiOverride: false,
          previousStatus: article.status,
          newStatus: article.status,
        },
      });

      return { action: 'agreed', articleId };
    }

    // Override: apply corrected decision
    if (!correctedDecision) {
      throw new ValidationError('Corrected decision is required when overriding');
    }

    if (correctedDecision === 'EXCLUDED' && !exclusionCodeId) {
      throw new ValidationError('Exclusion code is required when excluding');
    }

    // Update article status
    await (this.prisma as any).article.update({
      where: { id: articleId },
      data: { status: correctedDecision },
    });

    // Create screening decision with override
    await (this.prisma as any).screeningDecision.create({
      data: {
        articleId,
        userId,
        decision: correctedDecision,
        exclusionCodeId: exclusionCodeId ?? null,
        reason,
        isAiOverride: true,
        previousStatus: article.status,
        newStatus: correctedDecision,
      },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.article.spotCheckOverride',
        targetType: 'article',
        targetId: articleId,
        before: { status: article.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: correctedDecision,
          exclusionCodeId,
          reason,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { action: 'overridden', articleId, newStatus: correctedDecision };
  }
}
