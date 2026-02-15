import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface UpdateCellInput {
  gridId: string;
  articleId: string;
  columnId: string;
  value: string | null;
  userId: string;
}

export class UpdateCellUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpdateCellInput) {
    const grid = await this.prisma.extractionGrid.findUnique({
      where: { id: input.gridId },
      include: { soaAnalysis: { select: { status: true } } },
    });

    if (!grid) {
      throw new NotFoundError('ExtractionGrid', input.gridId);
    }

    if (grid.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot edit cells on a locked SOA analysis');
    }

    const cell = await this.prisma.gridCell.findFirst({
      where: {
        extractionGridId: input.gridId,
        articleId: input.articleId,
        gridColumnId: input.columnId,
      },
    });

    if (!cell) {
      throw new NotFoundError('GridCell', `${input.gridId}/${input.articleId}/${input.columnId}`);
    }

    const updated = await this.prisma.gridCell.update({
      where: { id: cell.id },
      data: {
        value: input.value,
        validationStatus: 'PENDING',
        validatedById: input.userId,
        validatedAt: new Date().toISOString(),
      },
    });

    return {
      cellId: updated.id,
      value: input.value,
      validationStatus: 'PENDING',
    };
  }
}
