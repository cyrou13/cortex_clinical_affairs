import type { PrismaClient } from '@prisma/client';
import { isValidSoaType, getSectionsForType } from '../../domain/value-objects/soa-type.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface CreateSoaInput {
  projectId: string;
  name: string;
  type: string;
  description?: string;
  slsSessionIds: string[];
  userId: string;
}

interface CreateSoaResult {
  soaAnalysisId: string;
  name: string;
  type: string;
  sectionCount: number;
}

export class CreateSoaUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateSoaInput): Promise<CreateSoaResult> {
    if (!isValidSoaType(input.type)) {
      throw new ValidationError(`Invalid SOA type: ${input.type}`);
    }

    if (!input.name.trim()) {
      throw new ValidationError('SOA name is required');
    }

    if (input.slsSessionIds.length === 0) {
      throw new ValidationError('At least one locked SLS session must be linked');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project', input.projectId);
    }

    const sessions = await this.prisma.slsSession.findMany({
      where: {
        id: { in: input.slsSessionIds },
        projectId: input.projectId,
      },
      select: { id: true, status: true },
    });

    const unlockedSessions = sessions.filter((s: { status: string }) => s.status !== 'LOCKED');
    if (unlockedSessions.length > 0) {
      throw new ValidationError('All linked SLS sessions must be locked');
    }

    const foundIds = sessions.map((s: { id: string }) => s.id);
    const missingIds = input.slsSessionIds.filter((id) => !foundIds.includes(id));
    if (missingIds.length > 0) {
      throw new NotFoundError('SlsSession', missingIds.join(', '));
    }

    const sections = getSectionsForType(input.type as any);

    const soaId = crypto.randomUUID();

    await this.prisma.soaAnalysis.create({
      data: {
        id: soaId,
        projectId: input.projectId,
        name: input.name.trim(),
        type: input.type,
        status: 'DRAFT',
        description: input.description ?? null,
        createdById: input.userId,
      },
    });

    for (const sessionId of input.slsSessionIds) {
      await this.prisma.soaSlsLink.create({
        data: {
          id: crypto.randomUUID(),
          soaAnalysisId: soaId,
          slsSessionId: sessionId,
        },
      });
    }

    for (const section of sections) {
      await this.prisma.thematicSection.create({
        data: {
          id: crypto.randomUUID(),
          soaAnalysisId: soaId,
          sectionKey: section.key,
          title: section.title,
          orderIndex: section.orderIndex,
          status: 'DRAFT',
        },
      });
    }

    return {
      soaAnalysisId: soaId,
      name: input.name.trim(),
      type: input.type,
      sectionCount: sections.length,
    };
  }
}
