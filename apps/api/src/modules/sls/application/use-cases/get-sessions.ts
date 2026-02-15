import type { PrismaClient } from '@prisma/client';

// Use 'any' for Prisma models not yet in generated client (SlsSession added in sls.prisma)
type PrismaWithSls = PrismaClient & { slsSession: any };

export class GetSlsSessionsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string, status?: string) {
    const where: Record<string, unknown> = { projectId };
    if (status) {
      where.status = status;
    }

    const sessions: any[] = await (this.prisma as PrismaWithSls).slsSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            articles: true,
            queries: true,
          },
        },
        articles: {
          select: {
            status: true,
          },
        },
      },
    });

    return sessions.map((session: any) => {
      const articleCount = session._count.articles;
      const queryCount = session._count.queries;
      const screenedCount = session.articles.filter(
        (a: any) => a.status !== 'PENDING',
      ).length;
      const screeningProgress =
        articleCount > 0 ? Math.round((screenedCount / articleCount) * 100) : 0;

      // Remove _count and articles from the returned shape and add metrics
      const { _count, articles, ...rest } = session;
      return {
        ...rest,
        metrics: {
          articleCount,
          queryCount,
          screenedCount,
          screeningProgress,
        },
      };
    });
  }
}
