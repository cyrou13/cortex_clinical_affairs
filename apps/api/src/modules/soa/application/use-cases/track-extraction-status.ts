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
      select: { id: true, validationStatus: true, aiExtractedValue: true },
    });

    if (cells.length === 0) {
      throw new NotFoundError('GridCell', `${gridId}/${articleId}`);
    }

    const statuses = cells.map((c) => c.validationStatus as CellValidationStatus);
    const flaggedCells = statuses.filter((s) => s === 'FLAGGED').length;
    const validatedCells = statuses.filter((s) => s === 'VALIDATED' || s === 'CORRECTED').length;
    const hasAiValue = cells.some(
      (c) => (c as { aiExtractedValue: string | null }).aiExtractedValue != null,
    );

    let status: ArticleExtractionStatus;
    if (flaggedCells > 0) {
      status = 'FLAGGED';
    } else if (validatedCells === cells.length) {
      status = 'REVIEWED';
    } else if (hasAiValue || validatedCells > 0) {
      status = 'EXTRACTED';
    } else {
      status = 'PENDING';
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
      select: { articleId: true, validationStatus: true, aiExtractedValue: true },
    });

    const articleMap = new Map<
      string,
      Array<{ validationStatus: CellValidationStatus; aiExtractedValue: string | null }>
    >();
    for (const cell of cells as Array<{
      articleId: string;
      validationStatus: CellValidationStatus;
      aiExtractedValue: string | null;
    }>) {
      const existing = articleMap.get(cell.articleId) ?? [];
      existing.push({
        validationStatus: cell.validationStatus,
        aiExtractedValue: cell.aiExtractedValue,
      });
      articleMap.set(cell.articleId, existing);
    }

    const counts: Record<ArticleExtractionStatus, number> = {
      PENDING: 0,
      EXTRACTED: 0,
      REVIEWED: 0,
      FLAGGED: 0,
    };

    for (const [, cellData] of articleMap) {
      const statuses = cellData.map((c) => c.validationStatus);
      const hasFlagged = statuses.some((s) => s === 'FLAGGED');
      const allReviewed = statuses.every((s) => s === 'VALIDATED' || s === 'CORRECTED');
      const hasAiValue = cellData.some((c) => c.aiExtractedValue != null);

      const hasValidated = statuses.some((s) => s === 'VALIDATED' || s === 'CORRECTED');

      if (hasFlagged) {
        counts.FLAGGED++;
      } else if (allReviewed) {
        counts.REVIEWED++;
      } else if (hasAiValue || hasValidated) {
        counts.EXTRACTED++;
      } else {
        counts.PENDING++;
      }
    }

    const totalArticles = articleMap.size;
    const extractedOrReviewed = counts.EXTRACTED + counts.REVIEWED;
    const overallPercentage =
      totalArticles > 0 ? Math.round((extractedOrReviewed / totalArticles) * 100) : 0;

    return {
      gridId,
      totalArticles,
      counts,
      overallPercentage,
    };
  }
}
