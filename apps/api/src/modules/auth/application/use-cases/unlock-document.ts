import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { logger } from '../../../../shared/utils/logger.js';

interface UnlockInput {
  targetType: string;
  targetId: string;
  justification: string;
}

export class UnlockDocumentUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async unlock(input: UnlockInput, adminId: string) {
    if (!input.justification || input.justification.trim().length < 10) {
      throw new ValidationError('Justification must be at least 10 characters');
    }

    // Look up the entity based on targetType
    const entity = await this.findEntity(input.targetType, input.targetId);
    if (!entity) throw new NotFoundError(input.targetType, input.targetId);

    if (entity.status !== 'LOCKED') {
      throw new ValidationError(`${input.targetType} is not locked (current status: ${entity.status})`);
    }

    // Update status from LOCKED to DRAFT
    await this.updateEntityStatus(input.targetType, input.targetId, 'DRAFT');

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'document.unlock',
        targetType: input.targetType,
        targetId: input.targetId,
        before: { status: 'LOCKED' },
        after: { status: 'DRAFT' },
        metadata: { justification: input.justification.trim() },
      },
    });

    logger.info(
      { targetType: input.targetType, targetId: input.targetId, adminId },
      'Document unlocked by admin',
    );

    return true;
  }

  private async findEntity(
    targetType: string,
    targetId: string,
  ): Promise<{ status: string } | null> {
    switch (targetType) {
      case 'project':
        return this.prisma.project.findUnique({
          where: { id: targetId },
          select: { status: true },
        });
      default:
        // Future modules (SLS, SOA, etc.) will be added here
        throw new ValidationError(`Unsupported target type: ${targetType}`);
    }
  }

  private async updateEntityStatus(
    targetType: string,
    targetId: string,
    status: string,
  ): Promise<void> {
    switch (targetType) {
      case 'project':
        await this.prisma.project.update({
          where: { id: targetId },
          data: { status: status as 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' },
        });
        break;
      default:
        throw new ValidationError(`Unsupported target type: ${targetType}`);
    }
  }
}
