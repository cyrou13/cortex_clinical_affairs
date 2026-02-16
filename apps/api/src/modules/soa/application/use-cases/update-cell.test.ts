import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCellUseCase } from './update-cell.js';

function makePrisma(overrides?: {
  grid?: Record<string, unknown> | null;
  cell?: Record<string, unknown> | null;
}) {
  return {
    extractionGrid: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.grid !== undefined
            ? overrides.grid
            : { id: 'grid-1', soaAnalysis: { status: 'IN_PROGRESS' } },
        ),
    },
    gridCell: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          overrides?.cell !== undefined ? overrides.cell : { id: 'cell-1', value: null },
        ),
      update: vi.fn().mockResolvedValue({ id: 'cell-1', value: 'new value' }),
    },
  } as any;
}

describe('UpdateCellUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates cell value', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateCellUseCase(prisma);

    const result = await useCase.execute({
      gridId: 'grid-1',
      articleId: 'art-1',
      columnId: 'col-1',
      value: 'Randomized controlled trial',
      userId: 'user-1',
    });

    expect(result.validationStatus).toBe('PENDING');
    expect(prisma.gridCell.update).toHaveBeenCalled();
  });

  it('throws for missing grid', async () => {
    const prisma = makePrisma({ grid: null });
    const useCase = new UpdateCellUseCase(prisma);

    await expect(
      useCase.execute({
        gridId: 'missing',
        articleId: 'art-1',
        columnId: 'col-1',
        value: 'x',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws for locked SOA', async () => {
    const prisma = makePrisma({
      grid: { id: 'grid-1', soaAnalysis: { status: 'LOCKED' } },
    });
    const useCase = new UpdateCellUseCase(prisma);

    await expect(
      useCase.execute({
        gridId: 'grid-1',
        articleId: 'art-1',
        columnId: 'col-1',
        value: 'x',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });

  it('throws for missing cell', async () => {
    const prisma = makePrisma({ cell: null });
    const useCase = new UpdateCellUseCase(prisma);

    await expect(
      useCase.execute({
        gridId: 'grid-1',
        articleId: 'art-1',
        columnId: 'col-bad',
        value: 'x',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('allows null value', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateCellUseCase(prisma);

    const _result = await useCase.execute({
      gridId: 'grid-1',
      articleId: 'art-1',
      columnId: 'col-1',
      value: null,
      userId: 'user-1',
    });

    expect(prisma.gridCell.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: null }),
      }),
    );
  });
});
