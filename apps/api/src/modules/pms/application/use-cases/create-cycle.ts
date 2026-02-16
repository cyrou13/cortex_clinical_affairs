import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { createPmsCycleCreatedEvent } from '../../domain/events/pms-events.js';

interface CreateCycleInput {
  pmsPlanId: string;
  cerVersionId: string;
  name: string;
  startDate: string;
  endDate: string;
  userId: string;
}

interface CreateCycleResult {
  pmsCycleId: string;
  pmsPlanId: string;
  name: string;
  status: string;
  activityCount: number;
}

export class CreateCycleUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateCycleInput): Promise<CreateCycleResult> {
    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: input.pmsPlanId },
      select: { id: true, status: true, projectId: true },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', input.pmsPlanId);
    }

    if (plan.status !== 'APPROVED' && plan.status !== 'ACTIVE') {
      throw new ValidationError('PMS plan must be APPROVED or ACTIVE to create a cycle');
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    // Check for overlapping cycles
    const overlappingCycles = await this.prisma.pmsCycle.findMany({
      where: {
        pmsPlanId: input.pmsPlanId,
        OR: [
          {
            AND: [{ startDate: { lte: startDate } }, { endDate: { gte: startDate } }],
          },
          {
            AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate } }],
          },
          {
            AND: [{ startDate: { gte: startDate } }, { endDate: { lte: endDate } }],
          },
        ],
      },
    });

    if (overlappingCycles.length > 0) {
      throw new ValidationError(
        `Cycle date range overlaps with existing cycle: ${overlappingCycles[0]!.name}`,
      );
    }

    const cycleId = crypto.randomUUID();

    await this.prisma.pmsCycle.create({
      data: {
        id: cycleId,
        pmsPlanId: input.pmsPlanId,
        cerVersionId: input.cerVersionId,
        name: input.name.trim(),
        startDate,
        endDate,
        status: 'PLANNED',
        createdById: input.userId,
      },
    });

    const responsibilities = await this.prisma.pmsResponsibility.findMany({
      where: { pmsPlanId: input.pmsPlanId },
    });

    for (const resp of responsibilities) {
      await this.prisma.pmcfActivity.create({
        data: {
          id: crypto.randomUUID(),
          pmsCycleId: cycleId,
          activityType: resp.activityType,
          assigneeId: resp.userId,
          title: `${resp.activityType} - ${input.name}`,
          description: resp.description ?? null,
          status: 'PLANNED',
        },
      });
    }

    const event = createPmsCycleCreatedEvent(
      { pmsCycleId: cycleId, pmsPlanId: input.pmsPlanId, status: 'PLANNED' },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      pmsCycleId: cycleId,
      pmsPlanId: input.pmsPlanId,
      name: input.name.trim(),
      status: 'PLANNED',
      activityCount: responsibilities.length,
    };
  }
}
