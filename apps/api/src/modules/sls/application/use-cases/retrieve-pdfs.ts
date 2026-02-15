import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class RetrievePdfsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly enqueueJob: (queue: string, data: Record<string, unknown>) => Promise<string>,
  ) {}

  async execute(input: { sessionId: string; userId: string }) {
    const { sessionId, userId } = input;

    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Get included articles without PDFs
    const articles = await (this.prisma as any).article.findMany({
      where: {
        sessionId,
        status: { in: ['INCLUDED', 'FINAL_INCLUDED'] },
        pdfStatus: { in: ['NONE', null] },
      },
      select: { id: true },
    });

    if (articles.length === 0) {
      throw new ValidationError('No articles need PDF retrieval');
    }

    const articleIds = articles.map((a: { id: string }) => a.id);

    // Create async task
    const task = await this.prisma.asyncTask.create({
      data: {
        type: 'sls:retrieve-pdfs',
        status: 'PENDING',
        createdById: userId,
        metadata: { sessionId, articleCount: articleIds.length },
      },
    });

    // Enqueue job
    await this.enqueueJob('sls:retrieve-pdfs', {
      sessionId,
      taskId: task.id,
      userId,
      articleIds,
    });

    // Update article statuses
    await (this.prisma as any).article.updateMany({
      where: { id: { in: articleIds } },
      data: { pdfStatus: 'RETRIEVING' },
    });

    return {
      taskId: task.id,
      articleCount: articleIds.length,
    };
  }
}
