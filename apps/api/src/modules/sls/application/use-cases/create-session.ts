import type { PrismaClient, Prisma } from '@prisma/client';
import { CreateSlsSessionInput, generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { getScopeFieldsForType } from '../../domain/value-objects/session-type.js';
import type { SlsSessionType } from '@cortex/shared';

// Use 'any' for Prisma models not yet in generated client (SlsSession added in sls.prisma)
type PrismaWithSls = PrismaClient & { slsSession: any };

export class CreateSlsSessionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: unknown, userId: string) {
    const parsed = CreateSlsSessionInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { name, type, projectId, scopeFields } = parsed.data;

    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { cep: true },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Validate project has a configured CEP
    if (!project.cep) {
      throw new ValidationError('Project must have a configured CEP before creating an SLS session');
    }

    // Get scope field definitions for the session type
    const _fieldDefs = getScopeFieldsForType(type as SlsSessionType);

    const sessionId = generateId();

    const session = await (this.prisma as PrismaWithSls).slsSession.create({
      data: {
        id: sessionId,
        projectId,
        cepId: project.cep.id,
        name,
        type,
        status: 'DRAFT',
        scopeFields: (scopeFields ?? null) as Prisma.InputJsonValue,
        createdById: userId,
      },
      include: {
        articles: true,
        queries: true,
        exclusionCodes: true,
      },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.session.created',
        targetType: 'slsSession',
        targetId: sessionId,
        after: { name, type, projectId, scopeFields } as unknown as Prisma.InputJsonValue,
      },
    });

    return session;
  }
}
