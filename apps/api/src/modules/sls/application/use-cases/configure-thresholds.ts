import type { PrismaClient, Prisma } from '@prisma/client';
import { ConfigureThresholdsInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class ConfigureThresholdsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async configureThresholds(
    sessionId: string,
    likelyRelevantThreshold: number,
    uncertainLowerThreshold: number,
    userId: string,
  ) {
    const parsed = ConfigureThresholdsInput.safeParse({
      likelyRelevantThreshold,
      uncertainLowerThreshold,
    });

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    // Validate session exists
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    const before = {
      likelyRelevantThreshold: session.likelyRelevantThreshold,
      uncertainLowerThreshold: session.uncertainLowerThreshold,
    };

    const updated = await this.prisma.slsSession.update({
      where: { id: sessionId },
      data: {
        likelyRelevantThreshold: parsed.data.likelyRelevantThreshold,
        uncertainLowerThreshold: parsed.data.uncertainLowerThreshold,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.session.thresholdsConfigured',
        targetType: 'slsSession',
        targetId: sessionId,
        before: before as unknown as Prisma.InputJsonValue,
        after: {
          likelyRelevantThreshold: parsed.data.likelyRelevantThreshold,
          uncertainLowerThreshold: parsed.data.uncertainLowerThreshold,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      likelyRelevantThreshold: updated.likelyRelevantThreshold,
      uncertainLowerThreshold: updated.uncertainLowerThreshold,
    };
  }

  async getThresholds(sessionId: string) {
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
      select: {
        likelyRelevantThreshold: true,
        uncertainLowerThreshold: true,
      },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    return {
      likelyRelevantThreshold: session.likelyRelevantThreshold as number,
      uncertainLowerThreshold: session.uncertainLowerThreshold as number,
    };
  }
}
