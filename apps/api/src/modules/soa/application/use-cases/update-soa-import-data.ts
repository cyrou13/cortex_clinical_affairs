import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { SoaExtractedData } from '@cortex/shared';

export class UpdateSoaImportDataUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(importId: string, editedData: SoaExtractedData): Promise<{ importId: string }> {
    const soaImport = await (this.prisma as any).soaImport.findUnique({
      where: { id: importId },
    });

    if (!soaImport) {
      throw new NotFoundError('SoaImport', importId);
    }

    if (soaImport.status !== 'REVIEW') {
      throw new ValidationError('Can only edit data when import is in REVIEW status');
    }

    await (this.prisma as any).soaImport.update({
      where: { id: importId },
      data: {
        extractedData: editedData as unknown as Prisma.InputJsonValue,
      },
    });

    return { importId };
  }
}
