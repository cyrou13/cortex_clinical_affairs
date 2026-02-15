import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddManualArticleUseCase } from './add-manual-article.js';

function makePrisma(session: Record<string, unknown> | null = { id: 'sess-1' }) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(session),
    },
    article: {
      create: vi.fn().mockResolvedValue({ id: 'art-new', title: 'Test', status: 'PENDING' }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

const metadata = {
  title: 'Cervical Spine Outcomes Study',
  authors: [{ firstName: 'John', lastName: 'Smith' }],
  year: 2024,
  journal: 'Journal of Spine Surgery',
  doi: '10.1234/test',
  pmid: '12345678',
};

describe('AddManualArticleUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates article with PENDING status', async () => {
    const prisma = makePrisma();
    const useCase = new AddManualArticleUseCase(prisma);

    const result = await useCase.execute({
      sessionId: 'sess-1',
      userId: 'user-1',
      metadata,
      pdfStorageKey: 'projects/p/sessions/s/articles/a/fulltext.pdf',
    });

    expect(result.articleId).toBe('art-new');
    expect(result.status).toBe('PENDING');
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          sourceDatabase: 'MANUAL',
          pdfStatus: 'MANUAL_UPLOAD',
        }),
      }),
    );
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma(null);
    const useCase = new AddManualArticleUseCase(prisma);

    await expect(
      useCase.execute({ sessionId: 'missing', userId: 'user-1', metadata, pdfStorageKey: 'key' }),
    ).rejects.toThrow('not found');
  });

  it('stores all metadata fields', async () => {
    const prisma = makePrisma();
    const useCase = new AddManualArticleUseCase(prisma);

    await useCase.execute({
      sessionId: 'sess-1',
      userId: 'user-1',
      metadata,
      pdfStorageKey: 'key',
    });

    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Cervical Spine Outcomes Study',
          doi: '10.1234/test',
          pmid: '12345678',
          journal: 'Journal of Spine Surgery',
          publicationYear: 2024,
        }),
      }),
    );
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new AddManualArticleUseCase(prisma);

    await useCase.execute({
      sessionId: 'sess-1',
      userId: 'user-1',
      metadata,
      pdfStorageKey: 'key',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'sls.article.manualAdd',
        }),
      }),
    );
  });
});
