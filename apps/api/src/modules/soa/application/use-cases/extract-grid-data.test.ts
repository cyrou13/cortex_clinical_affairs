import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtractGridDataUseCase } from './extract-grid-data.js';

function makePrisma(overrides?: {
  grid?: Record<string, unknown> | null;
  columns?: Array<Record<string, unknown>>;
  links?: Array<Record<string, unknown>>;
  articles?: Array<Record<string, unknown>>;
}) {
  return {
    extractionGrid: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.grid !== undefined
            ? overrides.grid
            : { id: 'grid-1', soaAnalysis: { id: 'soa-1', status: 'IN_PROGRESS' } },
        ),
    },
    gridColumn: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.columns ?? [
          { id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT' },
          { id: 'col-2', name: 'year', displayName: 'Year', dataType: 'NUMERIC' },
        ],
      ),
    },
    soaSlsLink: {
      findMany: vi.fn().mockResolvedValue(overrides?.links ?? [{ slsSessionId: 'sess-1' }]),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.articles ?? [
          { id: 'art-1', title: 'Article 1' },
          { id: 'art-2', title: 'Article 2' },
        ],
      ),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({ id: 'task-1' }),
    },
  } as any;
}

describe('ExtractGridDataUseCase', () => {
  let mockEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueue = vi.fn().mockResolvedValue('job-1');
  });

  it('enqueues extraction job and creates async task', async () => {
    const prisma = makePrisma();
    const useCase = new ExtractGridDataUseCase(prisma, mockEnqueue);

    const result = await useCase.execute({ gridId: 'grid-1', userId: 'user-1' });

    expect(result.taskId).toBe('task-1');
    expect(result.articleCount).toBe(2);
    expect(result.columnCount).toBe(2);
    expect(mockEnqueue).toHaveBeenCalledWith(
      'soa.extract-grid-data',
      expect.objectContaining({
        extractionGridId: 'grid-1',
      }),
    );
  });

  it('throws for missing grid', async () => {
    const prisma = makePrisma({ grid: null });
    const useCase = new ExtractGridDataUseCase(prisma, mockEnqueue);

    await expect(useCase.execute({ gridId: 'missing', userId: 'user-1' })).rejects.toThrow(
      'not found',
    );
  });

  it('throws for locked SOA', async () => {
    const prisma = makePrisma({
      grid: { id: 'grid-1', soaAnalysis: { id: 'soa-1', status: 'LOCKED' } },
    });
    const useCase = new ExtractGridDataUseCase(prisma, mockEnqueue);

    await expect(useCase.execute({ gridId: 'grid-1', userId: 'user-1' })).rejects.toThrow('locked');
  });

  it('throws when no columns defined', async () => {
    const prisma = makePrisma({ columns: [] });
    const useCase = new ExtractGridDataUseCase(prisma, mockEnqueue);

    await expect(useCase.execute({ gridId: 'grid-1', userId: 'user-1' })).rejects.toThrow(
      'No columns',
    );
  });

  it('throws when no articles with PDFs', async () => {
    const prisma = makePrisma({ articles: [] });
    const useCase = new ExtractGridDataUseCase(prisma, mockEnqueue);

    await expect(useCase.execute({ gridId: 'grid-1', userId: 'user-1' })).rejects.toThrow(
      'No articles',
    );
  });

  it('filters by specific article IDs when provided', async () => {
    const prisma = makePrisma();
    const useCase = new ExtractGridDataUseCase(prisma, mockEnqueue);

    await useCase.execute({ gridId: 'grid-1', articleIds: ['art-1'], userId: 'user-1' });

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['art-1'] },
        }),
      }),
    );
  });
});
