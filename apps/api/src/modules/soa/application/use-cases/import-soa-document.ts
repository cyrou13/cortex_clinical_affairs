import crypto from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface ImportSoaDocumentInput {
  projectId: string;
  fileName: string;
  fileContent: string; // base64
  fileFormat: 'PDF' | 'DOCX';
  userId: string;
}

interface ImportSoaDocumentResult {
  importId: string;
  taskId: string;
}

export class ImportSoaDocumentUseCase {
  constructor(
    private prisma: PrismaClient,
    private enqueueJob: (queue: string, data: unknown) => Promise<string>,
  ) {}

  async execute(input: ImportSoaDocumentInput): Promise<ImportSoaDocumentResult> {
    const { projectId, fileName, fileContent, fileFormat, userId } = input;

    // Validate format
    if (!['PDF', 'DOCX'].includes(fileFormat)) {
      throw new ValidationError('fileFormat must be PDF or DOCX');
    }

    // Validate project exists
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Validate base64 content
    const buffer = Buffer.from(fileContent, 'base64');
    if (buffer.length === 0) {
      throw new ValidationError('File content is empty');
    }

    const importId = crypto.randomUUID();
    const ext = fileFormat.toLowerCase();
    const storageKey = `imports/${projectId}/${importId}/source.${ext}`;

    // Create SoaImport record — store raw file content temporarily for worker access
    await (this.prisma as any).soaImport.create({
      data: {
        id: importId,
        projectId,
        status: 'PROCESSING',
        sourceFileName: fileName,
        sourceStorageKey: storageKey,
        sourceFormat: fileFormat,
        extractedData: { _rawFileContent: fileContent } as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    // Create AsyncTask
    const taskId = crypto.randomUUID();
    const metadata = {
      importId,
      projectId,
      storageKey,
      sourceFormat: fileFormat,
      fileName,
    } as unknown as Prisma.InputJsonValue;

    await (this.prisma as any).asyncTask.create({
      data: {
        id: taskId,
        type: 'soa.import-document',
        status: 'PENDING',
        progress: 0,
        metadata,
        createdBy: userId,
      },
    });

    // Update import with taskId
    await (this.prisma as any).soaImport.update({
      where: { id: importId },
      data: { taskId },
    });

    // Enqueue BullMQ job
    await this.enqueueJob('soa.import-document', {
      taskId,
      type: 'soa.import-document',
      metadata: { importId, projectId, storageKey, sourceFormat: fileFormat, fileName },
      createdBy: userId,
    });

    return { importId, taskId };
  }
}
