import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { createCerUpdateDecisionFinalizedEvent, createCerUpdateRequiredEvent } from '../../domain/events/pms-events.js';

interface FinalizeDecisionResult {
  id: string;
  pmsCycleId: string;
  conclusion: string;
  status: string;
  decidedAt: string;
}

export class FinalizeCerUpdateDecisionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(decisionId: string, userId: string): Promise<FinalizeDecisionResult> {
    const decision = await (this.prisma as any).cerUpdateDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundError('CerUpdateDecision', decisionId);
    }

    if (decision.status === 'FINALIZED') {
      throw new ValidationError('Decision is already finalized');
    }

    const now = new Date();

    await (this.prisma as any).cerUpdateDecision.update({
      where: { id: decisionId },
      data: { status: 'FINALIZED', decidedAt: now },
    });

    const cycle = await (this.prisma as any).pmsCycle.findUnique({
      where: { id: decision.pmsCycleId },
      select: { pmsPlanId: true },
    });

    const plan = cycle ? await (this.prisma as any).pmsPlan.findUnique({
      where: { id: cycle.pmsPlanId },
      select: { projectId: true },
    }) : null;

    const eventData = {
      decisionId,
      pmsCycleId: decision.pmsCycleId,
      conclusion: decision.conclusion,
      projectId: plan?.projectId ?? '',
    };

    const finalizedEvent = createCerUpdateDecisionFinalizedEvent(eventData, userId, crypto.randomUUID());
    void this.eventBus.publish(finalizedEvent);

    if (decision.conclusion === 'CER_UPDATE_REQUIRED' || decision.conclusion === 'CER_PATCH_REQUIRED') {
      const updateEvent = createCerUpdateRequiredEvent(eventData, userId, crypto.randomUUID());
      void this.eventBus.publish(updateEvent);
    }

    return {
      id: decisionId,
      pmsCycleId: decision.pmsCycleId,
      conclusion: decision.conclusion,
      status: 'FINALIZED',
      decidedAt: now.toISOString(),
    };
  }
}
