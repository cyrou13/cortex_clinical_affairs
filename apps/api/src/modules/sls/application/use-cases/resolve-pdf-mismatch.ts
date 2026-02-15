import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { StorageService } from '../../infrastructure/services/minio-storage-service.js';

type Resolution = 'ACCEPT_MISMATCH' | 'REJECT_PDF' | 'UPLOAD_CORRECT_PDF';

export class ResolvePdfMismatchUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  async execute(input: {
    articleId: string;
    userId: string;
    resolution: Resolution;
  }) {
    const { articleId, userId, resolution } = input;

    const article = await (this.prisma as any).article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    if (article.pdfStatus !== 'MISMATCH') {
      throw new ValidationError('Article PDF is not in MISMATCH status');
    }

    switch (resolution) {
      case 'ACCEPT_MISMATCH': {
        await (this.prisma as any).article.update({
          where: { id: articleId },
          data: { pdfStatus: 'VERIFIED' },
        });
        return { articleId, newStatus: 'VERIFIED' };
      }

      case 'REJECT_PDF': {
        if (article.pdfStorageKey) {
          await this.storage.deletePdf(article.pdfStorageKey);
        }
        await (this.prisma as any).article.update({
          where: { id: articleId },
          data: {
            pdfStatus: 'NOT_FOUND',
            pdfStorageKey: null,
            pdfSource: null,
            pdfVerificationResult: null,
          },
        });
        return { articleId, newStatus: 'NOT_FOUND' };
      }

      case 'UPLOAD_CORRECT_PDF': {
        // Delete old PDF, set status back to NONE for re-upload
        if (article.pdfStorageKey) {
          await this.storage.deletePdf(article.pdfStorageKey);
        }
        await (this.prisma as any).article.update({
          where: { id: articleId },
          data: {
            pdfStatus: 'NONE',
            pdfStorageKey: null,
            pdfSource: null,
            pdfVerificationResult: null,
          },
        });
        return { articleId, newStatus: 'NONE' };
      }

      default:
        throw new ValidationError(`Invalid resolution: ${resolution}`);
    }
  }
}
