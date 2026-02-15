import type { PrismaClient, Prisma } from '@prisma/client';
import { CreateProjectInput, generateId } from '@cortex/shared';
import { createProjectCreatedEvent } from '../../domain/events/project-created.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { ValidationError } from '../../../../shared/errors/index.js';

export class CreateProjectUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    input: unknown,
    userId: string,
    requestId: string,
  ) {
    const parsed = CreateProjectInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i: { message: string }) => i.message).join(', '));
    }

    const { name, deviceName, deviceClass, regulatoryContext } = parsed.data;
    const projectId = generateId();

    const project = await this.prisma.project.create({
      data: {
        id: projectId,
        name,
        deviceName,
        deviceClass,
        regulatoryContext,
        createdBy: userId,
        cep: {
          create: {
            id: generateId(),
          },
        },
        members: {
          create: {
            id: generateId(),
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        cep: true,
        members: {
          include: { user: true },
        },
      },
    });

    // Emit domain event (fire-and-forget)
    const event = createProjectCreatedEvent(
      {
        projectId,
        name,
        deviceName,
        regulatoryContext,
        createdBy: userId,
      },
      requestId,
    );
    void this.eventBus.publish(event);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'project.created',
        targetType: 'project',
        targetId: projectId,
        after: { name, deviceName, deviceClass, regulatoryContext } as unknown as Prisma.InputJsonValue,
        metadata: { requestId } as Prisma.InputJsonValue,
      },
    });

    return project;
  }
}
