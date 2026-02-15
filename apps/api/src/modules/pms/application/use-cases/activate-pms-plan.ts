import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { canTransitionPlan } from '../../domain/value-objects/plan-status.js';
import { createPmsPlanActivatedEvent } from '../../domain/events/pms-events.js';

interface ActivatePmsPlanResult {
  pmsPlanId: string;
  status: string;
  activatedAt: string;
}

export class ActivatePmsPlanUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(pmsPlanId: string, userId: string): Promise<ActivatePmsPlanResult> {
    const plan = await (this.prisma as any).pmsPlan.findUnique({
      where: { id: pmsPlanId },
      select: { id: true, status: true, projectId: true },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', pmsPlanId);
    }

    if (!canTransitionPlan(plan.status, 'ACTIVE')) {
      throw new ValidationError(`Cannot activate PMS plan in ${plan.status} status`);
    }

    const now = new Date();

    await (this.prisma as any).pmsPlan.update({
      where: { id: pmsPlanId },
      data: { status: 'ACTIVE', activatedAt: now },
    });

    const event = createPmsPlanActivatedEvent(
      { pmsPlanId, projectId: plan.projectId, status: 'ACTIVE' },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return { pmsPlanId, status: 'ACTIVE', activatedAt: now.toISOString() };
  }
}
