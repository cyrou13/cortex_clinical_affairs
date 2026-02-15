import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export type GsprComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE';

export interface MapGsprInput {
  validationStudyId: string;
  gsprId: string;
  status: GsprComplianceStatus;
  justification?: string;
  evidenceReferences?: string[];
  userId: string;
}

export interface DeleteGsprMappingInput {
  validationStudyId: string;
  gsprId: string;
  userId: string;
}

export interface GsprMappingResult {
  id: string;
  validationStudyId: string;
  gsprId: string;
  status: GsprComplianceStatus;
  justification: string | null;
  evidenceReferences: string[];
}

// ── Use Case ────────────────────────────────────────────────────────────

export class MapGsprUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create or update a GSPR mapping for a validation study.
   *
   * Rules:
   * - Study must exist and not be locked
   * - PARTIAL or NOT_APPLICABLE status requires a justification
   * - No duplicate gsprId per study (upsert semantics)
   */
  async execute(input: MapGsprInput): Promise<GsprMappingResult> {
    const { validationStudyId, gsprId, status, justification, evidenceReferences, userId } = input;

    // Validate study exists and is not locked
    const study = await (this.prisma as any).validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, status: true },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    if (study.status === 'LOCKED') {
      throw new ValidationError('Cannot modify GSPR mappings on a locked validation study');
    }

    // Validate justification requirement
    if ((status === 'PARTIAL' || status === 'NOT_APPLICABLE') && !justification) {
      throw new ValidationError(
        `Justification is required when status is ${status}`,
      );
    }

    // Upsert: check if mapping already exists
    const existingMapping = await (this.prisma as any).gsprMapping.findFirst({
      where: {
        validationStudyId,
        gsprId,
      },
    });

    let mapping;

    if (existingMapping) {
      mapping = await (this.prisma as any).gsprMapping.update({
        where: { id: existingMapping.id },
        data: {
          status,
          justification: justification ?? null,
          evidenceReferences: (evidenceReferences ?? []) as unknown as Prisma.InputJsonValue,
          updatedById: userId,
          updatedAt: new Date(),
        },
      });
    } else {
      mapping = await (this.prisma as any).gsprMapping.create({
        data: {
          id: crypto.randomUUID(),
          validationStudyId,
          gsprId,
          status,
          justification: justification ?? null,
          evidenceReferences: (evidenceReferences ?? []) as unknown as Prisma.InputJsonValue,
          createdById: userId,
          updatedById: userId,
        },
      });
    }

    // Audit log
    void (this.prisma as any).auditLog.create({
      data: {
        userId,
        action: existingMapping ? 'gspr.mapping.updated' : 'gspr.mapping.created',
        targetType: 'gsprMapping',
        targetId: mapping.id,
        before: existingMapping
          ? ({
              status: existingMapping.status,
              justification: existingMapping.justification,
            } as unknown as Prisma.InputJsonValue)
          : (null as unknown as Prisma.InputJsonValue),
        after: {
          status,
          justification: justification ?? null,
          gsprId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: mapping.id,
      validationStudyId,
      gsprId,
      status,
      justification: justification ?? null,
      evidenceReferences: evidenceReferences ?? [],
    };
  }

  /**
   * Delete a GSPR mapping from a validation study.
   */
  async delete(input: DeleteGsprMappingInput): Promise<void> {
    const { validationStudyId, gsprId, userId } = input;

    const study = await (this.prisma as any).validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, status: true },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    if (study.status === 'LOCKED') {
      throw new ValidationError('Cannot modify GSPR mappings on a locked validation study');
    }

    const existingMapping = await (this.prisma as any).gsprMapping.findFirst({
      where: { validationStudyId, gsprId },
    });

    if (!existingMapping) {
      throw new NotFoundError('GsprMapping', gsprId);
    }

    await (this.prisma as any).gsprMapping.delete({
      where: { id: existingMapping.id },
    });

    // Audit log
    void (this.prisma as any).auditLog.create({
      data: {
        userId,
        action: 'gspr.mapping.deleted',
        targetType: 'gsprMapping',
        targetId: existingMapping.id,
        before: {
          status: existingMapping.status,
          gsprId,
        } as unknown as Prisma.InputJsonValue,
        after: null as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
