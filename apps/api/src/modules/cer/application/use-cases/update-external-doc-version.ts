import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { validateExternalDoc } from '../../domain/entities/external-document.js';

interface UpdateExternalDocVersionInput {
  documentId: string;
  newVersion: string;
  newDate: string;
  newSummary?: string;
  userId: string;
}

interface ExternalDocVersionChangedData {
  documentId: string;
  cerVersionId: string;
  previousVersion: string;
  newVersion: string;
  impactedSectionIds: string[];
}

interface UpdateExternalDocVersionResult {
  documentId: string;
  previousVersion: string;
  newVersion: string;
  archivedHistoryId: string;
  impactedSectionCount: number;
}

export class UpdateExternalDocVersionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: UpdateExternalDocVersionInput): Promise<UpdateExternalDocVersionResult> {
    const { documentId, newVersion, newDate, newSummary, userId } = input;

    // Fetch document
    const doc = await (this.prisma as any).cerExternalDocument.findUnique({
      where: { id: documentId },
      include: { cerVersion: { select: { id: true, status: true } } },
    });

    if (!doc) {
      throw new NotFoundError('CerExternalDocument', documentId);
    }

    if (doc.cerVersion?.status === 'LOCKED') {
      throw new ValidationError('Cannot update document version on a locked CER');
    }

    if (!newVersion.trim()) {
      throw new ValidationError('New version is required');
    }

    if (!newDate.trim()) {
      throw new ValidationError('New date is required');
    }

    const previousVersion = doc.version;

    // Archive current version to history
    const historyId = crypto.randomUUID();
    await (this.prisma as any).cerExternalDocumentHistory.create({
      data: {
        id: historyId,
        documentId,
        version: doc.version,
        date: doc.date,
        summary: doc.summary,
        archivedAt: new Date().toISOString(),
        archivedById: userId,
      },
    });

    // Update document with new version
    await (this.prisma as any).cerExternalDocument.update({
      where: { id: documentId },
      data: {
        version: newVersion.trim(),
        date: newDate,
        summary: newSummary?.trim() ?? doc.summary,
      },
    });

    // Find sections referencing this document
    const sectionLinks = await (this.prisma as any).cerSectionDocLink.findMany({
      where: { externalDocumentId: documentId },
      select: { cerSectionId: true },
    });

    const impactedSectionIds = sectionLinks.map(
      (link: { cerSectionId: string }) => link.cerSectionId,
    );

    // Flag impacted sections with version mismatch warning
    if (impactedSectionIds.length > 0) {
      await (this.prisma as any).cerSection.updateMany({
        where: { id: { in: impactedSectionIds } },
        data: { versionMismatchWarning: true },
      });
    }

    // Emit event
    const event = {
      eventType: 'cer.external-doc.version-changed',
      aggregateId: documentId,
      aggregateType: 'CerExternalDocument',
      data: {
        documentId,
        cerVersionId: doc.cerVersionId,
        previousVersion,
        newVersion,
        impactedSectionIds,
      } as ExternalDocVersionChangedData,
      metadata: {
        userId,
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
        version: 1,
      },
    };

    void this.eventBus.publish(event);

    return {
      documentId,
      previousVersion,
      newVersion,
      archivedHistoryId: historyId,
      impactedSectionCount: impactedSectionIds.length,
    };
  }
}
