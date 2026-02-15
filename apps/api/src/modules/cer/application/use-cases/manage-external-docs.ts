import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { validateExternalDoc } from '../../domain/entities/external-document.js';

interface CreateExternalDocInput {
  cerVersionId: string;
  title: string;
  version: string;
  date: string;
  summary: string;
  documentType: string;
  userId: string;
}

interface UpdateExternalDocInput {
  documentId: string;
  title?: string;
  version?: string;
  date?: string;
  summary?: string;
  documentType?: string;
  userId: string;
}

interface DeleteExternalDocInput {
  documentId: string;
  userId: string;
}

export class ManageExternalDocsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateExternalDocInput) {
    // Check CER version exists and is editable
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, status: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    if (cerVersion.status === 'LOCKED') {
      throw new ValidationError('Cannot add external document to a locked CER version');
    }

    // Validate fields
    validateExternalDoc({
      title: input.title,
      version: input.version,
      date: input.date,
      summary: input.summary,
      documentType: input.documentType,
    });

    const doc = await this.prisma.cerExternalDocument.create({
      data: {
        id: crypto.randomUUID(),
        cerVersionId: input.cerVersionId,
        title: input.title.trim(),
        version: input.version.trim(),
        date: input.date,
        summary: input.summary.trim(),
        documentType: input.documentType,
        createdById: input.userId,
      },
    });

    return doc;
  }

  async update(input: UpdateExternalDocInput) {
    const doc = await this.prisma.cerExternalDocument.findUnique({
      where: { id: input.documentId },
      include: { cerVersion: { select: { id: true, status: true } } },
    });

    if (!doc) {
      throw new NotFoundError('CerExternalDocument', input.documentId);
    }

    if (doc.cerVersion?.status === 'LOCKED') {
      throw new ValidationError('Cannot update external document on a locked CER version');
    }

    const merged = {
      title: input.title ?? doc.title,
      version: input.version ?? doc.version,
      date: input.date ?? doc.date,
      summary: input.summary ?? doc.summary,
      documentType: input.documentType ?? doc.documentType,
    };

    validateExternalDoc(merged);

    const updated = await this.prisma.cerExternalDocument.update({
      where: { id: input.documentId },
      data: {
        title: merged.title.trim(),
        version: merged.version.trim(),
        date: merged.date,
        summary: merged.summary.trim(),
        documentType: merged.documentType,
      },
    });

    return updated;
  }

  async delete(input: DeleteExternalDocInput) {
    const doc = await this.prisma.cerExternalDocument.findUnique({
      where: { id: input.documentId },
      include: { cerVersion: { select: { id: true, status: true } } },
    });

    if (!doc) {
      throw new NotFoundError('CerExternalDocument', input.documentId);
    }

    if (doc.cerVersion?.status === 'LOCKED') {
      throw new ValidationError('Cannot delete external document from a locked CER version');
    }

    await this.prisma.cerExternalDocument.delete({
      where: { id: input.documentId },
    });

    return { deleted: true, documentId: input.documentId };
  }

  async list(cerVersionId: string) {
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    return this.prisma.cerExternalDocument.findMany({
      where: { cerVersionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
