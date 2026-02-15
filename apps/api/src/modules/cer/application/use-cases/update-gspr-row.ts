import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

type GsprStatus = 'COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE';

interface UpdateGsprRowInput {
  gsprMatrixRowId: string;
  status?: GsprStatus;
  evidenceReferences?: string[];
  notes?: string;
  userId: string;
}

interface UpdateGsprRowResult {
  id: string;
  gsprId: string;
  status: GsprStatus;
  evidenceReferences: string[];
  notes: string | null;
}

const VALID_STATUSES: GsprStatus[] = ['COMPLIANT', 'PARTIAL', 'NOT_APPLICABLE'];

// ── Use Case ────────────────────────────────────────────────────────────

export class UpdateGsprRowUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpdateGsprRowInput): Promise<UpdateGsprRowResult> {
    const { gsprMatrixRowId, status, evidenceReferences, notes, userId } = input;

    // 1. Fetch row
    const row = await (this.prisma as any).gsprMatrixRow.findUnique({
      where: { id: gsprMatrixRowId },
      select: {
        id: true,
        gsprId: true,
        status: true,
        evidenceReferences: true,
        notes: true,
      },
    });

    if (!row) {
      throw new NotFoundError('GsprMatrixRow', gsprMatrixRowId);
    }

    // 2. Validate status
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Invalid GSPR status: ${status}`);
    }

    // 3. Validate notes requirement for NOT_APPLICABLE
    const effectiveStatus = status ?? row.status;
    const effectiveNotes = notes !== undefined ? notes : row.notes;

    if (effectiveStatus === 'NOT_APPLICABLE' && !effectiveNotes) {
      throw new ValidationError('Notes are required when status is NOT_APPLICABLE');
    }

    // 4. Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedById: userId,
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (evidenceReferences !== undefined) {
      updateData.evidenceReferences = evidenceReferences as unknown as Prisma.InputJsonValue;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // 5. Persist
    await (this.prisma as any).gsprMatrixRow.update({
      where: { id: gsprMatrixRowId },
      data: updateData,
    });

    // 6. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.gspr-row.updated',
        targetType: 'gsprMatrixRow',
        targetId: gsprMatrixRowId,
        before: {
          status: row.status,
          notes: row.notes,
        } as unknown as Prisma.InputJsonValue,
        after: {
          status: effectiveStatus,
          notes: effectiveNotes,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: gsprMatrixRowId,
      gsprId: row.gsprId,
      status: effectiveStatus as GsprStatus,
      evidenceReferences: evidenceReferences ?? (Array.isArray(row.evidenceReferences) ? row.evidenceReferences : []),
      notes: effectiveNotes ?? null,
    };
  }
}
