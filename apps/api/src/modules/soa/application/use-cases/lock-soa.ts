import type { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  LockConflictError,
  ValidationError,
} from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createSoaLockedEvent } from '../../domain/events/soa-locked.js';

interface LockSoaInput {
  soaAnalysisId: string;
  userId: string;
}

interface LockSoaResult {
  soaAnalysisId: string;
  lockedAt: string;
  sectionCount: number;
}

export class LockSoaUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: LockSoaInput): Promise<LockSoaResult> {
    const { soaAnalysisId, userId } = input;

    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true, status: true, projectId: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    if (soa.status === 'LOCKED') {
      throw new LockConflictError('SoaAnalysis', soaAnalysisId);
    }

    const sections = await this.prisma.thematicSection.findMany({
      where: { soaAnalysisId },
      select: { id: true, status: true, title: true },
    });

    const nonFinalizedSections = sections.filter(
      (s: { status: string }) => s.status !== 'FINALIZED',
    );

    if (nonFinalizedSections.length > 0) {
      const titles = nonFinalizedSections.map((s: { title: string }) => s.title).join(', ');
      throw new ValidationError(
        `Cannot lock SOA: ${nonFinalizedSections.length} section(s) not finalized (${titles})`,
      );
    }

    const now = new Date();

    await this.prisma.soaAnalysis.update({
      where: { id: soaAnalysisId },
      data: {
        status: 'LOCKED',
        lockedAt: now,
        lockedById: userId,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'soa.analysis.locked',
        targetType: 'soaAnalysis',
        targetId: soaAnalysisId,
        before: { status: soa.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: 'LOCKED',
          sectionCount: sections.length,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Emit domain event
    const event = createSoaLockedEvent(
      {
        soaAnalysisId,
        projectId: soa.projectId,
        sectionCount: sections.length,
      },
      userId,
      crypto.randomUUID(),
    );

    void this.eventBus.publish(event);

    return {
      soaAnalysisId,
      lockedAt: now.toISOString(),
      sectionCount: sections.length,
    };
  }
}
