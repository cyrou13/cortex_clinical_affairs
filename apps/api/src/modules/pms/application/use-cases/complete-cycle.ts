import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { canTransitionCycle } from '../../domain/value-objects/cycle-status.js';
import { createPmsCycleCompletedEvent } from '../../domain/events/pms-events.js';

interface CompleteCycleResult {
  pmsCycleId: string;
  status: string;
  completedAt: string;
}

export class CompleteCycleUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cycleId: string, userId: string): Promise<CompleteCycleResult> {
    const cycle = await (this.prisma as any).pmsCycle.findUnique({
      where: { id: cycleId },
      select: { id: true, status: true, pmsPlanId: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', cycleId);
    }

    if (!canTransitionCycle(cycle.status, 'COMPLETED')) {
      throw new ValidationError(`Cannot complete cycle in ${cycle.status} status`);
    }

    const incompleteActivities = await (this.prisma as any).pmcfActivity.count({
      where: { pmsCycleId: cycleId, status: { not: 'COMPLETED' } },
    });

    if (incompleteActivities > 0) {
      throw new ValidationError(`Cannot complete cycle: ${incompleteActivities} activities are not completed`);
    }

    const now = new Date();

    await (this.prisma as any).pmsCycle.update({
      where: { id: cycleId },
      data: { status: 'COMPLETED', completedAt: now },
    });

    const event = createPmsCycleCompletedEvent(
      { pmsCycleId: cycleId, pmsPlanId: cycle.pmsPlanId, status: 'COMPLETED' },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return { pmsCycleId: cycleId, status: 'COMPLETED', completedAt: now.toISOString() };
  }
}
