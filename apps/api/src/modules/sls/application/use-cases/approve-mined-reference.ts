import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class ApproveMinedReferenceUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async approve(input: { referenceId: string; userId: string }) {
    const { referenceId, userId } = input;

    const reference = await (this.prisma as any).minedReference.findUnique({
      where: { id: referenceId },
    });

    if (!reference) {
      throw new NotFoundError('MinedReference', referenceId);
    }

    if (reference.approvalStatus !== 'PENDING') {
      throw new ValidationError(`Reference already ${reference.approvalStatus.toLowerCase()}`);
    }

    // Create article from reference
    const article = await (this.prisma as any).article.create({
      data: {
        sessionId: reference.sessionId,
        title: reference.title,
        authors: reference.authors as unknown as Prisma.InputJsonValue,
        publicationYear: reference.year,
        journal: reference.journal,
        doi: reference.doi,
        pmid: reference.pmid,
        status: 'PENDING',
        sourceDatabase: 'REFERENCE_MINING',
      },
    });

    // Update reference approval status
    await (this.prisma as any).minedReference.update({
      where: { id: referenceId },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return { referenceId, articleId: article.id, status: 'APPROVED' };
  }

  async reject(input: { referenceId: string; userId: string; reason: string }) {
    const { referenceId, userId, reason } = input;

    const reference = await (this.prisma as any).minedReference.findUnique({
      where: { id: referenceId },
    });

    if (!reference) {
      throw new NotFoundError('MinedReference', referenceId);
    }

    if (reference.approvalStatus !== 'PENDING') {
      throw new ValidationError(`Reference already ${reference.approvalStatus.toLowerCase()}`);
    }

    await (this.prisma as any).minedReference.update({
      where: { id: referenceId },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return { referenceId, status: 'REJECTED' };
  }
}
