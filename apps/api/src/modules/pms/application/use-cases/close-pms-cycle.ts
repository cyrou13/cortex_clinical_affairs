import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { createRegulatoryLoopClosedEvent } from '../../domain/events/pms-events.js';

interface ClosePmsCycleResult {
  pmsCycleId: string;
  pmsPlanId: string;
  status: string;
  completedAt: string;
  psurGenerated: boolean;
  decisionFinalized: boolean;
}

export class ClosePmsCycleUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cycleId: string, userId: string): Promise<ClosePmsCycleResult> {
    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: cycleId },
      select: {
        id: true,
        pmsPlanId: true,
        status: true,
        completedAt: true,
        activities: {
          select: { status: true },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', cycleId);
    }

    // Validation: All activities must be completed
    const incompleteActivities = cycle.activities.filter((a) => a.status !== 'COMPLETED');
    if (incompleteActivities.length > 0) {
      throw new ValidationError(
        `Cannot close PMS cycle: ${incompleteActivities.length} activities are not completed`,
      );
    }

    // Validation: PSUR must be generated
    let psurGenerated = false;
    if ((this.prisma as any).psurReport) {
      const psurReport = await (this.prisma as any).psurReport.findFirst({
        where: { pmsCycleId: cycleId },
      });
      psurGenerated = psurReport !== null && psurReport !== undefined;
    }

    if (!psurGenerated) {
      throw new ValidationError('Cannot close PMS cycle: PSUR report must be generated');
    }

    // Validation: CER Update Decision must be finalized
    const decision = await this.prisma.cerUpdateDecision.findFirst({
      where: { pmsCycleId: cycleId, status: 'FINALIZED' },
    });

    if (!decision) {
      throw new ValidationError('Cannot close PMS cycle: CER Update Decision must be finalized');
    }

    // Mark cycle as COMPLETED if not already
    let completedAt = cycle.completedAt;
    if (cycle.status !== 'COMPLETED') {
      const now = new Date();
      await this.prisma.pmsCycle.update({
        where: { id: cycleId },
        data: { status: 'COMPLETED', completedAt: now },
      });
      completedAt = now;
    }

    // Get project ID for event
    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: cycle.pmsPlanId },
      select: { projectId: true },
    });

    // Emit regulatory loop closed event
    const event = createRegulatoryLoopClosedEvent(
      {
        pmsCycleId: cycleId,
        pmsPlanId: cycle.pmsPlanId,
        projectId: plan?.projectId ?? '',
        cerUpdateRequired:
          decision.conclusion === 'CER_UPDATE_REQUIRED' ||
          decision.conclusion === 'CER_PATCH_REQUIRED',
      },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      pmsCycleId: cycleId,
      pmsPlanId: cycle.pmsPlanId,
      status: 'COMPLETED',
      completedAt: completedAt?.toISOString() ?? new Date().toISOString(),
      psurGenerated: true,
      decisionFinalized: true,
    };
  }
}
