import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export const CONFIGURABLE_LEVELS = ['MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ConfigurableLevel = (typeof CONFIGURABLE_LEVELS)[number];

export interface ConfigureThresholdsInput {
  cerVersionId: string;
  mandatoryJustificationLevel: string;
  userId: string;
}

export interface ThresholdConfigResult {
  id: string;
  cerVersionId: string;
  mandatoryJustificationLevel: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ConfigureDeviationThresholdsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ConfigureThresholdsInput): Promise<ThresholdConfigResult> {
    // Validate level
    if (!CONFIGURABLE_LEVELS.includes(input.mandatoryJustificationLevel as ConfigurableLevel)) {
      throw new ValidationError(
        `Invalid mandatory justification level: ${input.mandatoryJustificationLevel}. Must be one of: ${CONFIGURABLE_LEVELS.join(', ')}`,
      );
    }

    // Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    // Upsert config
    const existing = await this.prisma.pccpDeviationConfig.findFirst({
      where: { cerVersionId: input.cerVersionId },
      select: { id: true },
    });

    if (existing) {
      const updated = await this.prisma.pccpDeviationConfig.update({
        where: { id: existing.id },
        data: {
          mandatoryJustificationLevel: input.mandatoryJustificationLevel,
          updatedById: input.userId,
        },
      });

      return {
        id: updated.id,
        cerVersionId: updated.cerVersionId,
        mandatoryJustificationLevel: updated.mandatoryJustificationLevel,
      };
    }

    const configId = crypto.randomUUID();

    const created = await this.prisma.pccpDeviationConfig.create({
      data: {
        id: configId,
        cerVersionId: input.cerVersionId,
        mandatoryJustificationLevel: input.mandatoryJustificationLevel,
        createdById: input.userId,
      },
    });

    return {
      id: created.id,
      cerVersionId: created.cerVersionId,
      mandatoryJustificationLevel: created.mandatoryJustificationLevel,
    };
  }
}
