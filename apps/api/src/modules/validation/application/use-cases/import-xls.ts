import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import {
  getSchemaForStudyType,
  validateXlsData,
  parseXlsContent,
} from '../../infrastructure/services/xls-parser-service.js';

interface ImportXlsInput {
  validationStudyId: string;
  fileName: string;
  headers: string[];
  rawRows: unknown[][];
  userId: string;
}

interface ImportXlsResult {
  dataImportId: string;
  version: number;
  rowCount: number;
  columnCount: number;
  warnings: string[];
}

export class ImportXlsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ImportXlsInput): Promise<ImportXlsResult> {
    const { validationStudyId, fileName, headers, rawRows, userId } = input;

    // Verify study exists and is not locked
    const study = await (this.prisma as any).validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, status: true, type: true },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    if (study.status === 'LOCKED') {
      throw new ValidationError('Cannot import data for a locked validation study');
    }

    // Parse XLS content
    const parsed = parseXlsContent(headers, rawRows);

    // Validate against schema
    const schema = getSchemaForStudyType(study.type);
    const validation = validateXlsData(parsed.headers, parsed.rows, schema);

    if (!validation.valid) {
      throw new ValidationError(
        `XLS validation failed: ${validation.errors.join('; ')}`,
      );
    }

    // Determine next version number
    const lastImport = await (this.prisma as any).dataImport.findFirst({
      where: { validationStudyId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastImport?.version ?? 0) + 1;

    // Create data import record
    const importId = crypto.randomUUID();
    await (this.prisma as any).dataImport.create({
      data: {
        id: importId,
        validationStudyId,
        fileName,
        version: nextVersion,
        isActive: true,
        rowCount: parsed.rowCount,
        columnCount: parsed.columnCount,
        data: parsed.rows as unknown as Prisma.InputJsonValue,
        headers: parsed.headers as unknown as Prisma.InputJsonValue,
        uploadedById: userId,
      },
    });

    // Deactivate previous active imports
    await (this.prisma as any).dataImport.updateMany({
      where: {
        validationStudyId,
        id: { not: importId },
        isActive: true,
      },
      data: { isActive: false },
    });

    return {
      dataImportId: importId,
      version: nextVersion,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      warnings: validation.warnings,
    };
  }
}
