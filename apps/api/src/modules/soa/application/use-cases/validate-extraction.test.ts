import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateExtractionUseCase } from './validate-extraction.js';

function makePrisma(overrides?: {
  cell?: Record<string, unknown> | null;
}) {
  return {
    gridCell: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.cell !== undefined
          ? overrides.cell
          : { id: 'cell-1', value: 'AI value', aiExtractedValue: 'AI value' },
      ),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'cell-1', ...data })),
    },
  } as any;
}

describe('ValidateExtractionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCell', () => {
    it('marks cell as VALIDATED', async () => {
      const prisma = makePrisma();
      const useCase = new ValidateExtractionUseCase(prisma);

      const result = await useCase.validateCell('grid-1', 'art-1', 'col-1', 'user-1');

      expect(result.status).toBe('VALIDATED');
      expect(prisma.gridCell.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ validationStatus: 'VALIDATED' }),
        }),
      );
    });

    it('throws for missing cell', async () => {
      const prisma = makePrisma({ cell: null });
      const useCase = new ValidateExtractionUseCase(prisma);

      await expect(
        useCase.validateCell('grid-1', 'art-1', 'col-bad', 'user-1'),
      ).rejects.toThrow('not found');
    });
  });

  describe('correctCell', () => {
    it('marks cell as CORRECTED with new value', async () => {
      const prisma = makePrisma();
      const useCase = new ValidateExtractionUseCase(prisma);

      const result = await useCase.correctCell('grid-1', 'art-1', 'col-1', 'Corrected value', 'user-1');

      expect(result.status).toBe('CORRECTED');
      expect(result.value).toBe('Corrected value');
      expect(prisma.gridCell.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            value: 'Corrected value',
            validationStatus: 'CORRECTED',
          }),
        }),
      );
    });
  });

  describe('flagCell', () => {
    it('marks cell as FLAGGED', async () => {
      const prisma = makePrisma();
      const useCase = new ValidateExtractionUseCase(prisma);

      const result = await useCase.flagCell('grid-1', 'art-1', 'col-1', 'Needs review', 'user-1');

      expect(result.status).toBe('FLAGGED');
      expect(result.reason).toBe('Needs review');
    });

    it('throws for empty reason', async () => {
      const prisma = makePrisma();
      const useCase = new ValidateExtractionUseCase(prisma);

      await expect(
        useCase.flagCell('grid-1', 'art-1', 'col-1', '  ', 'user-1'),
      ).rejects.toThrow('reason is required');
    });
  });
});
