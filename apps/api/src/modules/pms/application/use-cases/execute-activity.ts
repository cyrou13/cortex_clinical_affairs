import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { canTransitionActivity } from '../../domain/value-objects/activity-status.js';
import { createActivityStartedEvent } from '../../domain/events/pms-events.js';

interface ExecuteActivityResult {
  activityId: string;
  activityType: string;
  status: string;
  startedAt: string;
}

export class ExecuteActivityUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(activityId: string, userId: string): Promise<ExecuteActivityResult> {
    const activity = await this.prisma.pmcfActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundError('PmcfActivity', activityId);
    }

    if (!canTransitionActivity(activity.status, 'IN_PROGRESS')) {
      throw new ValidationError(`Cannot start activity in ${activity.status} status`);
    }

    const now = new Date();

    await this.prisma.pmcfActivity.update({
      where: { id: activityId },
      data: { status: 'IN_PROGRESS', startedAt: now },
    });

    const event = createActivityStartedEvent(
      { activityId, pmsCycleId: activity.pmsCycleId, activityType: activity.activityType, status: 'IN_PROGRESS' },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      activityId,
      activityType: activity.activityType,
      status: 'IN_PROGRESS',
      startedAt: now.toISOString(),
    };
  }
}
