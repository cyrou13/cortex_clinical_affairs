import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { getTemplateById } from '@cortex/shared';

interface CreateGridInput {
  soaAnalysisId: string;
  thematicSectionId?: string;
  templateId?: string;
  name: string;
}

interface AddColumnInput {
  gridId: string;
  name: string;
  displayName: string;
  dataType: string;
  isRequired?: boolean;
}

export class ConfigureGridUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async createGrid(input: CreateGridInput) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soa.status === 'LOCKED') {
      throw new ValidationError('Cannot create grid on locked SOA');
    }

    const gridId = crypto.randomUUID();

    await this.prisma.extractionGrid.create({
      data: {
        id: gridId,
        soaAnalysisId: input.soaAnalysisId,
        thematicSectionId: input.thematicSectionId ?? null,
        name: input.name,
      },
    });

    if (input.templateId) {
      const template = getTemplateById(input.templateId);
      if (!template) {
        throw new NotFoundError('GridTemplate', input.templateId);
      }
      for (const col of template.columns) {
        await this.prisma.gridColumn.create({
          data: {
            id: crypto.randomUUID(),
            extractionGridId: gridId,
            name: col.name,
            displayName: col.displayName,
            dataType: col.dataType,
            orderIndex: col.orderIndex,
            isRequired: col.isRequired,
          },
        });
      }
      return { gridId, columnCount: template.columns.length };
    }

    return { gridId, columnCount: 0 };
  }

  async addColumn(input: AddColumnInput) {
    const grid = await this.prisma.extractionGrid.findUnique({
      where: { id: input.gridId },
      select: { id: true },
    });

    if (!grid) {
      throw new NotFoundError('ExtractionGrid', input.gridId);
    }

    const maxOrder = await this.prisma.gridColumn.findFirst({
      where: { extractionGridId: input.gridId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const columnId = crypto.randomUUID();
    await this.prisma.gridColumn.create({
      data: {
        id: columnId,
        extractionGridId: input.gridId,
        name: input.name,
        displayName: input.displayName,
        dataType: input.dataType,
        orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
        isRequired: input.isRequired ?? false,
      },
    });

    return { columnId };
  }

  async reorderColumns(gridId: string, columnIds: string[]) {
    for (let i = 0; i < columnIds.length; i++) {
      await this.prisma.gridColumn.update({
        where: { id: columnIds[i] },
        data: { orderIndex: i },
      });
    }
    return { reorderedCount: columnIds.length };
  }

  async renameColumn(gridId: string, columnId: string, newName: string) {
    if (!newName.trim()) {
      throw new ValidationError('Column name cannot be empty');
    }

    await this.prisma.gridColumn.update({
      where: { id: columnId },
      data: { displayName: newName.trim() },
    });

    return { columnId, displayName: newName.trim() };
  }

  async removeColumn(gridId: string, columnId: string) {
    await this.prisma.gridColumn.delete({
      where: { id: columnId },
    });

    return { columnId, removed: true };
  }
}
