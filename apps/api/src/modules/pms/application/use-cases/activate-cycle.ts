import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { canTransitionCycle, type CycleStatus } from '../../domain/value-objects/cycle-status.js';
import { createPmsCycleActivatedEvent } from '../../domain/events/pms-events.js';

interface ActivateCycleResult {
  pmsCycleId: string;
  status: string;
  activatedAt: string;
}

export class ActivateCycleUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cycleId: string, userId: string): Promise<ActivateCycleResult> {
    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: cycleId },
      select: { id: true, status: true, pmsPlanId: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', cycleId);
    }

    if (!canTransitionCycle(cycle.status as CycleStatus, 'ACTIVE')) {
      throw new ValidationError(`Cannot activate cycle in ${cycle.status} status`);
    }

    const activityCount = await this.prisma.pmcfActivity.count({
      where: { pmsCycleId: cycleId },
    });

    if (activityCount === 0) {
      throw new ValidationError('Cannot activate cycle with no activities');
    }

    const now = new Date();

    await this.prisma.pmsCycle.update({
      where: { id: cycleId },
      data: { status: 'ACTIVE', activatedAt: now },
    });

    const event = createPmsCycleActivatedEvent(
      { pmsCycleId: cycleId, pmsPlanId: cycle.pmsPlanId, status: 'ACTIVE' },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return { pmsCycleId: cycleId, status: 'ACTIVE', activatedAt: now.toISOString() };
  }
}
