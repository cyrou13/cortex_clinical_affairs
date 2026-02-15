import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface LinkExternalDocToSectionInput {
  cerSectionId: string;
  externalDocumentId: string;
  referenceContext?: string;
  userId: string;
}

interface LinkExternalDocToSectionResult {
  linkId: string;
  cerSectionId: string;
  externalDocumentId: string;
}

export class LinkExternalDocToSectionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LinkExternalDocToSectionInput): Promise<LinkExternalDocToSectionResult> {
    const { cerSectionId, externalDocumentId, referenceContext, userId } = input;

    // Verify section exists
    const section = await (this.prisma as any).cerSection.findUnique({
      where: { id: cerSectionId },
      select: {
        id: true,
        cerVersionId: true,
        cerVersion: { select: { id: true, status: true } },
      },
    });

    if (!section) {
      throw new NotFoundError('CerSection', cerSectionId);
    }

    if (section.cerVersion?.status === 'LOCKED') {
      throw new ValidationError('Cannot link document to a section on a locked CER version');
    }

    // Verify external document exists and belongs to the same CER version
    const doc = await (this.prisma as any).cerExternalDocument.findUnique({
      where: { id: externalDocumentId },
      select: { id: true, cerVersionId: true },
    });

    if (!doc) {
      throw new NotFoundError('CerExternalDocument', externalDocumentId);
    }

    if (doc.cerVersionId !== section.cerVersionId) {
      throw new ValidationError(
        'External document and section must belong to the same CER version',
      );
    }

    // Check for duplicate link
    const existingLink = await (this.prisma as any).cerSectionDocLink.findFirst({
      where: {
        cerSectionId,
        externalDocumentId,
      },
    });

    if (existingLink) {
      throw new ValidationError('External document is already linked to this section');
    }

    // Create link
    const linkId = crypto.randomUUID();

    await (this.prisma as any).cerSectionDocLink.create({
      data: {
        id: linkId,
        cerSectionId,
        externalDocumentId,
        referenceContext: referenceContext?.trim() ?? null,
        createdById: userId,
      },
    });

    return {
      linkId,
      cerSectionId,
      externalDocumentId,
    };
  }
}
