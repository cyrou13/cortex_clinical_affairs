import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

type Severity = 'NEGLIGIBLE' | 'MINOR' | 'SERIOUS' | 'CRITICAL' | 'CATASTROPHIC';
type Probability = 'IMPROBABLE' | 'REMOTE' | 'OCCASIONAL' | 'PROBABLE' | 'FREQUENT';
type RiskLevel = 'ACCEPTABLE' | 'ALARP' | 'UNACCEPTABLE';

interface Benefit {
  id: string;
  description: string;
  source: string;
  sourceId: string | null;
}

interface Risk {
  id: string;
  description: string;
  severity: Severity;
  probability: Probability;
  riskLevel: RiskLevel;
  source: string;
  sourceId: string | null;
}

interface Mitigation {
  id: string;
  riskId: string;
  description: string;
  residualRiskLevel: RiskLevel;
}

interface DetermineBenefitRiskInput {
  cerVersionId: string;
  userId: string;
}

export interface DetermineBenefitRiskResult {
  cerVersionId: string;
  benefits: Benefit[];
  risks: Risk[];
  mitigations: Mitigation[];
  riskMatrix: Record<string, number>;
}

// ── Risk Matrix ─────────────────────────────────────────────────────────

const SEVERITY_SCORES: Record<Severity, number> = {
  NEGLIGIBLE: 1,
  MINOR: 2,
  SERIOUS: 3,
  CRITICAL: 4,
  CATASTROPHIC: 5,
};

const PROBABILITY_SCORES: Record<Probability, number> = {
  IMPROBABLE: 1,
  REMOTE: 2,
  OCCASIONAL: 3,
  PROBABLE: 4,
  FREQUENT: 5,
};

export function computeRiskLevel(severity: Severity, probability: Probability): RiskLevel {
  const score = SEVERITY_SCORES[severity] * PROBABILITY_SCORES[probability];
  if (score <= 4) return 'ACCEPTABLE';
  if (score <= 12) return 'ALARP';
  return 'UNACCEPTABLE';
}

// ── Use Case ────────────────────────────────────────────────────────────

export class DetermineBenefitRiskUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: DetermineBenefitRiskInput): Promise<DetermineBenefitRiskResult> {
    const { cerVersionId, userId } = input;

    // 1. Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true, projectId: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Check for existing benefit-risk analysis
    const existingCount = await this.prisma.benefitRiskItem.count({
      where: { cerVersionId },
    });

    if (existingCount > 0) {
      throw new ValidationError('Benefit-risk analysis already exists for this CER version');
    }

    // 3. Auto-populate benefits from SOA/validation data
    const benefits = await this.gatherBenefits(cerVersion.projectId, cerVersionId);

    // 4. Auto-populate risks from risk management and adverse events
    const risks = await this.gatherRisks(cerVersion.projectId, cerVersionId);

    // 5. Create initial mitigations structure
    const mitigations: Mitigation[] = [];
    for (const risk of risks) {
      if (risk.riskLevel !== 'ACCEPTABLE') {
        const mitId = crypto.randomUUID();
        mitigations.push({
          id: mitId,
          riskId: risk.id,
          description: '',
          residualRiskLevel: risk.riskLevel === 'UNACCEPTABLE' ? 'ALARP' : 'ACCEPTABLE',
        });
      }
    }

    // 6. Persist all items
    for (const benefit of benefits) {
      await this.prisma.benefitRiskItem.create({
        data: {
          id: benefit.id,
          cerVersionId,
          itemType: 'BENEFIT',
          description: benefit.description,
          source: benefit.source,
          sourceId: benefit.sourceId,
          createdById: userId,
        },
      });
    }

    for (const risk of risks) {
      await this.prisma.benefitRiskItem.create({
        data: {
          id: risk.id,
          cerVersionId,
          itemType: 'RISK',
          description: risk.description,
          severity: risk.severity,
          probability: risk.probability,
          riskLevel: risk.riskLevel,
          source: risk.source,
          sourceId: risk.sourceId,
          createdById: userId,
        },
      });
    }

