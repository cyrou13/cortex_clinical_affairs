import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createPccpDeviationCreatedEvent } from '../../domain/events/cer-events.js';

// ── Types ───────────────────────────────────────────────────────────────

export const DEVIATION_SIGNIFICANCE = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type DeviationSignificance = (typeof DEVIATION_SIGNIFICANCE)[number];

export const DEVIATION_STATUS = ['IDENTIFIED', 'JUSTIFIED', 'APPROVED', 'RESOLVED'] as const;
export type DeviationStatus = (typeof DEVIATION_STATUS)[number];

export interface CreateDeviationInput {
  cerVersionId: string;
  pccpSection: string;
  description: string;
  expectedValue: string;
  actualValue: string;
  significance: string;
  justification?: string;
  impactedSections: string[];
  resolutionAction?: string;
  userId: string;
}

export interface UpdateDeviationInput {
  deviationId: string;
  description?: string;
  expectedValue?: string;
  actualValue?: string;
  significance?: string;
  justification?: string;
  impactedSections?: string[];
  resolutionAction?: string;
  status?: string;
  userId: string;
}

export interface DeleteDeviationInput {
  deviationId: string;
  userId: string;
}

export interface GetDeviationsInput {
  cerVersionId: string;
}

export interface DeviationResult {
  id: string;
  cerVersionId: string;
  pccpSection: string;
  description: string;
  expectedValue: string;
  actualValue: string;
  significance: string;
  justification: string | null;
  impactedSections: string[];
  resolutionAction: string | null;
  status: string;
  exceedsThreshold: boolean;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class TrackDeviationsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async create(input: CreateDeviationInput): Promise<DeviationResult> {
    // Validate significance
    if (!DEVIATION_SIGNIFICANCE.includes(input.significance as DeviationSignificance)) {
      throw new ValidationError(`Invalid significance: ${input.significance}`);
    }

    // Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, status: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    // Validate justification required for HIGH and CRITICAL
    const significance = input.significance as DeviationSignificance;
    if ((significance === 'HIGH' || significance === 'CRITICAL') && !input.justification?.trim()) {
      throw new ValidationError(
        `Justification is required for ${significance} significance deviations`,
      );
    }

    // Check configured thresholds
    const config = await (this.prisma as any).pccpDeviationConfig.findFirst({
      where: { cerVersionId: input.cerVersionId },
      select: { mandatoryJustificationLevel: true },
    });

    const mandatoryLevel = config?.mandatoryJustificationLevel ?? 'HIGH';
    const levelOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    const exceedsThreshold =
      (levelOrder[significance] ?? 0) >= (levelOrder[mandatoryLevel] ?? 2);

    if (exceedsThreshold && !input.justification?.trim()) {
      throw new ValidationError(
        `Justification is required for deviations at or above ${mandatoryLevel} significance`,
      );
    }

    const deviationId = crypto.randomUUID();

    const deviation = await (this.prisma as any).pccpDeviation.create({
      data: {
        id: deviationId,
        cerVersionId: input.cerVersionId,
        pccpSection: input.pccpSection,
        description: input.description,
        expectedValue: input.expectedValue,
        actualValue: input.actualValue,
        significance: input.significance,
        justification: input.justification ?? null,
        impactedSections: input.impactedSections as unknown as Prisma.InputJsonValue,
        resolutionAction: input.resolutionAction ?? null,
        status: 'IDENTIFIED',
        exceedsThreshold,
        createdById: input.userId,
      },
    });

    // Emit event
    const event = createPccpDeviationCreatedEvent(
      {
        deviationId,
        cerVersionId: input.cerVersionId,
        pccpSection: input.pccpSection,
        significance: input.significance,
      },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      id: deviation.id,
      cerVersionId: deviation.cerVersionId,
      pccpSection: deviation.pccpSection,
      description: deviation.description,
      expectedValue: deviation.expectedValue,
      actualValue: deviation.actualValue,
      significance: deviation.significance,
      justification: deviation.justification,
      impactedSections: input.impactedSections,
      resolutionAction: deviation.resolutionAction,
      status: deviation.status,
      exceedsThreshold,
    };
  }

