import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackExtractionStatusUseCase } from './track-extraction-status.js';

function makePrisma(overrides?: {
  grid?: Record<string, unknown> | null;
  cells?: Array<Record<string, unknown>>;
}) {
  return {
    extractionGrid: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.grid !== undefined ? overrides.grid : { id: 'grid-1' },
      ),
    },
    gridCell: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.cells ?? [
          { id: 'cell-1', articleId: 'art-1', validationStatus: 'PENDING' },
          { id: 'cell-2', articleId: 'art-1', validationStatus: 'PENDING' },
        ],
      ),
    },
  } as any;
}

describe('TrackExtractionStatusUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArticleExtractionStatus', () => {
    it('returns PENDING when all cells are PENDING', async () => {
      const prisma = makePrisma({
        cells: [
          { id: 'cell-1', validationStatus: 'PENDING' },
          { id: 'cell-2', validationStatus: 'PENDING' },
        ],
      });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getArticleExtractionStatus('grid-1', 'art-1');

      expect(result.status).toBe('PENDING');
      expect(result.totalCells).toBe(2);
      expect(result.validatedCells).toBe(0);
      expect(result.flaggedCells).toBe(0);
    });

    it('returns REVIEWED when all cells are VALIDATED or CORRECTED', async () => {
      const prisma = makePrisma({
        cells: [
          { id: 'cell-1', validationStatus: 'VALIDATED' },
          { id: 'cell-2', validationStatus: 'CORRECTED' },
        ],
      });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getArticleExtractionStatus('grid-1', 'art-1');

      expect(result.status).toBe('REVIEWED');
      expect(result.validatedCells).toBe(2);
    });

    it('returns FLAGGED when any cell is FLAGGED', async () => {
      const prisma = makePrisma({
        cells: [
          { id: 'cell-1', validationStatus: 'VALIDATED' },
          { id: 'cell-2', validationStatus: 'FLAGGED' },
        ],
      });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getArticleExtractionStatus('grid-1', 'art-1');

      expect(result.status).toBe('FLAGGED');
      expect(result.flaggedCells).toBe(1);
    });

    it('returns EXTRACTED when cells are mixed (some validated, some pending)', async () => {
      const prisma = makePrisma({
        cells: [
          { id: 'cell-1', validationStatus: 'VALIDATED' },
          { id: 'cell-2', validationStatus: 'PENDING' },
        ],
      });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getArticleExtractionStatus('grid-1', 'art-1');

      expect(result.status).toBe('EXTRACTED');
    });

    it('throws for missing grid', async () => {
      const prisma = makePrisma({ grid: null });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      await expect(
        useCase.getArticleExtractionStatus('missing', 'art-1'),
      ).rejects.toThrow('not found');
    });

    it('throws when no cells found for article', async () => {
      const prisma = makePrisma({ cells: [] });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      await expect(
        useCase.getArticleExtractionStatus('grid-1', 'art-missing'),
      ).rejects.toThrow('not found');
    });
  });

  describe('getGridExtractionProgress', () => {
    it('returns progress with counts per status', async () => {
      const prisma = makePrisma({
        cells: [
          { articleId: 'art-1', validationStatus: 'VALIDATED' },
          { articleId: 'art-1', validationStatus: 'VALIDATED' },
          { articleId: 'art-2', validationStatus: 'PENDING' },
          { articleId: 'art-2', validationStatus: 'PENDING' },
          { articleId: 'art-3', validationStatus: 'VALIDATED' },
          { articleId: 'art-3', validationStatus: 'FLAGGED' },
        ],
      });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getGridExtractionProgress('grid-1');

      expect(result.totalArticles).toBe(3);
      expect(result.counts.REVIEWED).toBe(1);
      expect(result.counts.PENDING).toBe(1);
      expect(result.counts.FLAGGED).toBe(1);
      expect(result.overallPercentage).toBe(33);
    });

    it('returns 100% when all articles are reviewed', async () => {
      const prisma = makePrisma({
        cells: [
          { articleId: 'art-1', validationStatus: 'VALIDATED' },
          { articleId: 'art-1', validationStatus: 'CORRECTED' },
          { articleId: 'art-2', validationStatus: 'VALIDATED' },
        ],
      });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getGridExtractionProgress('grid-1');

      expect(result.overallPercentage).toBe(100);
      expect(result.counts.REVIEWED).toBe(2);
    });

    it('returns 0% when no cells exist', async () => {
      const prisma = makePrisma({ cells: [] });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      const result = await useCase.getGridExtractionProgress('grid-1');

      expect(result.totalArticles).toBe(0);
      expect(result.overallPercentage).toBe(0);
    });

    it('throws for missing grid', async () => {
      const prisma = makePrisma({ grid: null });
      const useCase = new TrackExtractionStatusUseCase(prisma);

      await expect(
        useCase.getGridExtractionProgress('missing'),
      ).rejects.toThrow('not found');
    });
  });
});
