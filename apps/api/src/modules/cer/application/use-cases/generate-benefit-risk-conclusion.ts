import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface GenerateBenefitRiskConclusionInput {
  cerVersionId: string;
}

interface BenefitSummary {
  count: number;
  descriptions: string[];
}

interface RiskSummary {
  total: number;
  acceptable: number;
  alarp: number;
  unacceptable: number;
}

interface MitigationSummary {
  total: number;
  withDescription: number;
}

export interface GenerateBenefitRiskConclusionResult {
  cerVersionId: string;
  benefitSummary: BenefitSummary;
  riskSummary: RiskSummary;
  mitigationSummary: MitigationSummary;
  conclusionText: string;
  favorableRatio: boolean;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class GenerateBenefitRiskConclusionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: GenerateBenefitRiskConclusionInput): Promise<GenerateBenefitRiskConclusionResult> {
    const { cerVersionId } = input;

    // 1. Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch benefits
    const benefits = await (this.prisma as any).benefitRiskItem.findMany({
      where: { cerVersionId, itemType: 'BENEFIT' },
      select: { description: true },
    });

    if (benefits.length === 0) {
      throw new ValidationError('No benefit-risk data found. Run benefit-risk determination first.');
    }

    // 3. Fetch risks
    const risks = await (this.prisma as any).benefitRiskItem.findMany({
      where: { cerVersionId, itemType: 'RISK' },
      select: { description: true, riskLevel: true },
    });

    // 4. Fetch mitigations
    const mitigations = await (this.prisma as any).benefitRiskMitigation.findMany({
      where: { cerVersionId },
      select: { description: true },
    });

    // 5. Compute summaries
    const benefitSummary: BenefitSummary = {
      count: benefits.length,
      descriptions: benefits.map((b: { description: string }) => b.description),
    };

    const riskSummary: RiskSummary = {
      total: risks.length,
      acceptable: risks.filter((r: { riskLevel: string }) => r.riskLevel === 'ACCEPTABLE').length,
      alarp: risks.filter((r: { riskLevel: string }) => r.riskLevel === 'ALARP').length,
      unacceptable: risks.filter((r: { riskLevel: string }) => r.riskLevel === 'UNACCEPTABLE').length,
    };

    const mitigationSummary: MitigationSummary = {
      total: mitigations.length,
      withDescription: mitigations.filter(
        (m: { description: string }) => m.description && m.description.trim().length > 0,
      ).length,
    };

    // 6. Determine if benefit-risk ratio is favorable
    const favorableRatio = riskSummary.unacceptable === 0 && benefitSummary.count > 0;

    // 7. Generate conclusion
    const conclusionText = generateConclusionText(
      benefitSummary,
      riskSummary,
      mitigationSummary,
      favorableRatio,
    );

    return {
      cerVersionId,
      benefitSummary,
      riskSummary,
      mitigationSummary,
      conclusionText,
      favorableRatio,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function generateConclusionText(
  benefits: BenefitSummary,
  risks: RiskSummary,
  mitigations: MitigationSummary,
  favorable: boolean,
): string {
  const lines: string[] = [];

  lines.push(
    `The benefit-risk analysis identified ${benefits.count} clinical benefit(s) and ${risks.total} risk(s).`,
  );

  if (risks.total > 0) {
    lines.push(
      `Risk distribution: ${risks.acceptable} acceptable, ${risks.alarp} ALARP, ${risks.unacceptable} unacceptable.`,
    );
  }

  if (mitigations.total > 0) {
    lines.push(
      `${mitigations.total} risk mitigation measure(s) have been defined (${mitigations.withDescription} with documented measures).`,
    );
  }

  if (favorable) {
    lines.push(
      'Based on the available evidence, the benefit-risk ratio is considered FAVORABLE. ' +
      'The clinical benefits of the device outweigh the residual risks when used as intended.',
    );
  } else if (risks.unacceptable > 0) {
    lines.push(
      `WARNING: ${risks.unacceptable} unacceptable risk(s) identified. ` +
      'The benefit-risk ratio cannot be considered favorable until all unacceptable risks are mitigated. ' +
      'Additional risk mitigation measures are required before the device can be approved.',
    );
  } else {
    lines.push(
      'The benefit-risk determination requires further review. ' +
      'Additional clinical evidence may be needed to establish a favorable benefit-risk ratio.',
    );
  }

  return lines.join(' ');
}
