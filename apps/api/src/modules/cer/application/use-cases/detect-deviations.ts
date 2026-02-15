import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface DetectDeviationsInput {
  cerVersionId: string;
  userId: string;
}

export interface DetectedDeviation {
  pccpSection: string;
  description: string;
  expectedValue: string;
  actualValue: string;
  significance: string;
  source: 'VALIDATION_RESULT' | 'SOA_BENCHMARK';
}

export interface DetectDeviationsResult {
  cerVersionId: string;
  detectedCount: number;
  createdCount: number;
  deviations: DetectedDeviation[];
}

// ── Use Case ────────────────────────────────────────────────────────────

export class DetectDeviationsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: DetectDeviationsInput): Promise<DetectDeviationsResult> {
    // Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, projectId: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    // Load PCCP acceptance criteria
    const pccpCriteria = await this.prisma.pccpAcceptanceCriteria.findMany({
      where: { cerVersionId: input.cerVersionId },
    });

    // Load configured thresholds
    const config = await this.prisma.pccpDeviationConfig.findFirst({
      where: { cerVersionId: input.cerVersionId },
      select: { mandatoryJustificationLevel: true },
    });

    const mandatoryLevel = config?.mandatoryJustificationLevel ?? 'HIGH';
    const levelOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

    const detected: DetectedDeviation[] = [];

    // Detect from validation results
    const validationResults = await this.prisma.validationResult.findMany({
      where: { projectId: cerVersion.projectId },
    });

    for (const criteria of pccpCriteria) {
      const matchingResult = validationResults.find(
        (r: any) => r.parameterName === criteria.parameterName,
      );

      if (matchingResult && matchingResult.value !== criteria.expectedValue) {
        const significance = this.computeSignificance(
          criteria.expectedValue,
          matchingResult.value,
          criteria.tolerance,
        );
        detected.push({
          pccpSection: criteria.section,
          description: `Validation result for ${criteria.parameterName} deviates from PCCP expectation`,
          expectedValue: String(criteria.expectedValue),
          actualValue: String(matchingResult.value),
          significance,
          source: 'VALIDATION_RESULT',
        });
      }
    }

    // Detect from SOA benchmark differences
    const soaBenchmarks = await this.prisma.soaBenchmark.findMany({
      where: { projectId: cerVersion.projectId },
    });

    for (const criteria of pccpCriteria) {
      const matchingBenchmark = soaBenchmarks.find(
        (b: any) => b.parameterName === criteria.parameterName,
      );

      if (matchingBenchmark && matchingBenchmark.benchmarkValue !== criteria.expectedValue) {
        const significance = this.computeSignificance(
          criteria.expectedValue,
          matchingBenchmark.benchmarkValue,
          criteria.tolerance,
        );
        detected.push({
          pccpSection: criteria.section,
          description: `SOA benchmark for ${criteria.parameterName} differs from PCCP expectation`,
          expectedValue: String(criteria.expectedValue),
          actualValue: String(matchingBenchmark.benchmarkValue),
          significance,
          source: 'SOA_BENCHMARK',
        });
      }
    }

    // Create PccpDeviation records for each detected deviation
    let createdCount = 0;
    for (const deviation of detected) {
      const exceedsThreshold =
        (levelOrder[deviation.significance] ?? 0) >= (levelOrder[mandatoryLevel] ?? 2);

      await this.prisma.pccpDeviation.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId: input.cerVersionId,
          pccpSection: deviation.pccpSection,
          description: deviation.description,
          expectedValue: deviation.expectedValue,
          actualValue: deviation.actualValue,
          significance: deviation.significance,
          impactedSections: [] as unknown as Prisma.InputJsonValue,
          status: 'IDENTIFIED',
          exceedsThreshold,
          source: deviation.source,
          createdById: input.userId,
        },
      });
      createdCount++;
    }

    return {
      cerVersionId: input.cerVersionId,
      detectedCount: detected.length,
      createdCount,
      deviations: detected,
    };
  }

  private computeSignificance(expected: unknown, actual: unknown, tolerance?: number): string {
    const expectedNum = Number(expected);
    const actualNum = Number(actual);

    if (isNaN(expectedNum) || isNaN(actualNum)) {
      return 'MEDIUM';
    }

    if (expectedNum === 0) {
      return actualNum === 0 ? 'LOW' : 'HIGH';
    }

    const deviation = Math.abs((actualNum - expectedNum) / expectedNum) * 100;
    const tol = tolerance ?? 10;

    if (deviation <= tol) return 'LOW';
    if (deviation <= tol * 2) return 'MEDIUM';
    if (deviation <= tol * 4) return 'HIGH';
    return 'CRITICAL';
  }
}
