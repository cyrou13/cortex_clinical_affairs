import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolvePdfMismatchUseCase } from './resolve-pdf-mismatch.js';

function makeStorage() {
  return {
    uploadPdf: vi.fn().mockResolvedValue(undefined),
    getPdfUrl: vi.fn().mockResolvedValue(''),
    deletePdf: vi.fn().mockResolvedValue(undefined),
    pdfExists: vi.fn().mockResolvedValue(true),
  };
}

function makePrisma(article: Record<string, unknown> | null = {
  id: 'art-1',
  pdfStatus: 'MISMATCH',
  pdfStorageKey: 'projects/p/sessions/s/articles/art-1/fulltext.pdf',
}) {
  return {
    article: {
      findUnique: vi.fn().mockResolvedValue(article),
      update: vi.fn().mockResolvedValue({ ...article }),
    },
  } as any;
}

describe('ResolvePdfMismatchUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts mismatch and marks as VERIFIED', async () => {
    const prisma = makePrisma();
    const useCase = new ResolvePdfMismatchUseCase(prisma, makeStorage());

    const result = await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      resolution: 'ACCEPT_MISMATCH',
    });

    expect(result.newStatus).toBe('VERIFIED');
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { pdfStatus: 'VERIFIED' },
      }),
    );
  });

  it('rejects PDF and deletes from storage', async () => {
    const storage = makeStorage();
    const prisma = makePrisma();
    const useCase = new ResolvePdfMismatchUseCase(prisma, storage);

    const result = await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      resolution: 'REJECT_PDF',
    });

    expect(result.newStatus).toBe('NOT_FOUND');
    expect(storage.deletePdf).toHaveBeenCalled();
  });

  it('sets NONE status for re-upload', async () => {
    const storage = makeStorage();
    const prisma = makePrisma();
    const useCase = new ResolvePdfMismatchUseCase(prisma, storage);

    const result = await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      resolution: 'UPLOAD_CORRECT_PDF',
    });

    expect(result.newStatus).toBe('NONE');
    expect(storage.deletePdf).toHaveBeenCalled();
  });

  it('throws NotFoundError for missing article', async () => {
    const prisma = makePrisma(null);
    const useCase = new ResolvePdfMismatchUseCase(prisma, makeStorage());

    await expect(
      useCase.execute({ articleId: 'missing', userId: 'user-1', resolution: 'ACCEPT_MISMATCH' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when not in MISMATCH status', async () => {
    const prisma = makePrisma({ id: 'art-1', pdfStatus: 'VERIFIED', pdfStorageKey: null });
    const useCase = new ResolvePdfMismatchUseCase(prisma, makeStorage());

    await expect(
      useCase.execute({ articleId: 'art-1', userId: 'user-1', resolution: 'ACCEPT_MISMATCH' }),
    ).rejects.toThrow('not in MISMATCH status');
  });
});
