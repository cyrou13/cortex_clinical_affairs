import type { PrismaClient, Prisma } from '@prisma/client';
import type { ArticleMetadata, DeduplicationStats } from '@cortex/shared';
import { generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { deduplicate } from '../../infrastructure/services/deduplication-service.js';

export interface ImportArticlesInput {
  sessionId: string;
  articles: ArticleMetadata[];
  queryId: string;
  executionId: string;
  userId: string;
}

export interface ImportArticlesResult {
  importedCount: number;
  duplicateCount: number;
  stats: DeduplicationStats;
}

export class ImportArticlesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ImportArticlesInput): Promise<ImportArticlesResult> {
    const { sessionId, articles, queryId, executionId, userId } = input;

    // 1. Validate session exists and is not LOCKED
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot import articles into a locked session');
    }

    // 2. Fetch existing articles in session (for deduplication)
    const existingArticles = await this.prisma.article.findMany({
      where: { sessionId },
      select: {
        title: true,
        abstract: true,
        authors: true,
        doi: true,
        pmid: true,
        publicationDate: true,
        journal: true,
        sourceDatabase: true,
      },
    });

    // Map Prisma results to ArticleMetadata shape
    const existingMeta: ArticleMetadata[] = existingArticles.map((a: any) => ({
      title: a.title,
      abstract: a.abstract ?? undefined,
      authors: a.authors ?? undefined,
      doi: a.doi ?? undefined,
      pmid: a.pmid ?? undefined,
      publicationDate: a.publicationDate ? a.publicationDate.toISOString().split('T')[0] : undefined,
      journal: a.journal ?? undefined,
      sourceDatabase: a.sourceDatabase ?? undefined,
    }));

    // 3. Run deduplication service
    const dedupResult = deduplicate(articles, existingMeta);

    // 4. Create Article records with status PENDING
    if (dedupResult.uniqueArticles.length > 0) {
      const articleRecords = dedupResult.uniqueArticles.map((article) => ({
        id: generateId(),
        sessionId,
        title: article.title,
        abstract: article.abstract ?? null,
        authors: (article.authors ?? null) as unknown as Prisma.InputJsonValue,
        doi: article.doi ?? null,
        pmid: article.pmid ?? null,
        publicationDate: article.publicationDate ? new Date(article.publicationDate) : null,
        journal: article.journal ?? null,
        sourceDatabase: article.sourceDatabase ?? null,
        status: 'PENDING',
      }));

      await this.prisma.article.createMany({
        data: articleRecords,
      });

      // 5. Create ArticleQueryLink records
      const linkRecords = articleRecords.map((article) => ({
        id: generateId(),
        articleId: article.id,
        queryId,
        executionId,
        sourceDatabase: article.sourceDatabase,
      }));

      await this.prisma.articleQueryLink.createMany({
        data: linkRecords,
      });
    }

    // 6. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.articles.imported',
        targetType: 'slsSession',
        targetId: sessionId,
        after: {
          importedCount: dedupResult.uniqueArticles.length,
          duplicateCount: dedupResult.duplicates.length,
          stats: dedupResult.stats,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      importedCount: dedupResult.uniqueArticles.length,
      duplicateCount: dedupResult.duplicates.length,
      stats: dedupResult.stats,
    };
  }
}
