import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface FinalizeTrendAnalysisResult {
  trendAnalysisId: string;
  status: string;
  conclusions: string;
}

export class FinalizeTrendAnalysisUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(trendAnalysisId: string, conclusions: string, userId: string): Promise<FinalizeTrendAnalysisResult> {
    const analysis = await (this.prisma as any).trendAnalysis.findUnique({
      where: { id: trendAnalysisId },
    });

    if (!analysis) {
      throw new NotFoundError('TrendAnalysis', trendAnalysisId);
    }

    if (analysis.status === 'FINALIZED') {
      throw new ValidationError('Trend analysis is already finalized');
    }

    if (!conclusions.trim()) {
      throw new ValidationError('Conclusions are required to finalize trend analysis');
    }

    await (this.prisma as any).trendAnalysis.update({
      where: { id: trendAnalysisId },
      data: { status: 'FINALIZED', conclusions: conclusions.trim() },
    });

    return { trendAnalysisId, status: 'FINALIZED', conclusions: conclusions.trim() };
  }
}
