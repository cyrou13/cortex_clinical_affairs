import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageGridTemplatesUseCase } from './manage-grid-templates.js';

function makePrisma(overrides?: {
  customTemplates?: Array<Record<string, unknown>>;
  customTemplate?: Record<string, unknown> | null;
}) {
  return {
    customGridTemplate: {
      findMany: vi.fn().mockResolvedValue(overrides?.customTemplates ?? []),
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.customTemplate !== undefined ? overrides.customTemplate : null,
        ),
      create: vi.fn().mockResolvedValue({ id: 'custom-tpl-1' }),
      update: vi.fn().mockResolvedValue({ id: 'custom-tpl-1' }),
      delete: vi.fn().mockResolvedValue({ id: 'custom-tpl-1' }),
    },
    customGridTemplateColumn: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      create: vi.fn().mockResolvedValue({ id: 'col-1' }),
    },
  } as any;
}

const sampleCustomTemplate = {
  id: 'custom-tpl-1',
  name: 'My Custom Template',
  soaType: 'CLINICAL',
  description: 'A test template',
  createdById: 'user-1',
  columns: [
    { name: 'author', displayName: 'Author', dataType: 'TEXT', isRequired: true, orderIndex: 0 },
    { name: 'year', displayName: 'Year', dataType: 'NUMERIC', isRequired: false, orderIndex: 1 },
  ],
};

describe('ManageGridTemplatesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- listTemplates ---

  it('returns built-in templates when no custom templates exist', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.listTemplates();

    expect(result.length).toBe(3); // 3 built-in templates
    expect(result.every((t) => t.isBuiltIn)).toBe(true);
  });

  it('returns built-in + custom templates', async () => {
    const prisma = makePrisma({ customTemplates: [sampleCustomTemplate] });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.listTemplates();

    expect(result.length).toBe(4);
    expect(result[3]!.name).toBe('My Custom Template');
    expect(result[3]!.isBuiltIn).toBe(false);
  });

  it('filters by soaType', async () => {
    const prisma = makePrisma({ customTemplates: [] });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.listTemplates('CLINICAL');

    expect(result.length).toBe(1);
    expect(result[0]!.soaType).toBe('CLINICAL');
    expect(prisma.customGridTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { soaType: 'CLINICAL' } }),
    );
  });

  // --- getTemplate ---

  it('returns built-in template by id', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.getTemplate('tpl-clinical-default');

    expect(result.name).toBe('Clinical SOA — Default');
    expect(result.isBuiltIn).toBe(true);
  });

  it('returns custom template by id', async () => {
    const prisma = makePrisma({ customTemplate: sampleCustomTemplate });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.getTemplate('custom-tpl-1');

    expect(result.name).toBe('My Custom Template');
    expect(result.isBuiltIn).toBe(false);
  });

  it('throws NotFoundError for unknown template', async () => {
    const prisma = makePrisma({ customTemplate: null });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await expect(useCase.getTemplate('unknown')).rejects.toThrow();
  });

  // --- createTemplate ---

  it('creates a custom template', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.createTemplate({
      name: 'New Template',
      soaType: 'CLINICAL',
      columns: [
        {
          name: 'col1',
          displayName: 'Column 1',
          dataType: 'TEXT',
          isRequired: true,
          orderIndex: 0,
        },
      ],
      userId: 'user-1',
    });

    expect(result.templateId).toBeDefined();
    expect(result.columnCount).toBe(1);
    expect(prisma.customGridTemplate.create).toHaveBeenCalled();
  });

  it('rejects empty name', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await expect(
      useCase.createTemplate({
        name: '  ',
        soaType: 'CLINICAL',
        columns: [
          {
            name: 'col1',
            displayName: 'Column 1',
            dataType: 'TEXT',
            isRequired: true,
            orderIndex: 0,
          },
        ],
        userId: 'user-1',
      }),
    ).rejects.toThrow('Template name cannot be empty');
  });

  it('rejects empty columns', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await expect(
      useCase.createTemplate({
        name: 'Test',
        soaType: 'CLINICAL',
        columns: [],
        userId: 'user-1',
      }),
    ).rejects.toThrow('Template must have at least one column');
  });

  // --- duplicateTemplate ---

  it('duplicates a built-in template', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.duplicateTemplate({
      sourceTemplateId: 'tpl-clinical-default',
      newName: 'Clinical Copy',
      userId: 'user-1',
    });

    expect(result.templateId).toBeDefined();
    expect(result.columnCount).toBe(12);
    expect(prisma.customGridTemplate.create).toHaveBeenCalled();
  });

  it('duplicates a custom template', async () => {
    const prisma = makePrisma({ customTemplate: sampleCustomTemplate });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.duplicateTemplate({
      sourceTemplateId: 'custom-tpl-1',
      newName: 'Custom Copy',
      userId: 'user-1',
    });

    expect(result.templateId).toBeDefined();
    expect(result.columnCount).toBe(2);
  });

  // --- updateTemplate ---

  it('updates a custom template name', async () => {
    const prisma = makePrisma({ customTemplate: sampleCustomTemplate });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.updateTemplate({
      templateId: 'custom-tpl-1',
      name: 'Renamed Template',
    });

    expect(result.updated).toBe(true);
    expect(prisma.customGridTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Renamed Template' } }),
    );
  });

  it('rejects update on built-in template', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await expect(
      useCase.updateTemplate({ templateId: 'tpl-clinical-default', name: 'New Name' }),
    ).rejects.toThrow('Cannot modify a built-in template');
  });

  it('replaces columns on update', async () => {
    const prisma = makePrisma({ customTemplate: sampleCustomTemplate });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await useCase.updateTemplate({
      templateId: 'custom-tpl-1',
      columns: [
        {
          name: 'new_col',
          displayName: 'New Column',
          dataType: 'TEXT',
          isRequired: false,
          orderIndex: 0,
        },
      ],
    });

    expect(prisma.customGridTemplateColumn.deleteMany).toHaveBeenCalledWith({
      where: { templateId: 'custom-tpl-1' },
    });
    expect(prisma.customGridTemplateColumn.create).toHaveBeenCalledTimes(1);
  });

  // --- deleteTemplate ---

  it('deletes a custom template', async () => {
    const prisma = makePrisma({ customTemplate: sampleCustomTemplate });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    const result = await useCase.deleteTemplate('custom-tpl-1');

    expect(result.deleted).toBe(true);
    expect(prisma.customGridTemplate.delete).toHaveBeenCalledWith({
      where: { id: 'custom-tpl-1' },
    });
  });

  it('rejects delete on built-in template', async () => {
    const prisma = makePrisma();
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await expect(useCase.deleteTemplate('tpl-clinical-default')).rejects.toThrow(
      'Cannot delete a built-in template',
    );
  });

  it('throws NotFoundError when deleting non-existent template', async () => {
    const prisma = makePrisma({ customTemplate: null });
    const useCase = new ManageGridTemplatesUseCase(prisma);

    await expect(useCase.deleteTemplate('unknown-id')).rejects.toThrow();
  });
});
