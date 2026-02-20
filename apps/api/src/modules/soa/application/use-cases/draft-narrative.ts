import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface DraftNarrativeInput {
  sectionId: string;
  soaAnalysisId: string;
  userId: string;
}

interface DraftNarrativeResult {
  taskId: string;
}

export class DraftNarrativeUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly enqueueJob: (queue: string, data: unknown) => Promise<string>,
  ) {}

  async execute(input: DraftNarrativeInput): Promise<DraftNarrativeResult> {
    const section = await this.prisma.thematicSection.findUnique({
      where: { id: input.sectionId },
      include: {
        soaAnalysis: { select: { id: true, status: true } },
      },
    });

    if (!section) {
      throw new NotFoundError('ThematicSection', input.sectionId);
    }

    if (section.soaAnalysis?.id !== input.soaAnalysisId) {
      throw new NotFoundError('ThematicSection', input.sectionId);
    }

    if (section.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot draft narrative on a locked SOA analysis');
    }

    if (section.status === 'FINALIZED') {
      throw new ValidationError('Cannot draft narrative on a finalized section');
    }

    const task = await this.prisma.asyncTask.create({
      data: {
        id: crypto.randomUUID(),
        type: 'SOA_DRAFT_NARRATIVE',
        status: 'PENDING',
        createdBy: input.userId,
        metadata: {
          sectionId: input.sectionId,
          soaAnalysisId: input.soaAnalysisId,
        },
      },
    });

    await this.enqueueJob('soa.draft-narrative', {
      taskId: task.id,
      sectionId: input.sectionId,
      soaAnalysisId: input.soaAnalysisId,
    });

    return { taskId: task.id };
  }
}
