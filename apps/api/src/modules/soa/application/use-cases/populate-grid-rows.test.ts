import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PopulateGridRowsUseCase } from './populate-grid-rows.js';

function makePrisma(overrides?: {
  grid?: Record<string, unknown> | null;
  links?: Array<Record<string, unknown>>;
  articles?: Array<Record<string, unknown>>;
  columns?: Array<Record<string, unknown>>;
}) {
  return {
    extractionGrid: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.grid !== undefined ? overrides.grid : { id: 'grid-1', soaAnalysisId: 'soa-1' },
        ),
    },
    soaSlsLink: {
      findMany: vi.fn().mockResolvedValue(overrides?.links ?? [{ slsSessionId: 'sess-1' }]),
    },
    article: {
      findMany: vi
        .fn()
        .mockResolvedValue(overrides?.articles ?? [{ id: 'art-1' }, { id: 'art-2' }]),
    },
    gridColumn: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.columns ?? [{ id: 'col-1' }, { id: 'col-2' }, { id: 'col-3' }],
        ),
    },
    gridCell: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'cell-1' }),
    },
  } as any;
}

describe('PopulateGridRowsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates cells for all articles x columns', async () => {
    const prisma = makePrisma();
    const useCase = new PopulateGridRowsUseCase(prisma);

    const result = await useCase.execute('grid-1');

    expect(result.articleCount).toBe(2);
    expect(result.cellCount).toBe(6); // 2 articles x 3 columns
    expect(prisma.gridCell.create).toHaveBeenCalledTimes(6);
  });

  it('throws for missing grid', async () => {
    const prisma = makePrisma({ grid: null });
    const useCase = new PopulateGridRowsUseCase(prisma);

    await expect(useCase.execute('missing')).rejects.toThrow('not found');
  });

  it('returns 0 cells when no articles', async () => {
    const prisma = makePrisma({ articles: [] });
    const useCase = new PopulateGridRowsUseCase(prisma);

    const result = await useCase.execute('grid-1');

    expect(result.articleCount).toBe(0);
    expect(result.cellCount).toBe(0);
  });

  it('returns 0 cells when no columns', async () => {
    const prisma = makePrisma({ columns: [] });
    const useCase = new PopulateGridRowsUseCase(prisma);

    const result = await useCase.execute('grid-1');

    expect(result.cellCount).toBe(0);
  });

  it('queries INCLUDED and FINAL_INCLUDED articles', async () => {
    const prisma = makePrisma();
    const useCase = new PopulateGridRowsUseCase(prisma);

    await useCase.execute('grid-1');

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['INCLUDED', 'FINAL_INCLUDED'] },
        }),
      }),
    );
  });
});
