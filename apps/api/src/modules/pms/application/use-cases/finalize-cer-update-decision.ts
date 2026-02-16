import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import {
  createCerUpdateDecisionFinalizedEvent,
  createCerUpdateRequiredEvent,
} from '../../domain/events/pms-events.js';

interface FinalizeDecisionInput {
  decisionId: string;
  userId: string;
  newGapDescriptions?: Array<{
    description: string;
    severity: string;
    recommendedActivity: string;
  }>;
  resolvedGapIds?: string[];
}

interface FinalizeDecisionResult {
  id: string;
  pmsCycleId: string;
  conclusion: string;
  status: string;
  decidedAt: string;
  gapsResolved: number;
  newGapsCreated: number;
}

export class FinalizeCerUpdateDecisionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: FinalizeDecisionInput): Promise<FinalizeDecisionResult> {
    const decision = await this.prisma.cerUpdateDecision.findUnique({
      where: { id: input.decisionId },
    });

    if (!decision) {
      throw new NotFoundError('CerUpdateDecision', input.decisionId);
    }

    if (decision.status === 'FINALIZED') {
      throw new ValidationError('Decision is already finalized');
    }

    const now = new Date();

    // Get the PMS Plan ID for gap registry updates
    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: decision.pmsCycleId },
      select: { pmsPlanId: true, id: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', decision.pmsCycleId);
    }

    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: cycle.pmsPlanId },
      select: { projectId: true },
    });

    // Update Gap Registry: Resolve gaps
    let gapsResolved = 0;
    if (input.resolvedGapIds && input.resolvedGapIds.length > 0) {
      const resolveResult = await this.prisma.gapRegistryEntry.updateMany({
        where: {
          id: { in: input.resolvedGapIds },
          pmsPlanId: cycle.pmsPlanId,
          status: 'OPEN',
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          resolvedBy: input.userId,
          resolutionNotes: 'Resolved based on PMS cycle findings',
        },
      });
      gapsResolved = resolveResult.count;
    }

    // Update Gap Registry: Create new gaps
    let newGapsCreated = 0;
    if (input.newGapDescriptions && input.newGapDescriptions.length > 0) {
      for (const newGap of input.newGapDescriptions) {
        await this.prisma.gapRegistryEntry.create({
          data: {
            id: crypto.randomUUID(),
            pmsPlanId: cycle.pmsPlanId,
            sourceModule: 'PMS',
            sourceId: decision.pmsCycleId,
            description: newGap.description,
            severity: newGap.severity,
            recommendedActivity: newGap.recommendedActivity,
            status: 'OPEN',
            manuallyCreated: false,
          },
        });
        newGapsCreated++;
      }
    }

    // Update decision with gap counts
    await this.prisma.cerUpdateDecision.update({
      where: { id: input.decisionId },
      data: {
        status: 'FINALIZED',
        decidedAt: now,
        newGapsIdentified: newGapsCreated,
        gapsResolved,
      },
    });

    const eventData = {
      decisionId: input.decisionId,
      pmsCycleId: decision.pmsCycleId,
      conclusion: decision.conclusion,
      projectId: plan?.projectId ?? '',
    };

    const finalizedEvent = createCerUpdateDecisionFinalizedEvent(
      eventData,
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(finalizedEvent);

    if (
      decision.conclusion === 'CER_UPDATE_REQUIRED' ||
      decision.conclusion === 'CER_PATCH_REQUIRED'
    ) {
      const updateEvent = createCerUpdateRequiredEvent(
        eventData,
        input.userId,
        crypto.randomUUID(),
      );
      void this.eventBus.publish(updateEvent);
    }

    return {
      id: input.decisionId,
      pmsCycleId: decision.pmsCycleId,
      conclusion: decision.conclusion,
      status: 'FINALIZED',
      decidedAt: now.toISOString(),
      gapsResolved,
      newGapsCreated,
    };
  }
}
