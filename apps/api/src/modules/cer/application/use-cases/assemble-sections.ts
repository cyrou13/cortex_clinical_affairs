import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { MDR_SECTIONS } from '@cortex/shared';

interface AssembleSectionsInput {
  cerVersionId: string;
  userId: string;
}

interface AssembleSectionsResult {
  cerVersionId: string;
  sectionCount: number;
  sectionIds: string[];
  jobIds: string[];
}

export interface SectionJobEnqueuer {
  enqueue(
    queueName: string,
    jobData: {
      taskId: string;
      type: string;
      metadata: Record<string, unknown>;
      createdBy: string;
    },
  ): Promise<string>;
}

export class AssembleSectionsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jobEnqueuer: SectionJobEnqueuer,
  ) {}

  async execute(input: AssembleSectionsInput): Promise<AssembleSectionsResult> {
    const { cerVersionId, userId } = input;

    // Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true, status: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    if (cerVersion.status === 'LOCKED') {
      throw new ValidationError('Cannot assemble sections for a locked CER version');
    }

    // Verify upstream modules are linked
    const upstreamLinks = await this.prisma.cerUpstreamLink.findMany({
      where: { cerVersionId },
      select: { moduleType: true },
    });

    if (upstreamLinks.length === 0) {
      throw new ValidationError('CER must have linked upstream modules before assembling sections');
    }

    // Check for existing sections
    const existingSections = await this.prisma.cerSection.count({
      where: { cerVersionId },
    });

    if (existingSections > 0) {
      throw new ValidationError('Sections have already been assembled for this CER version');
    }

    // Create 14 sections
    const sectionIds: string[] = [];
    const jobIds: string[] = [];

    for (const mdrSection of MDR_SECTIONS) {
      const sectionId = crypto.randomUUID();
      sectionIds.push(sectionId);

      await this.prisma.cerSection.create({
        data: {
          id: sectionId,
          cerVersionId,
          sectionNumber: mdrSection.number,
          sectionType: mdrSection.number,
          title: mdrSection.title,
          description: mdrSection.description,
          status: 'DRAFT',
          orderIndex: parseInt(mdrSection.number, 10) - 1,
          versionMismatchWarning: false,
          createdById: userId,
        },
      });

      // Enqueue drafting job
      const taskId = crypto.randomUUID();
      const jobId = await this.jobEnqueuer.enqueue('cer:draft-section', {
        taskId,
        type: 'cer:draft-section',
        metadata: {
          cerVersionId,
          cerSectionId: sectionId,
          sectionNumber: mdrSection.number,
          sectionTitle: mdrSection.title,
          requiredUpstreamData: mdrSection.requiredUpstreamData,
        },
        createdBy: userId,
      });
      jobIds.push(jobId);
    }

    return {
      cerVersionId,
      sectionCount: MDR_SECTIONS.length,
      sectionIds,
      jobIds,
    };
  }
}
