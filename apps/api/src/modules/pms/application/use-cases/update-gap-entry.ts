import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { isValidGapSeverity } from '../../domain/value-objects/gap-severity.js';
import { canTransitionGap } from '../../domain/value-objects/gap-status.js';

interface UpdateGapEntryInput {
  gapEntryId: string;
  description?: string;
  severity?: string;
  recommendedActivity?: string;
  status?: string;
  resolutionNotes?: string;
  userId: string;
}

interface GapEntryResult {
  id: string;
  pmsPlanId: string;
  sourceModule: string;
  sourceId: string;
  description: string;
  severity: string;
  recommendedActivity: string;
  status: string;
  manuallyCreated: boolean;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

export class UpdateGapEntryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpdateGapEntryInput): Promise<GapEntryResult> {
    const gap = await this.prisma.gapRegistryEntry.findUnique({
      where: { id: input.gapEntryId },
    });

    if (!gap) {
      throw new NotFoundError('GapRegistryEntry', input.gapEntryId);
    }

    if (input.severity && !isValidGapSeverity(input.severity)) {
      throw new ValidationError(`Invalid gap severity: ${input.severity}`);
    }

    if (input.status && !canTransitionGap(gap.status, input.status as any)) {
      throw new ValidationError(`Cannot transition gap from ${gap.status} to ${input.status}`);
    }

    const updateData: Record<string, unknown> = {};
    if (input.description !== undefined) updateData.description = input.description;
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.recommendedActivity !== undefined) updateData.recommendedActivity = input.recommendedActivity;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = input.userId;
        updateData.resolutionNotes = input.resolutionNotes ?? null;
      }
    }

    const updated = await this.prisma.gapRegistryEntry.update({
      where: { id: input.gapEntryId },
      data: updateData,
    });

    return updated;
  }

  async addManual(input: {
    pmsPlanId: string;
    description: string;
    severity: string;
    recommendedActivity: string;
    userId: string;
  }): Promise<GapEntryResult> {
    if (!isValidGapSeverity(input.severity)) {
      throw new ValidationError(`Invalid gap severity: ${input.severity}`);
    }

    const gap = await this.prisma.gapRegistryEntry.create({
      data: {
        id: crypto.randomUUID(),
        pmsPlanId: input.pmsPlanId,
        sourceModule: 'CER',
        sourceId: crypto.randomUUID(),
        description: input.description,
        severity: input.severity,
        recommendedActivity: input.recommendedActivity,
        status: 'OPEN',
        manuallyCreated: true,
      },
    });

    return gap;
  }
}
