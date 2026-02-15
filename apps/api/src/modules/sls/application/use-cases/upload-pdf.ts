import type { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { StorageService } from '../../infrastructure/services/minio-storage-service.js';
import type { PdfVerificationService } from '../../infrastructure/services/pdf-verification-service.js';

export class UploadPdfUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
    private readonly verifier: PdfVerificationService,
  ) {}

  async execute(input: {
    articleId: string;
    userId: string;
    pdfBuffer: Buffer;
    pdfText: string;
    projectId: string;
    sessionId: string;
  }) {
    const { articleId, userId, pdfBuffer, pdfText, projectId, sessionId } = input;

    // Validate article exists
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Validate PDF content type (buffer starts with PDF magic bytes)
    if (!pdfBuffer.subarray(0, 5).toString().startsWith('%PDF')) {
      throw new ValidationError('Invalid file: not a PDF');
    }

    // Upload to MinIO
    const storageKey = `projects/${projectId}/sessions/${sessionId}/articles/${articleId}/fulltext.pdf`;
    await this.storage.uploadPdf(storageKey, pdfBuffer, {
      uploadedBy: userId,
      articleId,
    });

    // Verify PDF
    const verification = await this.verifier.verify(pdfText, {
      title: article.title ?? '',
      authors: (article.authors ?? []) as { firstName?: string; lastName: string }[],
    });

    const pdfStatus = verification.verified ? 'VERIFIED' : 'MISMATCH';

    // Update article
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        pdfStatus,
        pdfStorageKey: storageKey,
        source: 'MANUAL_UPLOAD',
        pdfVerificationResult: verification as unknown as Prisma.InputJsonValue,
      } as any,
    });

    return {
      articleId,
      pdfStatus,
      storageKey,
      verification,
    };
  }
}
