import type { PrismaClient, Prisma } from '@prisma/client';
import { ConfigureCepInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class ConfigureCepUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string, input: unknown, userId: string) {
    const parsed = ConfigureCepInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i: { message: string }) => i.message).join(', '));
    }

    // Check project is still editable (not archived/completed)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }
    if (project.status !== 'ACTIVE') {
      throw new ValidationError(`Cannot modify CEP: project is ${project.status}`);
    }

    const cep = await this.prisma.cep.findUnique({
      where: { projectId },
    });

    if (!cep) {
      throw new NotFoundError('Cep', projectId);
    }

    const before = {
      scope: cep.scope,
      objectives: cep.objectives,
      deviceClassification: cep.deviceClassification,
      clinicalBackground: cep.clinicalBackground,
      searchStrategy: cep.searchStrategy,
    };

    const updated = await this.prisma.cep.update({
      where: { projectId },
      data: parsed.data,
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cep.configured',
        targetType: 'cep',
        targetId: cep.id,
        before: before as unknown as Prisma.InputJsonValue,
        after: parsed.data as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }
}
