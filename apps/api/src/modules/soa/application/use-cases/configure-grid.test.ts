import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureGridUseCase } from './configure-grid.js';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  grid?: Record<string, unknown> | null;
  maxOrder?: Record<string, unknown> | null;
}) {
  return {
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soa !== undefined ? overrides.soa : { id: 'soa-1', status: 'DRAFT' },
      ),
    },
    extractionGrid: {
      create: vi.fn().mockResolvedValue({ id: 'grid-1' }),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.grid !== undefined ? overrides.grid : { id: 'grid-1' },
      ),
    },
    gridColumn: {
      create: vi.fn().mockResolvedValue({ id: 'col-1' }),
      findFirst: vi.fn().mockResolvedValue(overrides?.maxOrder ?? { orderIndex: 2 }),
      update: vi.fn().mockResolvedValue({ id: 'col-1' }),
      delete: vi.fn().mockResolvedValue({ id: 'col-1' }),
    },
  } as any;
}

describe('ConfigureGridUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGrid', () => {
    it('creates empty grid without template', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      const result = await useCase.createGrid({
        soaAnalysisId: 'soa-1',
        name: 'Clinical Grid',
      });

      expect(result.gridId).toBeTruthy();
      expect(result.columnCount).toBe(0);
      expect(prisma.extractionGrid.create).toHaveBeenCalled();
    });

    it('creates grid with clinical template', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      const result = await useCase.createGrid({
        soaAnalysisId: 'soa-1',
        name: 'Clinical Grid',
        templateId: 'tpl-clinical-default',
      });

      expect(result.columnCount).toBe(12);
      expect(prisma.gridColumn.create).toHaveBeenCalledTimes(12);
    });

    it('throws for missing SOA', async () => {
      const prisma = makePrisma({ soa: null });
      const useCase = new ConfigureGridUseCase(prisma);

      await expect(
        useCase.createGrid({ soaAnalysisId: 'missing', name: 'Grid' }),
      ).rejects.toThrow('not found');
    });

    it('throws for locked SOA', async () => {
      const prisma = makePrisma({ soa: { id: 'soa-1', status: 'LOCKED' } });
      const useCase = new ConfigureGridUseCase(prisma);

      await expect(
        useCase.createGrid({ soaAnalysisId: 'soa-1', name: 'Grid' }),
      ).rejects.toThrow('locked');
    });

    it('throws for invalid template ID', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      await expect(
        useCase.createGrid({ soaAnalysisId: 'soa-1', name: 'Grid', templateId: 'bad' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('addColumn', () => {
    it('adds column at next order index', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      const result = await useCase.addColumn({
        gridId: 'grid-1',
        name: 'custom_col',
        displayName: 'Custom Column',
        dataType: 'TEXT',
      });

      expect(result.columnId).toBeTruthy();
      expect(prisma.gridColumn.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderIndex: 3 }),
        }),
      );
    });

    it('throws for missing grid', async () => {
      const prisma = makePrisma({ grid: null });
      const useCase = new ConfigureGridUseCase(prisma);

      await expect(
        useCase.addColumn({ gridId: 'missing', name: 'c', displayName: 'C', dataType: 'TEXT' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('reorderColumns', () => {
    it('updates order indexes', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      const result = await useCase.reorderColumns('grid-1', ['col-b', 'col-a', 'col-c']);

      expect(result.reorderedCount).toBe(3);
      expect(prisma.gridColumn.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('renameColumn', () => {
    it('renames column', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      const result = await useCase.renameColumn('grid-1', 'col-1', 'New Name');

      expect(result.displayName).toBe('New Name');
    });

    it('throws for empty name', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      await expect(
        useCase.renameColumn('grid-1', 'col-1', '  '),
      ).rejects.toThrow('empty');
    });
  });

  describe('removeColumn', () => {
    it('removes column', async () => {
      const prisma = makePrisma();
      const useCase = new ConfigureGridUseCase(prisma);

      const result = await useCase.removeColumn('grid-1', 'col-1');

      expect(result.removed).toBe(true);
      expect(prisma.gridColumn.delete).toHaveBeenCalled();
    });
  });
});
