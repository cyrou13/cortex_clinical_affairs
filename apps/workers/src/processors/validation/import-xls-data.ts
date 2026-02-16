/**
 * XLS Data Import Worker — BullMQ processor for async XLS processing.
 *
 * Handles asynchronous import of XLS validation data:
 * 1. Parse XLS file
 * 2. Validate schema
 * 3. Create DataImport record
 * 4. Store parsed rows
 * 5. Emit progress events
 */

import type { Job } from 'bullmq';
import { PrismaClient, type Prisma } from '@prisma/client';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';

// TODO: Move xls-parser-service to @cortex/shared package to avoid cross-package imports
// For now, these functions would be implemented in workers or imported from shared
// import { getSchemaForStudyType, validateXlsData, parseXlsContent } from '@cortex/shared';

// ── Types ───────────────────────────────────────────────────────────────

export interface ImportXlsJobData extends TaskJobData {
  metadata: {
    validationStudyId: string;
    fileName: string;
    headers: string[];
    rawRows: unknown[][];
    userId: string;
  };
}

export interface ImportXlsResult {
  taskId: string;
  dataImportId: string;
  version: number;
  rowCount: number;
  columnCount: number;
  warnings: string[];
}

// ── Processor ───────────────────────────────────────────────────────────

export class ImportXlsDataProcessor extends BaseProcessor {
  private prisma: PrismaClient | null = null;

  constructor(redis: ConstructorParameters<typeof BaseProcessor>[0]) {
    super(redis);
  }

  /**
   * Allow injection of PrismaClient for testing.
   */
  setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  private getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }
    return this.prisma;
  }

  async process(job: Job<ImportXlsJobData>): Promise<ImportXlsResult> {
    const { taskId, metadata } = job.data;
    const { validationStudyId, fileName, headers, rawRows, userId } = metadata;

    // 10% — Starting
    await this.reportProgress(job as unknown as Job<TaskJobData>, 10, {
      message: 'Starting XLS import...',
    });

    // Check cancellation
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // 25% — Verify study exists
    const prisma = this.getPrisma();
    const study = await prisma.validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, status: true, type: true },
    });

    if (!study) {
      throw new Error(`ValidationStudy not found: ${validationStudyId}`);
    }

    if (study.status === 'LOCKED') {
      throw new Error('Cannot import data for locked validation study');
    }

    // 40% — Parse XLS content
    await this.reportProgress(job as unknown as Job<TaskJobData>, 40, {
      message: 'Parsing XLS content...',
    });

    // TODO: Implement XLS parsing logic here
    // This should parse the rawRows array into structured data
    const parsed = {
      headers,
      rows: rawRows.map((row) =>
        headers.reduce(
          (obj, header, idx) => {
            obj[header] = row[idx];
            return obj;
          },
          {} as Record<string, unknown>,
        ),
      ),
      rowCount: rawRows.length,
      columnCount: headers.length,
    };

    // Check cancellation
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // 60% — Validate schema
    await this.reportProgress(job as unknown as Job<TaskJobData>, 60, {
      message: 'Validating data schema...',
    });

    // TODO: Implement schema validation
    // For now, accept all data
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // 75% — Determine version and create record
    await this.reportProgress(job as unknown as Job<TaskJobData>, 75, {
      message: 'Creating import record...',
    });

    const lastImport = await prisma.dataImport.findFirst({
      where: { validationStudyId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastImport?.version ?? 0) + 1;

    // Create data import record
    const importId = crypto.randomUUID();
    await prisma.dataImport.create({
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
        status: 'VALIDATED',
        uploadedById: userId,
      },
    });

    // 90% — Deactivate previous imports
    await this.reportProgress(job as unknown as Job<TaskJobData>, 90, {
      message: 'Updating active version...',
    });

    await prisma.dataImport.updateMany({
      where: {
        validationStudyId,
        id: { not: importId },
        isActive: true,
      },
      data: { isActive: false, status: 'SUPERSEDED' },
    });

    // Check cancellation
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // 100% — Complete
    await this.reportProgress(job as unknown as Job<TaskJobData>, 100, {
      message: `Import v${nextVersion} completed successfully`,
    });

    return {
      taskId,
      dataImportId: importId,
      version: nextVersion,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      warnings: validation.warnings,
    };
  }
}