    for (const mit of mitigations) {
      await this.prisma.benefitRiskMitigation.create({
        data: {
          id: mit.id,
          riskId: mit.riskId,
          cerVersionId,
          description: mit.description,
          residualRiskLevel: mit.residualRiskLevel,
          createdById: userId,
        },
      });
    }

    // 7. Compute risk matrix summary
    const riskMatrix: Record<string, number> = {
      ACCEPTABLE: risks.filter((r) => r.riskLevel === 'ACCEPTABLE').length,
      ALARP: risks.filter((r) => r.riskLevel === 'ALARP').length,
      UNACCEPTABLE: risks.filter((r) => r.riskLevel === 'UNACCEPTABLE').length,
    };

    // 8. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.benefit-risk.determined',
        targetType: 'cerVersion',
        targetId: cerVersionId,
        before: null as unknown as Prisma.InputJsonValue,
        after: {
          benefitCount: benefits.length,
          riskCount: risks.length,
          mitigationCount: mitigations.length,
          riskMatrix,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cerVersionId,
      benefits,
      risks,
      mitigations,
      riskMatrix,
    };
  }

  private async gatherBenefits(projectId: string, _cerVersionId: string): Promise<Benefit[]> {
    const benefits: Benefit[] = [];

    // From SOA analysis data
    const soaAnalyses = await this.prisma.soaAnalysis
      .findMany({
        where: { projectId },
        select: { id: true, clinicalBenefits: true },
      })
      .catch(() => []);

    for (const soa of soaAnalyses) {
      if (soa.clinicalBenefits && Array.isArray(soa.clinicalBenefits)) {
        for (const cb of soa.clinicalBenefits) {
          benefits.push({
            id: crypto.randomUUID(),
            description: String(cb),
            source: 'SOA Analysis',
            sourceId: soa.id,
          });
        }
      }
    }

    // From validation results
    const validationStudies = await this.prisma.validationStudy
      .findMany({
        where: { projectId, status: 'LOCKED' },
        select: { id: true, name: true },
      })
      .catch(() => []);

    for (const study of validationStudies) {
      benefits.push({
        id: crypto.randomUUID(),
        description: `Clinical performance demonstrated in validation study: ${study.name}`,
        source: 'Validation Study',
        sourceId: study.id,
      });
    }

    // If no benefits gathered, add a placeholder
    if (benefits.length === 0) {
      benefits.push({
        id: crypto.randomUUID(),
        description: 'Clinical benefit to be determined based on evidence review',
        source: 'Manual',
        sourceId: null,
      });
    }

    return benefits;
  }

  private async gatherRisks(projectId: string, _cerVersionId: string): Promise<Risk[]> {
    const risks: Risk[] = [];

    // From risk management references
    const riskEntries = await this.prisma.riskEntry
      .findMany({
        where: { projectId },
        select: { id: true, description: true, severity: true, probability: true },
      })
      .catch(() => []);

    for (const entry of riskEntries) {
      const severity = (entry.severity as Severity) || 'MINOR';
      const probability = (entry.probability as Probability) || 'REMOTE';

      risks.push({
        id: crypto.randomUUID(),
        description: entry.description ?? 'Risk identified in risk management',
        severity,
        probability,
        riskLevel: computeRiskLevel(severity, probability),
        source: 'Risk Management',
        sourceId: entry.id,
      });
    }

    // If no risks gathered, add default residual risks
    if (risks.length === 0) {
      const defaultRisks: Array<{ desc: string; sev: Severity; prob: Probability }> = [
        {
          desc: 'False positive result leading to unnecessary follow-up',
          sev: 'MINOR',
          prob: 'OCCASIONAL',
        },
        {
          desc: 'False negative result leading to missed diagnosis',
          sev: 'SERIOUS',
          prob: 'REMOTE',
        },
      ];

      for (const dr of defaultRisks) {
        risks.push({
          id: crypto.randomUUID(),
          description: dr.desc,
          severity: dr.sev,
          probability: dr.prob,
          riskLevel: computeRiskLevel(dr.sev, dr.prob),
          source: 'Default',
          sourceId: null,
        });
      }
    }

    return risks;
  }
}
