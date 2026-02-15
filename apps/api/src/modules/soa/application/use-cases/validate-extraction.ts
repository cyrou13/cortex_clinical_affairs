import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class ValidateExtractionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async validateCell(gridId: string, articleId: string, columnId: string, userId: string) {
    const cell = await this.findCell(gridId, articleId, columnId);

    await this.prisma.gridCell.update({
      where: { id: cell.id },
      data: {
        validationStatus: 'VALIDATED',
        validatedById: userId,
        validatedAt: new Date().toISOString(),
      },
    });

    return { cellId: cell.id, status: 'VALIDATED' };
  }

  async correctCell(
    gridId: string,
    articleId: string,
    columnId: string,
    newValue: string,
    userId: string,
  ) {
    const cell = await this.findCell(gridId, articleId, columnId);

    await this.prisma.gridCell.update({
      where: { id: cell.id },
      data: {
        value: newValue,
        validationStatus: 'CORRECTED',
        validatedById: userId,
        validatedAt: new Date().toISOString(),
      },
    });

    return { cellId: cell.id, status: 'CORRECTED', value: newValue };
  }

  async flagCell(
    gridId: string,
    articleId: string,
    columnId: string,
    reason: string,
    userId: string,
  ) {
    if (!reason.trim()) {
      throw new ValidationError('Flag reason is required');
    }

    const cell = await this.findCell(gridId, articleId, columnId);

    await this.prisma.gridCell.update({
      where: { id: cell.id },
      data: {
        validationStatus: 'FLAGGED',
        validatedById: userId,
        validatedAt: new Date().toISOString(),
      },
    });

    return { cellId: cell.id, status: 'FLAGGED', reason };
  }

  private async findCell(gridId: string, articleId: string, columnId: string) {
    const cell = await this.prisma.gridCell.findFirst({
      where: {
        extractionGridId: gridId,
        articleId,
        gridColumnId: columnId,
      },
    });

    if (!cell) {
      throw new NotFoundError('GridCell', `${gridId}/${articleId}/${columnId}`);
    }

    return cell;
  }
}
