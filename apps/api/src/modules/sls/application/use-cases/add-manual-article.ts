import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface ExtractedMetadata {
  title: string;
  authors: Array<{ firstName: string; lastName: string }>;
  year: number | null;
  journal: string | null;
  doi: string | null;
  pmid: string | null;
}

export class AddManualArticleUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: {
    sessionId: string;
    userId: string;
    metadata: ExtractedMetadata;
    pdfStorageKey: string;
  }) {
    const { sessionId, userId, metadata, pdfStorageKey } = input;

    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Create article with PENDING status — enters screening funnel
    const article = await this.prisma.article.create({
      data: {
        sessionId,
        title: metadata.title,
        authors: metadata.authors as unknown as Prisma.InputJsonValue,
        publicationYear: metadata.year,
        journal: metadata.journal,
        doi: metadata.doi,
        pmid: metadata.pmid,
        status: 'PENDING',
        sourceDatabase: 'MANUAL',
        pdfStatus: 'MANUAL_UPLOAD',
        pdfStorageKey,
        source: 'MANUAL_UPLOAD',
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.article.manualAdd',
        targetType: 'article',
        targetId: article.id,
        after: {
          title: metadata.title,
          doi: metadata.doi,
          sessionId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      articleId: article.id,
      title: metadata.title,
      status: 'PENDING',
    };
  }
}
