import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { GRID_TEMPLATES, getTemplateById, getTemplatesForSoaType } from '@cortex/shared';
import type { GridTemplate, GridColumnDefinition } from '@cortex/shared';

interface CreateTemplateInput {
  name: string;
  soaType: string;
  description?: string;
  columns: GridColumnDefinition[];
  userId: string;
}

interface DuplicateTemplateInput {
  sourceTemplateId: string;
  newName: string;
  soaType?: string;
  userId: string;
}

interface UpdateTemplateInput {
  templateId: string;
  name?: string;
  description?: string;
  columns?: GridColumnDefinition[];
}

export class ManageGridTemplatesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async listTemplates(soaType?: string): Promise<GridTemplate[]> {
    const builtIn = soaType ? getTemplatesForSoaType(soaType) : [...GRID_TEMPLATES];

    let customTemplates: GridTemplate[] = [];
    try {
      const customWhere: Record<string, unknown> = {};
      if (soaType) {
        customWhere.soaType = soaType;
      }

      const customRows = await (this.prisma as any).customGridTemplate.findMany({
        where: customWhere,
        include: { columns: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      });

      customTemplates = customRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        soaType: row.soaType,
        description: row.description ?? undefined,
        isBuiltIn: false,
        columns: row.columns.map((col: any) => ({
          name: col.name,
          displayName: col.displayName,
          dataType: col.dataType,
          isRequired: col.isRequired,
          orderIndex: col.orderIndex,
        })),
      }));
    } catch {
      // Table may not exist yet if migration hasn't been run
    }

    return [...builtIn, ...customTemplates];
  }

  async getTemplate(templateId: string): Promise<GridTemplate> {
    const builtIn = getTemplateById(templateId);
    if (builtIn) return builtIn;

    const custom = await (this.prisma as any).customGridTemplate.findUnique({
      where: { id: templateId },
      include: { columns: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!custom) {
      throw new NotFoundError('GridTemplate', templateId);
    }

    return {
      id: custom.id,
      name: custom.name,
      soaType: custom.soaType,
      description: custom.description ?? undefined,
      isBuiltIn: false,
      columns: custom.columns.map((col: any) => ({
        name: col.name,
        displayName: col.displayName,
        dataType: col.dataType,
        isRequired: col.isRequired,
        orderIndex: col.orderIndex,
      })),
    };
  }

  async createTemplate(input: CreateTemplateInput) {
    if (!input.name.trim()) {
      throw new ValidationError('Template name cannot be empty');
    }
    if (input.columns.length === 0) {
      throw new ValidationError('Template must have at least one column');
    }

    const templateId = crypto.randomUUID();

    await (this.prisma as any).customGridTemplate.create({
      data: {
        id: templateId,
        name: input.name.trim(),
        soaType: input.soaType,
        description: input.description ?? null,
        createdById: input.userId,
        columns: {
          create: input.columns.map((col, idx) => ({
            id: crypto.randomUUID(),
            name: col.name,
            displayName: col.displayName,
            dataType: col.dataType,
            isRequired: col.isRequired,
            orderIndex: idx,
          })),
        },
      },
    });

    return { templateId, columnCount: input.columns.length };
  }

  async duplicateTemplate(input: DuplicateTemplateInput) {
    const source = await this.getTemplate(input.sourceTemplateId);

    const templateId = crypto.randomUUID();

    await (this.prisma as any).customGridTemplate.create({
      data: {
        id: templateId,
        name: input.newName.trim(),
        soaType: input.soaType ?? source.soaType,
        description: source.description ?? null,
        createdById: input.userId,
        columns: {
          create: source.columns.map((col, idx) => ({
            id: crypto.randomUUID(),
            name: col.name,
            displayName: col.displayName,
            dataType: col.dataType,
            isRequired: col.isRequired,
            orderIndex: idx,
          })),
        },
      },
    });

    return { templateId, columnCount: source.columns.length };
  }

  async updateTemplate(input: UpdateTemplateInput) {
    const builtIn = getTemplateById(input.templateId);
    if (builtIn) {
      throw new ValidationError('Cannot modify a built-in template');
    }

    const existing = await (this.prisma as any).customGridTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!existing) {
      throw new NotFoundError('GridTemplate', input.templateId);
    }

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;

    if (Object.keys(updateData).length > 0) {
      await (this.prisma as any).customGridTemplate.update({
        where: { id: input.templateId },
        data: updateData,
      });
    }

    if (input.columns) {
      await (this.prisma as any).customGridTemplateColumn.deleteMany({
        where: { templateId: input.templateId },
      });

      for (const [idx, col] of input.columns.entries()) {
        await (this.prisma as any).customGridTemplateColumn.create({
          data: {
            id: crypto.randomUUID(),
            templateId: input.templateId,
            name: col.name,
            displayName: col.displayName,
            dataType: col.dataType,
            isRequired: col.isRequired,
            orderIndex: idx,
          },
        });
      }
    }

    return { templateId: input.templateId, updated: true };
  }

  async deleteTemplate(templateId: string) {
    const builtIn = getTemplateById(templateId);
    if (builtIn) {
      throw new ValidationError('Cannot delete a built-in template');
    }

    const existing = await (this.prisma as any).customGridTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundError('GridTemplate', templateId);
    }

    await (this.prisma as any).customGridTemplate.delete({
      where: { id: templateId },
    });

    return { templateId, deleted: true };
  }
}
