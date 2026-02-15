import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface LinkSoaBenchmarksInput {
  validationStudyId: string;
  soaAnalysisId: string;
}

interface LinkSoaBenchmarksResult {
  importedCount: number;
  benchmarks: Array<{
    id: string;
    name: string;
    threshold: number | null;
    unit: string | null;
  }>;
}

export class LinkSoaBenchmarksUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LinkSoaBenchmarksInput): Promise<LinkSoaBenchmarksResult> {
    const { validationStudyId, soaAnalysisId } = input;

    // Verify SOA exists
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true, type: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    // Fetch benchmarks from the SOA Device analysis (performance benchmarks)
    const soaBenchmarks = await this.prisma.soaBenchmark.findMany({
      where: { soaAnalysisId },
      select: {
        id: true,
        name: true,
        threshold: true,
        unit: true,
        metricType: true,
      },
    });

    const importedBenchmarks: Array<{
      id: string;
      name: string;
      threshold: number | null;
      unit: string | null;
    }> = [];

    for (const benchmark of soaBenchmarks) {
      const criterionId = crypto.randomUUID();
      await this.prisma.acceptanceCriterion.create({
        data: {
          id: criterionId,
          validationStudyId,
          soaBenchmarkId: benchmark.id,
          name: benchmark.name ?? '',
          threshold: benchmark.threshold,
          unit: benchmark.unit,
          metricType: (benchmark.metricType ?? undefined) as any,
        },
      });

      importedBenchmarks.push({
        id: criterionId,
        name: benchmark.name ?? '',
        threshold: benchmark.threshold,
        unit: benchmark.unit,
      });
    }

    return {
      importedCount: importedBenchmarks.length,
      benchmarks: importedBenchmarks,
    };
  }
}
