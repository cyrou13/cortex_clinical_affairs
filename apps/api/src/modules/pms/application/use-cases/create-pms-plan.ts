import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { createPmsPlanCreatedEvent } from '../../domain/events/pms-events.js';

interface CreatePmsPlanInput {
  projectId: string;
  cerVersionId: string;
  updateFrequency: string;
  dataCollectionMethods: string[];
  userId: string;
}

interface CreatePmsPlanResult {
  pmsPlanId: string;
  projectId: string;
  cerVersionId: string;
  status: string;
}

export class CreatePmsPlanUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreatePmsPlanInput): Promise<CreatePmsPlanResult> {
    if (!input.updateFrequency.trim()) {
      throw new ValidationError('Update frequency is required');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project', input.projectId);
    }

    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, status: true, projectId: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    if (cerVersion.status !== 'LOCKED') {
      throw new ValidationError('CER version must be locked before creating a PMS plan');
    }

    if (cerVersion.projectId !== input.projectId) {
      throw new ValidationError('CER version does not belong to this project');
    }

    const planId = crypto.randomUUID();

    await this.prisma.pmsPlan.create({
      data: {
        id: planId,
        projectId: input.projectId,
        cerVersionId: input.cerVersionId,
        updateFrequency: input.updateFrequency.trim(),
        dataCollectionMethods: input.dataCollectionMethods,
        status: 'DRAFT',
        createdById: input.userId,
      },
    });

    const event = createPmsPlanCreatedEvent(
      { pmsPlanId: planId, projectId: input.projectId, status: 'DRAFT' },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      pmsPlanId: planId,
      projectId: input.projectId,
      cerVersionId: input.cerVersionId,
      status: 'DRAFT',
    };
  }
}
