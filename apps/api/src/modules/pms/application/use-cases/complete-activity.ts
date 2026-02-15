import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import {
  canTransitionActivity,
  type ActivityStatus,
} from '../../domain/value-objects/activity-status.js';
import { createActivityCompletedEvent } from '../../domain/events/pms-events.js';

interface CompleteActivityInput {
  activityId: string;
  findingsSummary: string;
  conclusions: string;
  dataCollected?: Record<string, unknown>;
  userId: string;
}

interface CompleteActivityResult {
  activityId: string;
  activityType: string;
  status: string;
  completedAt: string;
}

export class CompleteActivityUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CompleteActivityInput): Promise<CompleteActivityResult> {
    const activity = await this.prisma.pmcfActivity.findUnique({
      where: { id: input.activityId },
    });

    if (!activity) {
      throw new NotFoundError('PmcfActivity', input.activityId);
    }

    if (!canTransitionActivity(activity.status as ActivityStatus, 'COMPLETED')) {
      throw new ValidationError(`Cannot complete activity in ${activity.status} status`);
    }

    if (!input.findingsSummary.trim()) {
      throw new ValidationError('Findings summary is required to complete an activity');
    }

    if (!input.conclusions.trim()) {
      throw new ValidationError('Conclusions are required to complete an activity');
    }

    const now = new Date();

    await this.prisma.pmcfActivity.update({
      where: { id: input.activityId },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        findingsSummary: input.findingsSummary.trim(),
        conclusions: input.conclusions.trim(),
        dataCollected: input.dataCollected
          ? (input.dataCollected as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });

    const event = createActivityCompletedEvent(
      {
        activityId: input.activityId,
        pmsCycleId: activity.pmsCycleId,
        activityType: activity.activityType,
        status: 'COMPLETED',
      },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      activityId: input.activityId,
      activityType: activity.activityType,
      status: 'COMPLETED',
      completedAt: now.toISOString(),
    };
  }
}
