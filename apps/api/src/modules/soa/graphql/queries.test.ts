import { describe, it, expect, vi, beforeEach } from 'vitest';

function makePrisma(overrides?: { cells?: any[] }) {
  return {
    gridCell: {
      findMany: vi.fn().mockResolvedValue(overrides?.cells ?? []),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    article: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'article-1',
        title: 'Test Article',
        authors: 'Smith et al.',
        publicationYear: 2023,
        journal: 'Test Journal',
      }),
    },
  } as any;
}

describe('SOA Queries - Confidence and Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gridCells with filters', () => {
    it('filters by confidence level', async () => {
      const prisma = makePrisma({
        cells: [
          { id: 'cell-1', confidenceLevel: 'HIGH' },
          { id: 'cell-2', confidenceLevel: 'LOW' },
        ],
      });

      await prisma.gridCell.findMany({
        where: {
          extractionGridId: 'grid-1',
          confidenceLevel: { in: ['HIGH'] },
        },
      });

      expect(prisma.gridCell.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidenceLevel: { in: ['HIGH'] },
          }),
        }),
      );
    });

    it('filters by validation status', async () => {
      const prisma = makePrisma();

      await prisma.gridCell.findMany({
        where: {
          extractionGridId: 'grid-1',
          validationStatus: { in: ['PENDING', 'FLAGGED'] },
        },
      });

      expect(prisma.gridCell.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            validationStatus: { in: ['PENDING', 'FLAGGED'] },
          }),
        }),
      );
    });

    it('combines multiple filters', async () => {
      const prisma = makePrisma();

      await prisma.gridCell.findMany({
        where: {
          extractionGridId: 'grid-1',
          articleId: 'article-1',
          confidenceLevel: { in: ['LOW'] },
          validationStatus: { in: ['PENDING'] },
        },
      });

      expect(prisma.gridCell.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            articleId: 'article-1',
            confidenceLevel: { in: ['LOW'] },
            validationStatus: { in: ['PENDING'] },
          }),
        }),
      );
    });
  });

  describe('lowConfidenceCells', () => {
    it('returns only LOW confidence cells', async () => {
      const prisma = makePrisma({
        cells: [
          { id: 'cell-1', confidenceLevel: 'LOW' },
          { id: 'cell-2', confidenceLevel: 'LOW' },
        ],
      });

      await prisma.gridCell.findMany({
        where: {
          extractionGridId: 'grid-1',
          confidenceLevel: 'LOW',
        },
      });

      expect(prisma.gridCell.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidenceLevel: 'LOW',
          }),
        }),
      );
    });
  });

  describe('cellSourceQuote', () => {
    it('returns cell with source quote and article reference', async () => {
      const prisma = makePrisma();
      prisma.gridCell.findFirst.mockResolvedValue({
        id: 'cell-1',
        sourceQuote: 'This is a direct quote from the article.',
        sourcePageNumber: 5,
        gridColumn: { displayName: 'Study Type' },
      });

      const result = await prisma.gridCell.findFirst({
        where: {
          extractionGridId: 'grid-1',
          articleId: 'article-1',
          gridColumnId: 'col-1',
        },
        include: {
          gridColumn: {
            select: { displayName: true },
          },
        },
      });

      expect(result).toBeTruthy();
      expect(result.sourceQuote).toBe('This is a direct quote from the article.');
      expect(result.sourcePageNumber).toBe(5);
    });

    it('returns null for non-existent cell', async () => {
      const prisma = makePrisma();
      prisma.gridCell.findFirst.mockResolvedValue(null);

      const result = await prisma.gridCell.findFirst({
        where: {
          extractionGridId: 'grid-1',
          articleId: 'article-1',
          gridColumnId: 'col-999',
        },
      });

      expect(result).toBeNull();
    });
  });

  describe('confidenceStats', () => {
    it('calculates confidence statistics', async () => {
      const prisma = makePrisma({
        cells: [
          { confidenceLevel: 'HIGH', confidenceScore: 95 },
          { confidenceLevel: 'HIGH', confidenceScore: 90 },
          { confidenceLevel: 'MEDIUM', confidenceScore: 70 },
          { confidenceLevel: 'LOW', confidenceScore: 40 },
          { confidenceLevel: 'UNSCORED', confidenceScore: null },
        ],
      });

      const cells = await prisma.gridCell.findMany({
        where: { extractionGridId: 'grid-1' },
        select: { confidenceLevel: true, confidenceScore: true },
      });

      const stats = {
        total: cells.length,
        high: cells.filter((c: any) => c.confidenceLevel === 'HIGH').length,
        medium: cells.filter((c: any) => c.confidenceLevel === 'MEDIUM').length,
        low: cells.filter((c: any) => c.confidenceLevel === 'LOW').length,
        unscored: cells.filter((c: any) => c.confidenceLevel === 'UNSCORED').length,
        averageScore:
          cells.reduce((sum: number, c: any) => sum + (c.confidenceScore || 0), 0) / cells.length,
      };

      expect(stats.total).toBe(5);
      expect(stats.high).toBe(2);
      expect(stats.medium).toBe(1);
      expect(stats.low).toBe(1);
      expect(stats.unscored).toBe(1);
      expect(stats.averageScore).toBeCloseTo(59, 0);
    });
  });
});
