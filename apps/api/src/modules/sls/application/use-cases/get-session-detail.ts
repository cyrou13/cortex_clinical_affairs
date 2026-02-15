import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// Use 'any' for Prisma models not yet in generated client (SlsSession added in sls.prisma)
type PrismaWithSls = PrismaClient & { slsSession: any };

export class GetSlsSessionDetailUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(sessionId: string) {
    const session: any = await (this.prisma as PrismaWithSls).slsSession.findUnique({
      where: { id: sessionId },
      include: {
        queries: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        exclusionCodes: {
          orderBy: { displayOrder: 'asc' },
        },
        articles: {
          select: {
            status: true,
          },
        },
        _count: {
          select: {
            articles: true,
            queries: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    const articleCount = session._count.articles;
    const queryCount = session._count.queries;

    // Compute article counts by status
    const articleCountsByStatus: Record<string, number> = {};
    for (const article of session.articles) {
      articleCountsByStatus[article.status] =
        (articleCountsByStatus[article.status] ?? 0) + 1;
    }

    const screenedCount = session.articles.filter(
      (a: any) => a.status !== 'PENDING',
    ).length;
    const screeningProgress =
      articleCount > 0 ? Math.round((screenedCount / articleCount) * 100) : 0;

    const { _count, articles, ...rest } = session;
    return {
      ...rest,
      metrics: {
        articleCount,
        queryCount,
        screenedCount,
        screeningProgress,
        articleCountsByStatus,
      },
    };
  }
}
