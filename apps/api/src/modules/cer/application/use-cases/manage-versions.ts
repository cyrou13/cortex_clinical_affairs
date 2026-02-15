import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, LockConflictError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createCerVersionCreatedEvent } from '../../domain/events/cer-events.js';

// ── Types ───────────────────────────────────────────────────────────────

export const VERSION_TYPES = ['INITIAL', 'ANNUAL_UPDATE', 'PATCH_UPDATE'] as const;
export type VersionType = (typeof VERSION_TYPES)[number];

export interface CreateVersionInput {
  projectId: string;
  previousVersionId?: string;
  versionType: string;
  userId: string;
}

export interface CreateVersionResult {
  cerVersionId: string;
  versionNumber: string;
  versionType: string;
  duplicatedSections: number;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ManageVersionsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateVersionInput): Promise<CreateVersionResult> {
    // Validate version type
    if (!VERSION_TYPES.includes(input.versionType as VersionType)) {
      throw new ValidationError(`Invalid version type: ${input.versionType}`);
    }

    // Verify project exists
    const project = await (this.prisma as any).project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project', input.projectId);
    }

    let previousVersion: any = null;
    let versionNumber: string;

    if (input.previousVersionId) {
      // Fetch previous version
      previousVersion = await (this.prisma as any).cerVersion.findUnique({
        where: { id: input.previousVersionId },
        select: { id: true, status: true, versionNumber: true, projectId: true },
      });

      if (!previousVersion) {
        throw new NotFoundError('CerVersion', input.previousVersionId);
      }

      if (previousVersion.projectId !== input.projectId) {
        throw new ValidationError('Previous version does not belong to this project');
      }

      // Previous version must be locked to create a new one
      if (previousVersion.status !== 'LOCKED') {
        throw new LockConflictError('CerVersion', input.previousVersionId);
      }

      // Compute new version number
      versionNumber = this.incrementVersion(
        previousVersion.versionNumber,
        input.versionType as VersionType,
      );
    } else {
      // Initial version
      if (input.versionType !== 'INITIAL') {
        throw new ValidationError('First version must be of type INITIAL');
      }
      versionNumber = '1.0';
    }

    const cerVersionId = crypto.randomUUID();

    // Create new CER version
    await (this.prisma as any).cerVersion.create({
      data: {
        id: cerVersionId,
        projectId: input.projectId,
        versionNumber,
        versionType: input.versionType,
        status: 'DRAFT',
        previousVersionId: input.previousVersionId ?? null,
        createdById: input.userId,
      },
    });

    let duplicatedSections = 0;

    // Duplicate sections and related records from previous version
    if (input.previousVersionId) {
      duplicatedSections = await this.duplicateSections(
        input.previousVersionId,
        cerVersionId,
      );

      await this.duplicateRelatedRecords(input.previousVersionId, cerVersionId);
    }

    // Emit event
    const event = createCerVersionCreatedEvent(
      {
        cerVersionId,
        projectId: input.projectId,
        versionType: input.versionType,
        versionNumber,
        previousVersionId: input.previousVersionId,
      },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      cerVersionId,
      versionNumber,
      versionType: input.versionType,
      duplicatedSections,
    };
  }

  private incrementVersion(current: string, type: VersionType): string {
    const parts = current.split('.');
    const major = parseInt(parts[0] ?? '1', 10);
    const minor = parseInt(parts[1] ?? '0', 10);

    if (type === 'ANNUAL_UPDATE') {
      return `${major + 1}.0`;
    }
    // PATCH_UPDATE
    return `${major}.${minor + 1}`;
  }

  private async duplicateSections(
    fromVersionId: string,
    toVersionId: string,
  ): Promise<number> {
    const sections = await (this.prisma as any).cerSection.findMany({
      where: { cerVersionId: fromVersionId },
      orderBy: { orderIndex: 'asc' },
    });

    for (const section of sections) {
      await (this.prisma as any).cerSection.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId: toVersionId,
          sectionType: section.sectionType,
          title: section.title,
          orderIndex: section.orderIndex,
          content: section.content,
          status: 'DRAFT',
          previousSectionId: section.id,
        },
      });
    }

    return sections.length;
  }

  private async duplicateRelatedRecords(
    fromVersionId: string,
    toVersionId: string,
  ): Promise<void> {
    // Duplicate ClaimTrace records
    const claimTraces = await (this.prisma as any).claimTrace.findMany({
      where: { cerVersionId: fromVersionId },
    });

    for (const trace of claimTraces) {
      await (this.prisma as any).claimTrace.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId: toVersionId,
          claimId: trace.claimId,
          sectionType: trace.sectionType,
          evidenceReference: trace.evidenceReference,
          traceType: trace.traceType,
        },
      });
    }

    // Duplicate CrossReference records
    const crossRefs = await (this.prisma as any).crossReference.findMany({
      where: { cerVersionId: fromVersionId },
    });

    for (const ref of crossRefs) {
      await (this.prisma as any).crossReference.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId: toVersionId,
          sourceSectionType: ref.sourceSectionType,
          targetSectionType: ref.targetSectionType,
          description: ref.description,
        },
      });
    }

    // Duplicate BibliographyEntry records
    const bibEntries = await (this.prisma as any).bibliographyEntry.findMany({
      where: { cerVersionId: fromVersionId },
    });

    for (const entry of bibEntries) {
      await (this.prisma as any).bibliographyEntry.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId: toVersionId,
          citationKey: entry.citationKey,
          title: entry.title,
          authors: entry.authors,
          journal: entry.journal,
          year: entry.year,
          doi: entry.doi,
          referenceType: entry.referenceType,
        },
      });
    }
  }
}
