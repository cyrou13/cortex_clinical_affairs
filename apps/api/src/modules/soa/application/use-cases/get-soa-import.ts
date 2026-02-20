import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface SoaImportResult {
  id: string;
  projectId: string;
  status: string;
  sourceFileName: string;
  sourceFormat: string;
  extractedData: unknown;
  gapReport: unknown;
  taskId: string | null;
  soaAnalysisId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetSoaImportUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(importId: string): Promise<SoaImportResult> {
    const soaImport = await (this.prisma as any).soaImport.findUnique({
      where: { id: importId },
    });

    if (!soaImport) {
      throw new NotFoundError('SoaImport', importId);
    }

    return soaImport;
  }
}