  async update(input: UpdateDeviationInput): Promise<DeviationResult> {
    const existing = await (this.prisma as any).pccpDeviation.findUnique({
      where: { id: input.deviationId },
      select: {
        id: true,
        cerVersionId: true,
        pccpSection: true,
        description: true,
        expectedValue: true,
        actualValue: true,
        significance: true,
        justification: true,
        impactedSections: true,
        resolutionAction: true,
        status: true,
        exceedsThreshold: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('PccpDeviation', input.deviationId);
    }

    if (input.significance && !DEVIATION_SIGNIFICANCE.includes(input.significance as DeviationSignificance)) {
      throw new ValidationError(`Invalid significance: ${input.significance}`);
    }

    if (input.status && !DEVIATION_STATUS.includes(input.status as DeviationStatus)) {
      throw new ValidationError(`Invalid status: ${input.status}`);
    }

    const newSignificance = (input.significance ?? existing.significance) as DeviationSignificance;
    const newJustification = input.justification !== undefined ? input.justification : existing.justification;

    if ((newSignificance === 'HIGH' || newSignificance === 'CRITICAL') && !newJustification?.trim()) {
      throw new ValidationError(
        `Justification is required for ${newSignificance} significance deviations`,
      );
    }

    const data: Record<string, unknown> = {};
    if (input.description !== undefined) data['description'] = input.description;
    if (input.expectedValue !== undefined) data['expectedValue'] = input.expectedValue;
    if (input.actualValue !== undefined) data['actualValue'] = input.actualValue;
    if (input.significance !== undefined) data['significance'] = input.significance;
    if (input.justification !== undefined) data['justification'] = input.justification;
    if (input.impactedSections !== undefined) {
      data['impactedSections'] = input.impactedSections as unknown as Prisma.InputJsonValue;
    }
    if (input.resolutionAction !== undefined) data['resolutionAction'] = input.resolutionAction;
    if (input.status !== undefined) data['status'] = input.status;

    const updated = await (this.prisma as any).pccpDeviation.update({
      where: { id: input.deviationId },
      data,
    });

    return {
      id: updated.id,
      cerVersionId: updated.cerVersionId,
      pccpSection: updated.pccpSection,
      description: updated.description,
      expectedValue: updated.expectedValue,
      actualValue: updated.actualValue,
      significance: updated.significance,
      justification: updated.justification,
      impactedSections: Array.isArray(updated.impactedSections) ? updated.impactedSections : [],
      resolutionAction: updated.resolutionAction,
      status: updated.status,
      exceedsThreshold: updated.exceedsThreshold ?? false,
    };
  }

  async delete(input: DeleteDeviationInput): Promise<{ deleted: boolean }> {
    const existing = await (this.prisma as any).pccpDeviation.findUnique({
      where: { id: input.deviationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('PccpDeviation', input.deviationId);
    }

    await (this.prisma as any).pccpDeviation.delete({
      where: { id: input.deviationId },
    });

    return { deleted: true };
  }

  async list(input: GetDeviationsInput): Promise<DeviationResult[]> {
    const deviations = await (this.prisma as any).pccpDeviation.findMany({
      where: { cerVersionId: input.cerVersionId },
      orderBy: { createdAt: 'desc' },
    });

    return deviations.map((d: any) => ({
      id: d.id,
      cerVersionId: d.cerVersionId,
      pccpSection: d.pccpSection,
      description: d.description,
      expectedValue: d.expectedValue,
      actualValue: d.actualValue,
      significance: d.significance,
      justification: d.justification,
      impactedSections: Array.isArray(d.impactedSections) ? d.impactedSections : [],
      resolutionAction: d.resolutionAction,
      status: d.status,
      exceedsThreshold: d.exceedsThreshold ?? false,
    }));
  }
}
