import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';
import { TrendComputationService } from '../../infrastructure/services/trend-computation-service.js';

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
  private readonly trendService: TrendComputationService;

  constructor(private readonly prisma: PrismaClient) {
    this.trendService = new TrendComputationService();
  }

  async execute(pmsCycleId: string, userId: string): Promise<ComputeTrendsResult> {
    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: pmsCycleId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', pmsCycleId);
    }

    const complaints = await this.prisma.complaint.findMany({
      where: { pmsCycleId },
    });

    const severityDistribution: Record<string, number> = {};
    const classificationDistribution: Record<string, number> = {};
    let incidentCount = 0;

    for (const c of complaints) {
      severityDistribution[c.severity] = (severityDistribution[c.severity] ?? 0) + 1;
      classificationDistribution[c.classification] =
        (classificationDistribution[c.classification] ?? 0) + 1;
      if (c.isIncident) incidentCount++;
    }

    const installedBase = await this.prisma.installedBaseEntry.findFirst({
      where: { pmsCycleId },
      orderBy: { periodEnd: 'desc' },
    });

    const activeDevices = installedBase?.activeDevices ?? 1;

    const complaintRate = (complaints.length / activeDevices) * 1000;
    const incidentRate = (incidentCount / activeDevices) * 1000;

    const currentPeriod: TrendDataPoint = {
      period: `${cycle.startDate.toISOString().slice(0, 10)} - ${cycle.endDate.toISOString().slice(0, 10)}`,
      complaintCount: complaints.length,
      complaintRate: Math.round(complaintRate * 100) / 100,
      incidentCount,
      incidentRate: Math.round(incidentRate * 100) / 100,
    };

    const complaintTrends: TrendDataPoint[] = [currentPeriod];

    // Get previous cycle data for comparison
    const currentCycle = await this.prisma.pmsCycle.findUnique({
      where: { id: pmsCycleId },
      select: { pmsPlanId: true, startDate: true },
    });

    let previousCycleData = null;
    if (currentCycle) {
      const previousCycles = await this.prisma.pmsCycle.findMany({
        where: {
          pmsPlanId: currentCycle.pmsPlanId,
          endDate: { lt: currentCycle.startDate },
          status: 'COMPLETED',
        },
        orderBy: { endDate: 'desc' },
        take: 1,
        include: {
          complaints: true,
          installedBaseEntries: true,
        },
      });

      if (previousCycles.length > 0) {
        const prevCycle = previousCycles[0]!;
        const prevComplaints = prevCycle.complaints;
        const prevIncidentCount = prevComplaints.filter((c) => c.isIncident).length;
        const prevInstalledBase = prevCycle.installedBaseEntries[0];
        const prevActiveDevices = prevInstalledBase?.activeDevices ?? 1;

        previousCycleData = {
          complaintCount: prevComplaints.length,
          complaintRate: (prevComplaints.length / prevActiveDevices) * 1000,
          incidentCount: prevIncidentCount,
          incidentRate: (prevIncidentCount / prevActiveDevices) * 1000,
        };
      }
    }

    // Detect significant changes
    const significantChanges = this.trendService.detectSignificantChanges(
      currentPeriod,
      previousCycleData,
    );

    const trendAnalysisId = crypto.randomUUID();

    await this.prisma.trendAnalysis.create({
      data: {
        id: trendAnalysisId,
        pmsCycleId,
        analysisDate: new Date(),
        createdById: userId,
        installedBase: installedBase
          ? ({
              activeDevices: installedBase.activeDevices,
              totalUnitsShipped: installedBase.totalUnitsShipped,
            } as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
        complaintTrends: complaintTrends as unknown as Prisma.InputJsonValue,
        severityDistribution: severityDistribution as unknown as Prisma.InputJsonValue,
        classificationDistribution: classificationDistribution as unknown as Prisma.InputJsonValue,
        significantChanges: significantChanges as unknown as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });

    return {
      trendAnalysisId,
      pmsCycleId,
      complaintTrends,
      severityDistribution,
      classificationDistribution,
      significantChanges,
      status: 'DRAFT',
    };
  }
}
