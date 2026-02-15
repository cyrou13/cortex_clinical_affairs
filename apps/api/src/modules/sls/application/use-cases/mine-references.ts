import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class MineReferencesUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly enqueueJob: (queue: string, data: Record<string, unknown>) => Promise<string>,
  ) {}

  async execute(input: { sessionId: string; articleIds: string[]; userId: string }) {
    const { sessionId, articleIds, userId } = input;

    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Validate articles exist and have PDFs
    const articles = await this.prisma.article.findMany({
      where: {
        id: { in: articleIds },
        sessionId,
        pdfStorageKey: { not: null },
      },
      select: { id: true },
    });

    if (articles.length === 0) {
      throw new ValidationError('No articles with PDFs found for reference mining');
    }

    const validArticleIds = articles.map((a: { id: string }) => a.id);

    // Create async task
    const task = await this.prisma.asyncTask.create({
      data: {
        type: 'sls:mine-references',
        status: 'PENDING',
        createdBy: userId,
        metadata: { sessionId, articleCount: validArticleIds.length },
      },
    });

    // Enqueue BullMQ job
    await this.enqueueJob('sls:mine-references', {
      sessionId,
      taskId: task.id,
      userId,
      articleIds: validArticleIds,
    });

    return {
      taskId: task.id,
      articleCount: validArticleIds.length,
    };
  }
}
