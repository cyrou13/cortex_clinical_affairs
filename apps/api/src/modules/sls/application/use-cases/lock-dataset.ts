import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, LockConflictError, ValidationError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createDatasetLockedEvent } from '../../domain/events/dataset-locked.js';
import { GeneratePrismaUseCase } from './generate-prisma.js';
import { ValidateReviewGatesUseCase } from './validate-review-gates.js';

export class LockDatasetUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { sessionId: string; userId: string }) {
    const { sessionId, userId } = input;

    // Fetch session
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Check not already locked
    if (session.status === 'LOCKED') {
      throw new LockConflictError('SlsSession', sessionId);
    }

    // Check no PENDING articles
    const pendingCount = await (this.prisma as any).article.count({
      where: {
        sessionId,
        status: { in: ['PENDING', 'SCORED'] },
      },
    });

    if (pendingCount > 0) {
      throw new ValidationError(
        `Cannot lock dataset: ${pendingCount} article(s) still pending review`,
      );
    }

    // Validate review gates
    const gateValidator = new ValidateReviewGatesUseCase(this.prisma);
    const gateStatus = await gateValidator.execute(sessionId);

    if (!gateStatus.allGatesMet) {
      const unmetGates: string[] = [];
      if (!gateStatus.allArticlesReviewed.met) unmetGates.push('All articles reviewed');
      if (!gateStatus.likelyRelevantSpotChecked.met) unmetGates.push('Likely Relevant spot-checked');
      if (!gateStatus.likelyIrrelevantSpotChecked.met) unmetGates.push('Likely Irrelevant spot-checked');
      throw new ValidationError(
        `Cannot lock dataset: review gates not met (${unmetGates.join(', ')})`,
      );
    }

    // Generate PRISMA statistics
    const prismaGenerator = new GeneratePrismaUseCase(this.prisma);
    const prismaStatistics = await prismaGenerator.execute(sessionId);

    // Lock the session
    const now = new Date();
    await (this.prisma as any).slsSession.update({
      where: { id: sessionId },
      data: {
        status: 'LOCKED',
        lockedAt: now,
        lockedById: userId,
        prismaStatistics: prismaStatistics as unknown as Prisma.InputJsonValue,
      },
    });

    // Count articles for event
    const articleCounts = await (this.prisma as any).article.groupBy({
      by: ['status'],
      where: { sessionId },
      _count: true,
    });

    const includedCount = articleCounts
      .filter((g: { status: string }) => g.status === 'INCLUDED' || g.status === 'FINAL_INCLUDED')
      .reduce((sum: number, g: { _count: number }) => sum + g._count, 0);
    const totalCount = articleCounts.reduce(
      (sum: number, g: { _count: number }) => sum + g._count,
      0,
    );

    // Emit domain event
    const event = createDatasetLockedEvent(
      {
        sessionId,
        projectId: session.projectId,
        articleCount: totalCount,
        includedCount,
        excludedCount: totalCount - includedCount,
      },
      userId,
      crypto.randomUUID(),
    );

    void this.eventBus.publish(event);

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.dataset.locked',
        targetType: 'slsSession',
        targetId: sessionId,
        before: { status: session.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: 'LOCKED',
          includedCount,
          excludedCount: totalCount - includedCount,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      sessionId,
      lockedAt: now.toISOString(),
      includedCount,
      excludedCount: totalCount - includedCount,
      totalArticles: totalCount,
      prismaStatistics,
    };
  }
}
