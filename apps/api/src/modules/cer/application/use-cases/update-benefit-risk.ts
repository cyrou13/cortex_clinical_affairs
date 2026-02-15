import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { computeRiskLevel } from './determine-benefit-risk.js';

// ── Types ───────────────────────────────────────────────────────────────

type Severity = 'NEGLIGIBLE' | 'MINOR' | 'SERIOUS' | 'CRITICAL' | 'CATASTROPHIC';
type Probability = 'IMPROBABLE' | 'REMOTE' | 'OCCASIONAL' | 'PROBABLE' | 'FREQUENT';

interface UpdateBenefitInput {
  benefitRiskItemId: string;
  description?: string;
  evidenceLinks?: string[];
  userId: string;
}

interface UpdateRiskInput {
  benefitRiskItemId: string;
  description?: string;
  severity?: Severity;
  probability?: Probability;
  evidenceLinks?: string[];
  userId: string;
}

interface UpdateMitigationInput {
  mitigationId: string;
  description?: string;
  residualRiskLevel?: string;
  userId: string;
}

interface UpdateBenefitRiskResult {
  id: string;
  description: string;
  riskLevel?: string;
  updatedFields: string[];
}

const VALID_SEVERITIES: Severity[] = ['NEGLIGIBLE', 'MINOR', 'SERIOUS', 'CRITICAL', 'CATASTROPHIC'];
const VALID_PROBABILITIES: Probability[] = ['IMPROBABLE', 'REMOTE', 'OCCASIONAL', 'PROBABLE', 'FREQUENT'];

// ── Use Case ────────────────────────────────────────────────────────────

export class UpdateBenefitRiskUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async updateBenefit(input: UpdateBenefitInput): Promise<UpdateBenefitRiskResult> {
    const { benefitRiskItemId, description, evidenceLinks, userId } = input;

    const item = await (this.prisma as any).benefitRiskItem.findUnique({
      where: { id: benefitRiskItemId },
      select: { id: true, itemType: true, description: true },
    });

    if (!item) {
      throw new NotFoundError('BenefitRiskItem', benefitRiskItemId);
    }

    if (item.itemType !== 'BENEFIT') {
      throw new ValidationError('Item is not a benefit');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date(), updatedById: userId };
    const updatedFields: string[] = [];

    if (description !== undefined) {
      updateData.description = description;
      updatedFields.push('description');
    }

    if (evidenceLinks !== undefined) {
      updateData.evidenceLinks = evidenceLinks as unknown as Prisma.InputJsonValue;
      updatedFields.push('evidenceLinks');
    }

    await (this.prisma as any).benefitRiskItem.update({
      where: { id: benefitRiskItemId },
      data: updateData,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.benefit.updated',
        targetType: 'benefitRiskItem',
        targetId: benefitRiskItemId,
        before: { description: item.description } as unknown as Prisma.InputJsonValue,
        after: { description: description ?? item.description, updatedFields } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: benefitRiskItemId,
      description: description ?? item.description,
      updatedFields,
    };
  }

  async updateRisk(input: UpdateRiskInput): Promise<UpdateBenefitRiskResult> {
    const { benefitRiskItemId, description, severity, probability, evidenceLinks, userId } = input;

    const item = await (this.prisma as any).benefitRiskItem.findUnique({
      where: { id: benefitRiskItemId },
      select: {
        id: true,
        itemType: true,
        description: true,
        severity: true,
        probability: true,
        riskLevel: true,
      },
    });

    if (!item) {
      throw new NotFoundError('BenefitRiskItem', benefitRiskItemId);
    }

    if (item.itemType !== 'RISK') {
      throw new ValidationError('Item is not a risk');
    }

    if (severity !== undefined && !VALID_SEVERITIES.includes(severity)) {
      throw new ValidationError(`Invalid severity: ${severity}`);
    }

    if (probability !== undefined && !VALID_PROBABILITIES.includes(probability)) {
      throw new ValidationError(`Invalid probability: ${probability}`);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date(), updatedById: userId };
    const updatedFields: string[] = [];

    if (description !== undefined) {
      updateData.description = description;
      updatedFields.push('description');
    }

    if (severity !== undefined) {
      updateData.severity = severity;
      updatedFields.push('severity');
    }

    if (probability !== undefined) {
      updateData.probability = probability;
      updatedFields.push('probability');
    }

    if (evidenceLinks !== undefined) {
      updateData.evidenceLinks = evidenceLinks as unknown as Prisma.InputJsonValue;
      updatedFields.push('evidenceLinks');
    }

    // Re-compute risk level if severity or probability changed
    const effectiveSeverity = (severity ?? item.severity) as Severity;
    const effectiveProbability = (probability ?? item.probability) as Probability;

    if (severity !== undefined || probability !== undefined) {
      const newRiskLevel = computeRiskLevel(effectiveSeverity, effectiveProbability);
      updateData.riskLevel = newRiskLevel;
      updatedFields.push('riskLevel');
    }

    await (this.prisma as any).benefitRiskItem.update({
      where: { id: benefitRiskItemId },
      data: updateData,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.risk.updated',
        targetType: 'benefitRiskItem',
        targetId: benefitRiskItemId,
        before: {
          severity: item.severity,
          probability: item.probability,
          riskLevel: item.riskLevel,
        } as unknown as Prisma.InputJsonValue,
        after: {
          severity: effectiveSeverity,
          probability: effectiveProbability,
          riskLevel: updateData.riskLevel ?? item.riskLevel,
          updatedFields,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: benefitRiskItemId,
      description: description ?? item.description,
      riskLevel: (updateData.riskLevel as string) ?? item.riskLevel,
      updatedFields,
    };
  }

  async updateMitigation(input: UpdateMitigationInput): Promise<UpdateBenefitRiskResult> {
    const { mitigationId, description, residualRiskLevel, userId } = input;

    const mitigation = await (this.prisma as any).benefitRiskMitigation.findUnique({
      where: { id: mitigationId },
      select: { id: true, description: true, residualRiskLevel: true },
    });

    if (!mitigation) {
      throw new NotFoundError('BenefitRiskMitigation', mitigationId);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date(), updatedById: userId };
    const updatedFields: string[] = [];

    if (description !== undefined) {
      updateData.description = description;
      updatedFields.push('description');
    }

    if (residualRiskLevel !== undefined) {
      updateData.residualRiskLevel = residualRiskLevel;
      updatedFields.push('residualRiskLevel');
    }

    await (this.prisma as any).benefitRiskMitigation.update({
      where: { id: mitigationId },
      data: updateData,
    });

    return {
      id: mitigationId,
      description: description ?? mitigation.description,
      riskLevel: residualRiskLevel ?? mitigation.residualRiskLevel,
      updatedFields,
    };
  }
}
