import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadPdfUseCase } from './upload-pdf.js';
import type { PdfVerificationService } from '../../infrastructure/services/pdf-verification-service.js';

function makeStorage() {
  return {
    uploadPdf: vi.fn().mockResolvedValue(undefined),
    getPdfUrl: vi.fn().mockResolvedValue('https://minio/signed-url'),
    deletePdf: vi.fn().mockResolvedValue(undefined),
    pdfExists: vi.fn().mockResolvedValue(false),
  };
}

function makeVerifier(verified = true) {
  return {
    verify: vi.fn().mockResolvedValue({
      verified,
      confidence: verified ? 100 : 50,
      extractedTitle: 'Test Title',
      extractedAuthors: ['Smith'],
      mismatchReasons: verified ? [] : ['Title mismatch'],
    }),
  } as unknown as PdfVerificationService;
}

function makePrisma(
  article: Record<string, unknown> | null = { id: 'art-1', title: 'Test', authors: [] },
) {
  return {
    article: {
      findUnique: vi.fn().mockResolvedValue(article),
      update: vi.fn().mockResolvedValue({ ...article, pdfStatus: 'VERIFIED' }),
    },
  } as any;
}

// Valid PDF magic bytes
const validPdfBuffer = Buffer.from('%PDF-1.4 test content');

describe('UploadPdfUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads PDF and sets VERIFIED status', async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const verifier = makeVerifier(true);
    const useCase = new UploadPdfUseCase(prisma, storage, verifier);

    const result = await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      pdfBuffer: validPdfBuffer,
      pdfText: 'Test Title\nSmith J',
      projectId: 'proj-1',
      sessionId: 'sess-1',
    });

    expect(result.pdfStatus).toBe('VERIFIED');
    expect(storage.uploadPdf).toHaveBeenCalled();
  });

  it('sets MISMATCH status when verification fails', async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const verifier = makeVerifier(false);
    const useCase = new UploadPdfUseCase(prisma, storage, verifier);

    const result = await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      pdfBuffer: validPdfBuffer,
      pdfText: 'Different content',
      projectId: 'proj-1',
      sessionId: 'sess-1',
    });

    expect(result.pdfStatus).toBe('MISMATCH');
  });

  it('throws NotFoundError for missing article', async () => {
    const prisma = makePrisma(null);
    const useCase = new UploadPdfUseCase(prisma, makeStorage(), makeVerifier());

    await expect(
      useCase.execute({
        articleId: 'missing',
        userId: 'user-1',
        pdfBuffer: validPdfBuffer,
        pdfText: '',
        projectId: 'proj-1',
        sessionId: 'sess-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError for non-PDF file', async () => {
    const prisma = makePrisma();
    const useCase = new UploadPdfUseCase(prisma, makeStorage(), makeVerifier());

    await expect(
      useCase.execute({
        articleId: 'art-1',
        userId: 'user-1',
        pdfBuffer: Buffer.from('not a pdf file'),
        pdfText: '',
        projectId: 'proj-1',
        sessionId: 'sess-1',
      }),
    ).rejects.toThrow('not a PDF');
  });

  it('stores verification result in article', async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const verifier = makeVerifier(true);
    const useCase = new UploadPdfUseCase(prisma, storage, verifier);

    await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      pdfBuffer: validPdfBuffer,
      pdfText: 'Test',
      projectId: 'proj-1',
      sessionId: 'sess-1',
    });

    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pdfVerificationResult: expect.objectContaining({ verified: true }),
        }),
      }),
    );
  });

  it('uses correct storage key pattern', async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new UploadPdfUseCase(prisma, storage, makeVerifier());

    await useCase.execute({
      articleId: 'art-1',
      userId: 'user-1',
      pdfBuffer: validPdfBuffer,
      pdfText: '',
      projectId: 'proj-1',
      sessionId: 'sess-1',
    });

    expect(storage.uploadPdf).toHaveBeenCalledWith(
      'projects/proj-1/sessions/sess-1/articles/art-1/fulltext.pdf',
      expect.any(Buffer),
      expect.any(Object),
    );
  });
});
