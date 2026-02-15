import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface PopulateGridRowsResult {
  gridId: string;
  articleCount: number;
  cellCount: number;
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
        status: 'FINAL_INCLUDED',
      },
      select: { id: true },
    });

    const columns = await this.prisma.gridColumn.findMany({
      where: { extractionGridId: gridId },
      select: { id: true },
    });

    let cellCount = 0;

    for (const article of articles) {
      for (const column of columns) {
        await this.prisma.gridCell.create({
          data: {
            id: crypto.randomUUID(),
            extractionGridId: gridId,
            articleId: article.id,
            gridColumnId: column.id,
            value: null,
            validationStatus: 'PENDING',
          },
        });
        cellCount++;
      }
    }

    return { gridId, articleCount: articles.length, cellCount };
  }
}
