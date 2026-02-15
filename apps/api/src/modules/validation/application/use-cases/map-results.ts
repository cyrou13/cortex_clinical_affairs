import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { compare } from '../../domain/entities/results-mapping.js';
import {
  buildConfusionMatrix,
  computeStatistics,
  type StatisticsResult,
} from '../../infrastructure/services/statistics-service.js';

interface MapResultsInput {
  validationStudyId: string;
  userId: string;
}

interface EndpointResult {
  acceptanceCriterionId: string;
  criterionName: string;
  computedValue: number;
  threshold: number;
  unit: string | null;
  result: 'MET' | 'NOT_MET';
  statistics: StatisticsResult | null;
}

interface MapResultsResult {
  validationStudyId: string;
  endpointResults: EndpointResult[];
  overallMet: number;
  overallNotMet: number;
  totalCriteria: number;
}

export class MapResultsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: MapResultsInput): Promise<MapResultsResult> {
    const { validationStudyId, userId } = input;

    // Verify study exists
    const study = await (this.prisma as any).validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, status: true, type: true },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    // Get active data import
    const activeImport = await (this.prisma as any).dataImport.findFirst({
      where: { validationStudyId, isActive: true },
      select: { id: true, data: true },
    });

    if (!activeImport) {
      throw new ValidationError('No active data import found. Import data before mapping results.');
    }

    // Get acceptance criteria (from SOA benchmarks)
    const criteria = await (this.prisma as any).acceptanceCriterion.findMany({
      where: { validationStudyId },
      select: {
        id: true,
        name: true,
        threshold: true,
        unit: true,
        metricType: true,
      },
    });

    if (criteria.length === 0) {
      throw new ValidationError('No acceptance criteria found. Link SOA benchmarks first.');
    }

    const importData = activeImport.data as Array<Record<string, unknown>>;
    const predictions = importData.map((row) => ({
      groundTruth: String(row.ground_truth ?? ''),
      prediction: String(row.prediction ?? ''),
    }));

    const confusionMatrix = buildConfusionMatrix(predictions);
    const stats = computeStatistics(confusionMatrix);

    const endpointResults: EndpointResult[] = [];
    let overallMet = 0;
    let overallNotMet = 0;

    for (const criterion of criteria) {
      // Determine computed value based on metric type
      let computedValue: number;
      switch (criterion.metricType) {
        case 'SENSITIVITY':
          computedValue = stats.sensitivity;
          break;
        case 'SPECIFICITY':
          computedValue = stats.specificity;
          break;
        case 'ACCURACY':
          computedValue = stats.accuracy;
          break;
        case 'PPV':
          computedValue = stats.ppv;
          break;
        case 'NPV':
          computedValue = stats.npv;
          break;
        default:
          computedValue = stats.sensitivity;
      }

      const threshold = criterion.threshold ?? 0;
      const comparisonResult = compare({
        computedValue,
        threshold,
      });

      if (comparisonResult === 'MET') overallMet++;
      else overallNotMet++;

      // Save result mapping
      const mappingId = crypto.randomUUID();
      await (this.prisma as any).resultsMapping.create({
        data: {
          id: mappingId,
          validationStudyId,
          acceptanceCriterionId: criterion.id,
          computedValue,
          threshold,
          unit: criterion.unit,
          result: comparisonResult,
          statistics: {
            sensitivity: stats.sensitivity,
            specificity: stats.specificity,
            sensitivityCI: stats.sensitivityCI,
            specificityCI: stats.specificityCI,
            accuracy: stats.accuracy,
            ppv: stats.ppv,
            npv: stats.npv,
            sampleSize: stats.sampleSize,
          } as unknown as Prisma.InputJsonValue,
          createdById: userId,
        },
      });

      endpointResults.push({
        acceptanceCriterionId: criterion.id,
        criterionName: criterion.name,
        computedValue,
        threshold,
        unit: criterion.unit,
        result: comparisonResult,
        statistics: stats,
      });
    }

    return {
      validationStudyId,
      endpointResults,
      overallMet,
      overallNotMet,
      totalCriteria: criteria.length,
    };
  }
}
