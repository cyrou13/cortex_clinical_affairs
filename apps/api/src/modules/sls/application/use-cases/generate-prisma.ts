import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

export interface PrismaStatistics {
  identification: {
    perDatabase: Array<{
      database: string;
      articlesFound: number;
      queriesExecuted: number;
    }>;
    totalIdentified: number;
  };
  deduplication: {
    duplicatesRemovedByDoi: number;
    duplicatesRemovedByPmid: number;
    duplicatesRemovedByTitleFuzzy: number;
    totalDuplicatesRemoved: number;
    uniqueArticlesAfterDedup: number;
  };
  screening: {
    aiScored: number;
    manuallyReviewed: number;
    includedAfterScreening: number;
    excludedAfterScreening: number;
    excludedByCode: Array<{ code: string; label: string; count: number }>;
  };
  inclusion: {
    finalIncluded: number;
    perQuery: Array<{ queryName: string; articlesContributed: number }>;
  };
}

export class GeneratePrismaUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(sessionId: string): Promise<PrismaStatistics> {
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Fetch all articles for the session
    const articles = await (this.prisma as any).article.findMany({
      where: { sessionId },
      select: {
        id: true,
        status: true,
        source: true,
        relevanceScore: true,
        exclusionCodeId: true,
      },
    });

    // Fetch queries for the session
    const queries = await (this.prisma as any).slsQuery.findMany({
      where: { sessionId },
      select: { id: true, name: true },
    });

    // Fetch query executions
    const queryExecutions = await (this.prisma as any).queryExecution.findMany({
      where: {
        queryVersion: {
          query: { sessionId },
        },
      },
      select: {
        id: true,
        database: true,
        resultCount: true,
        queryVersion: {
          select: {
            query: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Identification: per database
    const dbMap = new Map<string, { articlesFound: number; queriesExecuted: number }>();
    for (const exec of queryExecutions) {
      const db = exec.database ?? 'unknown';
      const existing = dbMap.get(db) ?? { articlesFound: 0, queriesExecuted: 0 };
      existing.articlesFound += exec.resultCount ?? 0;
      existing.queriesExecuted += 1;
      dbMap.set(db, existing);
    }

    const perDatabase = Array.from(dbMap.entries()).map(([database, stats]) => ({
      database,
      ...stats,
    }));
    const totalIdentified = perDatabase.reduce((sum, db) => sum + db.articlesFound, 0);

    // Deduplication stats from session
    const dedupStats = (session.deduplicationStats as Record<string, number>) ?? {};
    const duplicatesRemovedByDoi = dedupStats.doiDuplicates ?? 0;
    const duplicatesRemovedByPmid = dedupStats.pmidDuplicates ?? 0;
    const duplicatesRemovedByTitleFuzzy = dedupStats.titleFuzzyDuplicates ?? 0;
    const totalDuplicatesRemoved =
      duplicatesRemovedByDoi + duplicatesRemovedByPmid + duplicatesRemovedByTitleFuzzy;

    // Screening stats
    const aiScored = articles.filter(
      (a: { relevanceScore: number | null }) => a.relevanceScore !== null,
    ).length;

    const screeningDecisionCount = await (this.prisma as any).screeningDecision.count({
      where: { article: { sessionId } },
    });

    const includedAfterScreening = articles.filter(
      (a: { status: string }) => a.status === 'INCLUDED' || a.status === 'FINAL_INCLUDED',
    ).length;
    const excludedAfterScreening = articles.filter(
      (a: { status: string }) => a.status === 'EXCLUDED' || a.status === 'FINAL_EXCLUDED',
    ).length;

    // Exclusion code breakdown
    const exclusionCodes = await (this.prisma as any).exclusionCode.findMany({
      where: { sessionId },
      select: { id: true, code: true, label: true },
    });

    const excludedByCode = exclusionCodes.map(
      (ec: { id: string; code: string; label: string }) => {
        const count = articles.filter(
          (a: { exclusionCodeId: string | null }) => a.exclusionCodeId === ec.id,
        ).length;
        return { code: ec.code, label: ec.label, count };
      },
    ).filter((ec: { count: number }) => ec.count > 0);

    // Inclusion: per query
    const perQuery = queries.map((q: { id: string; name: string }) => {
      const queryArticles = articles.filter(
        (a: { status: string }) =>
          a.status === 'INCLUDED' || a.status === 'FINAL_INCLUDED',
      );
      return {
        queryName: q.name,
        articlesContributed: queryArticles.length,
      };
    });

    return {
      identification: {
        perDatabase,
        totalIdentified,
      },
      deduplication: {
        duplicatesRemovedByDoi,
        duplicatesRemovedByPmid,
        duplicatesRemovedByTitleFuzzy,
        totalDuplicatesRemoved,
        uniqueArticlesAfterDedup: articles.length,
      },
      screening: {
        aiScored,
        manuallyReviewed: screeningDecisionCount,
        includedAfterScreening,
        excludedAfterScreening,
        excludedByCode,
      },
      inclusion: {
        finalIncluded: includedAfterScreening,
        perQuery,
      },
    };
  }
}
