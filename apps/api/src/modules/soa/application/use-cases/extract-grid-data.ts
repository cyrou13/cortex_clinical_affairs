import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface ExtractGridDataInput {
  gridId: string;
  articleIds?: string[];
  userId: string;
}

interface ExtractGridDataResult {
  taskId: string;
  articleCount: number;
  columnCount: number;
}

export class ExtractGridDataUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly enqueueJob: (queue: string, data: unknown) => Promise<string>,
  ) {}

  async execute(input: ExtractGridDataInput): Promise<ExtractGridDataResult> {
    const grid = await this.prisma.extractionGrid.findUnique({
      where: { id: input.gridId },
      include: {
        soaAnalysis: { select: { id: true, status: true } },
      },
    });

    if (!grid) {
      throw new NotFoundError('ExtractionGrid', input.gridId);
    }

    if (grid.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot extract data on a locked SOA analysis');
    }

    const columns = await this.prisma.gridColumn.findMany({
      where: { extractionGridId: input.gridId },
      select: { id: true, name: true, displayName: true, dataType: true },
    });

    if (columns.length === 0) {
      throw new ValidationError('No columns defined in extraction grid');
    }

    const links = await this.prisma.soaSlsLink.findMany({
      where: { soaAnalysisId: grid.soaAnalysis.id },
      select: { slsSessionId: true },
    });

    const sessionIds = links.map((l: { slsSessionId: string }) => l.slsSessionId);

    const articleFilter: Record<string, unknown> = {
      sessionId: { in: sessionIds },
      pdfStorageKey: { not: null },
    };

    if (input.articleIds && input.articleIds.length > 0) {
      articleFilter.id = { in: input.articleIds };
    }

    const articles = await this.prisma.article.findMany({
      where: articleFilter,
      select: { id: true, title: true },
    });

    if (articles.length === 0) {
      throw new ValidationError('No articles with PDFs found for extraction');
    }

    const task = await this.prisma.asyncTask.create({
      data: {
        id: crypto.randomUUID(),
        type: 'SOA_GRID_EXTRACTION',
        status: 'PENDING',
        createdBy: input.userId,
        metadata: {
          gridId: input.gridId,
          articleCount: articles.length,
          columnCount: columns.length,
        },
      },
    });

    await this.enqueueJob('soa.extract-grid-data', {
      taskId: task.id,
      soaAnalysisId: grid.soaAnalysis.id,
      extractionGridId: input.gridId,
      articleIds: articles.map((a: { id: string }) => a.id),
      gridColumns: columns,
    });

    return {
      taskId: task.id,
      articleCount: articles.length,
      columnCount: columns.length,
    };
  }
}
