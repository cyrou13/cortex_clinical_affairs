import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

type CellValidationStatus = 'PENDING' | 'VALIDATED' | 'CORRECTED' | 'FLAGGED';

type ArticleExtractionStatus = 'PENDING' | 'EXTRACTED' | 'REVIEWED' | 'FLAGGED';

interface ArticleExtractionStatusResult {
  articleId: string;
  status: ArticleExtractionStatus;
  totalCells: number;
  validatedCells: number;
  flaggedCells: number;
}

interface GridExtractionProgress {
  gridId: string;
  totalArticles: number;
  counts: Record<ArticleExtractionStatus, number>;
  overallPercentage: number;
}

export class TrackExtractionStatusUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async getArticleExtractionStatus(
    gridId: string,
    articleId: string,
  ): Promise<ArticleExtractionStatusResult> {
    const grid = await this.prisma.extractionGrid.findUnique({
      where: { id: gridId },
    });

    if (!grid) {
      throw new NotFoundError('ExtractionGrid', gridId);
    }

    const cells = await this.prisma.gridCell.findMany({
      where: {
        extractionGridId: gridId,
        articleId,
      },
      select: { id: true, validationStatus: true },
    });

    if (cells.length === 0) {
      throw new NotFoundError('GridCell', `${gridId}/${articleId}`);
    }

    const statuses = cells.map((c) => c.validationStatus as CellValidationStatus);
    const flaggedCells = statuses.filter((s) => s === 'FLAGGED').length;
    const validatedCells = statuses.filter((s) => s === 'VALIDATED' || s === 'CORRECTED').length;
    const pendingCells = statuses.filter((s) => s === 'PENDING').length;

    let status: ArticleExtractionStatus;
    if (flaggedCells > 0) {
      status = 'FLAGGED';
    } else if (pendingCells === cells.length) {
      status = 'PENDING';
    } else if (validatedCells === cells.length) {
      status = 'REVIEWED';
    } else {
      status = 'EXTRACTED';
    }

    return {
      articleId,
      status,
      totalCells: cells.length,
      validatedCells,
      flaggedCells,
    };
  }

  async getGridExtractionProgress(gridId: string): Promise<GridExtractionProgress> {
    const grid = await this.prisma.extractionGrid.findUnique({
      where: { id: gridId },
    });

    if (!grid) {
      throw new NotFoundError('ExtractionGrid', gridId);
    }

    const cells = await this.prisma.gridCell.findMany({
      where: { extractionGridId: gridId },
      select: { articleId: true, validationStatus: true },
    });

    const articleMap = new Map<string, CellValidationStatus[]>();
    for (const cell of cells as Array<{
      articleId: string;
      validationStatus: CellValidationStatus;
    }>) {
      const existing = articleMap.get(cell.articleId) ?? [];
      existing.push(cell.validationStatus);
      articleMap.set(cell.articleId, existing);
    }

    const counts: Record<ArticleExtractionStatus, number> = {
      PENDING: 0,
      EXTRACTED: 0,
      REVIEWED: 0,
      FLAGGED: 0,
    };

    for (const [, statuses] of articleMap) {
      const hasFlagged = statuses.some((s) => s === 'FLAGGED');
      const allPending = statuses.every((s) => s === 'PENDING');
      const allReviewed = statuses.every((s) => s === 'VALIDATED' || s === 'CORRECTED');

      if (hasFlagged) {
        counts.FLAGGED++;
      } else if (allPending) {
        counts.PENDING++;
      } else if (allReviewed) {
        counts.REVIEWED++;
      } else {
        counts.EXTRACTED++;
      }
    }

    const totalArticles = articleMap.size;
    const completedArticles = counts.REVIEWED;
    const overallPercentage =
      totalArticles > 0 ? Math.round((completedArticles / totalArticles) * 100) : 0;

    return {
      gridId,
      totalArticles,
      counts,
      overallPercentage,
    };
  }
}
