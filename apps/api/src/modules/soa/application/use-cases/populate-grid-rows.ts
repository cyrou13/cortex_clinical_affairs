import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface PopulateGridRowsResult {
  gridId: string;
  articleCount: number;
  cellCount: number;
}

interface ArticleRow {
  id: string;
  title: string;
  authors: unknown;
  publicationDate: string | null;
  journal: string | null;
  doi: string | null;
}

// Map known column names to article field extractors
function getArticleValue(article: ArticleRow, columnName: string): string | null {
  switch (columnName) {
    case 'author': {
      const authors = article.authors as string[] | null;
      if (!authors || authors.length === 0) return null;
      // First author et al. format
      return authors.length === 1 ? (authors[0] ?? null) : `${authors[0]} et al.`;
    }
    case 'year': {
      if (!article.publicationDate) return null;
      const dateStr = String(article.publicationDate);
      const match = dateStr.match(/\d{4}/);
      return match ? match[0] : null;
    }
    default:
      return null;
  }
}

export class PopulateGridRowsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(gridId: string): Promise<PopulateGridRowsResult> {
    const grid = await this.prisma.extractionGrid.findUnique({
      where: { id: gridId },
      select: { id: true, soaAnalysisId: true },
    });

    if (!grid) {
      throw new NotFoundError('ExtractionGrid', gridId);
    }

    const links = await this.prisma.soaSlsLink.findMany({
      where: { soaAnalysisId: grid.soaAnalysisId },
      select: { slsSessionId: true },
    });

    const sessionIds = links.map((l: { slsSessionId: string }) => l.slsSessionId);

    const articles = await this.prisma.article.findMany({
      where: {
        sessionId: { in: sessionIds },
        status: { in: ['INCLUDED', 'FINAL_INCLUDED'] },
      },
      select: {
        id: true,
        title: true,
        authors: true,
        publicationDate: true,
        journal: true,
        doi: true,
      },
    });

    const columns = await this.prisma.gridColumn.findMany({
      where: { extractionGridId: gridId },
      select: { id: true, name: true },
    });

    // Remove cells for articles no longer INCLUDED
    const includedArticleIds = new Set(articles.map((a) => a.id));
    const existingCells = await this.prisma.gridCell.findMany({
      where: { extractionGridId: gridId },
      select: { articleId: true },
    });
    const staleArticleIds = [
      ...new Set(
        existingCells
          .map((c: { articleId: string }) => c.articleId)
          .filter((id: string) => !includedArticleIds.has(id)),
      ),
    ];
    if (staleArticleIds.length > 0) {
      await this.prisma.gridCell.deleteMany({
        where: {
          extractionGridId: gridId,
          articleId: { in: staleArticleIds },
        },
      });
    }

    let cellCount = 0;

    for (const article of articles) {
      for (const column of columns) {
        const existing = await this.prisma.gridCell.findFirst({
          where: {
            extractionGridId: gridId,
            articleId: article.id,
            gridColumnId: column.id,
          },
        });
        if (!existing) {
          const prefillValue = getArticleValue(article as ArticleRow, column.name);
          await this.prisma.gridCell.create({
            data: {
              id: crypto.randomUUID(),
              extractionGridId: gridId,
              articleId: article.id,
              gridColumnId: column.id,
              value: prefillValue,
              validationStatus: 'PENDING',
            },
          });
          cellCount++;
        }
      }
    }

    return { gridId, articleCount: articles.length, cellCount };
  }
}
