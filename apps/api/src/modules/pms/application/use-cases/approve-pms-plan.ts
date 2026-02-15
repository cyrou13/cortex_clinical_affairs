import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { canTransitionPlan } from '../../domain/value-objects/plan-status.js';
import { createPmsPlanApprovedEvent } from '../../domain/events/pms-events.js';

interface ApprovePmsPlanResult {
  pmsPlanId: string;
  status: string;
  approvedAt: string;
}

export class ApprovePmsPlanUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(pmsPlanId: string, userId: string): Promise<ApprovePmsPlanResult> {
    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: pmsPlanId },
      select: { id: true, status: true, projectId: true },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', pmsPlanId);
    }

    if (!canTransitionPlan(plan.status, 'APPROVED')) {
      throw new ValidationError(`Cannot approve PMS plan in ${plan.status} status`);
    }

    const now = new Date();

    await this.prisma.pmsPlan.update({
      where: { id: pmsPlanId },
      data: { status: 'APPROVED', approvedAt: now, approvedById: userId },
    });

    const event = createPmsPlanApprovedEvent(
      { pmsPlanId, projectId: plan.projectId, status: 'APPROVED' },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return { pmsPlanId, status: 'APPROVED', approvedAt: now.toISOString() };
  }
}
