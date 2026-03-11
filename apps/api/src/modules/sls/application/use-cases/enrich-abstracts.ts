import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

const SHORT_ABSTRACT_THRESHOLD = 300;

export class EnrichAbstractsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly enqueueJob: (queue: string, data: Record<string, unknown>) => Promise<string>,
  ) {}

  async execute(input: { sessionId: string; userId: string }) {
    const { sessionId, userId } = input;

    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Count articles needing enrichment
    const allArticles = await this.prisma.article.findMany({
      where: { sessionId },
      select: { id: true, abstract: true },
    });

    const needsEnrichment = allArticles.filter(
      (a) => !a.abstract || a.abstract.length < SHORT_ABSTRACT_THRESHOLD,
    );

    if (needsEnrichment.length === 0) {
      throw new ValidationError('All articles already have full abstracts');
    }

    // Create async task
    const task = await this.prisma.asyncTask.create({
      data: {
        type: 'sls.enrich-abstracts',
        status: 'PENDING',
        createdBy: userId,
        metadata: { sessionId, articleCount: needsEnrichment.length },
      },
    });

    // Enqueue job
    await this.enqueueJob('sls.enrich-abstracts', {
      sessionId,
      taskId: task.id,
      userId,
    });

    return {
      taskId: task.id,
      articleCount: needsEnrichment.length,
    };
  }
}
