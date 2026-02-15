import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface TrendDataPoint {
  period: string;
  complaintCount: number;
  complaintRate: number;
  incidentCount: number;
  incidentRate: number;
}

interface SignificantChange {
  metric: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  isSignificant: boolean;
  description: string;
}

interface ComputeTrendsResult {
  trendAnalysisId: string;
  pmsCycleId: string;
  complaintTrends: TrendDataPoint[];
  severityDistribution: Record<string, number>;
  classificationDistribution: Record<string, number>;
  significantChanges: SignificantChange[];
  status: string;
}

export class ComputeTrendsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(pmsCycleId: string, userId: string): Promise<ComputeTrendsResult> {
    const cycle = await (this.prisma as any).pmsCycle.findUnique({
      where: { id: pmsCycleId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', pmsCycleId);
    }

    const complaints = await (this.prisma as any).complaint.findMany({
      where: { pmsCycleId },
    });

    const severityDistribution: Record<string, number> = {};
    const classificationDistribution: Record<string, number> = {};
    let incidentCount = 0;

    for (const c of complaints) {
      severityDistribution[c.severity] = (severityDistribution[c.severity] ?? 0) + 1;
      classificationDistribution[c.classification] = (classificationDistribution[c.classification] ?? 0) + 1;
      if (c.isIncident) incidentCount++;
    }

    const installedBase = await (this.prisma as any).installedBaseEntry.findFirst({
      where: { pmsCycleId },
      orderBy: { periodEnd: 'desc' },
    });

    const activeDevices = installedBase?.activeDevices ?? 1;

    const complaintRate = (complaints.length / activeDevices) * 1000;
    const incidentRate = (incidentCount / activeDevices) * 1000;

    const complaintTrends: TrendDataPoint[] = [{
      period: `${cycle.startDate.toISOString().slice(0, 10)} - ${cycle.endDate.toISOString().slice(0, 10)}`,
      complaintCount: complaints.length,
      complaintRate: Math.round(complaintRate * 100) / 100,
      incidentCount,
      incidentRate: Math.round(incidentRate * 100) / 100,
    }];

    const trendAnalysisId = crypto.randomUUID();

    await (this.prisma as any).trendAnalysis.create({
      data: {
        id: trendAnalysisId,
        pmsCycleId,
        analysisDate: new Date(),
        createdById: userId,
        installedBase: installedBase ? { activeDevices: installedBase.activeDevices, totalUnitsShipped: installedBase.totalUnitsShipped } : null,
        complaintTrends,
        severityDistribution,
        classificationDistribution,
        significantChanges: [],
        status: 'DRAFT',
      },
    });

    return {
      trendAnalysisId,
      pmsCycleId,
      complaintTrends,
      severityDistribution,
      classificationDistribution,
      significantChanges: [],
      status: 'DRAFT',
    };
  }
}
