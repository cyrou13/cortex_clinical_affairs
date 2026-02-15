import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MineReferencesUseCase } from './mine-references.js';

function makePrisma(overrides?: {
  session?: Record<string, unknown> | null;
  articles?: Array<Record<string, unknown>>;
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(overrides?.session !== undefined ? overrides.session : { id: 'sess-1' }),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(overrides?.articles ?? [
        { id: 'art-1' },
        { id: 'art-2' },
      ]),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({ id: 'task-1' }),
    },
  } as any;
}

describe('MineReferencesUseCase', () => {
  let mockEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueue = vi.fn().mockResolvedValue('job-1');
  });

  it('creates async task and enqueues job', async () => {
    const prisma = makePrisma();
    const useCase = new MineReferencesUseCase(prisma, mockEnqueue);

    const result = await useCase.execute({
      sessionId: 'sess-1',
      articleIds: ['art-1', 'art-2'],
      userId: 'user-1',
    });

    expect(result.taskId).toBe('task-1');
    expect(result.articleCount).toBe(2);
    expect(mockEnqueue).toHaveBeenCalledWith(
      'sls:mine-references',
      expect.objectContaining({
        sessionId: 'sess-1',
        articleIds: ['art-1', 'art-2'],
      }),
    );
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma({ session: null });
    const useCase = new MineReferencesUseCase(prisma, mockEnqueue);

    await expect(
      useCase.execute({ sessionId: 'missing', articleIds: ['art-1'], userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when no articles with PDFs', async () => {
    const prisma = makePrisma({ articles: [] });
    const useCase = new MineReferencesUseCase(prisma, mockEnqueue);

    await expect(
      useCase.execute({ sessionId: 'sess-1', articleIds: ['art-1'], userId: 'user-1' }),
    ).rejects.toThrow('No articles with PDFs');
  });

  it('only includes articles that have PDFs', async () => {
    const prisma = makePrisma();
    const useCase = new MineReferencesUseCase(prisma, mockEnqueue);

    await useCase.execute({ sessionId: 'sess-1', articleIds: ['art-1', 'art-3'], userId: 'user-1' });

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pdfStorageKey: { not: null },
        }),
      }),
    );
  });
});
