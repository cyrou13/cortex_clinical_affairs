import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface RecordCoiInput {
  evaluatorId: string;
  hasConflict: boolean;
  conflictDetails?: string;
  declarationText: string;
  userId: string;
}

export interface RecordCoiResult {
  evaluatorId: string;
  hasConflict: boolean;
  conflictDetails: string | null;
  coiDeclaredAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class RecordCoiDeclarationUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: RecordCoiInput): Promise<RecordCoiResult> {
    // Validate declaration text
    if (!input.declarationText.trim()) {
      throw new ValidationError('COI declaration text is required');
    }

    // If conflict exists, require details
    if (input.hasConflict && !input.conflictDetails?.trim()) {
      throw new ValidationError('Conflict details are required when a conflict of interest exists');
    }

    // Verify evaluator exists
    const evaluator = await this.prisma.evaluator.findUnique({
      where: { id: input.evaluatorId },
      select: { id: true, signedAt: true },
    });

    if (!evaluator) {
      throw new NotFoundError('Evaluator', input.evaluatorId);
    }

    // Cannot re-declare COI after signing
    if (evaluator.signedAt) {
      throw new ValidationError('Cannot modify COI declaration after signing');
    }

    const now = new Date();

    await this.prisma.evaluator.update({
      where: { id: input.evaluatorId },
      data: {
        hasConflict: input.hasConflict,
        conflictDetails: input.hasConflict ? input.conflictDetails : null,
        coiDeclarationText: input.declarationText,
        coiDeclaredAt: now,
      },
    });

    return {
      evaluatorId: input.evaluatorId,
      hasConflict: input.hasConflict,
      conflictDetails: input.hasConflict ? (input.conflictDetails ?? null) : null,
      coiDeclaredAt: now.toISOString(),
    };
  }
}
