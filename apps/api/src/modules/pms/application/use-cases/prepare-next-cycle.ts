import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface NextCycleSuggestion {
  pmsPlanId: string;
  suggestedName: string;
  suggestedStartDate: string;
  suggestedEndDate: string;
  openGapsCount: number;
  recommendedActivities: Array<{
    activityType: string;
    reason: string;
    gapCount: number;
  }>;
}

export class PrepareNextCycleUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(pmsPlanId: string): Promise<NextCycleSuggestion> {
    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: pmsPlanId },
      select: {
        id: true,
        updateFrequency: true,
        cycles: {
          orderBy: { endDate: 'desc' },
          take: 1,
          select: { endDate: true, name: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', pmsPlanId);
    }

    // Get open gaps from Gap Registry
    const openGaps = await this.prisma.gapRegistryEntry.findMany({
      where: {
        pmsPlanId,
        status: 'OPEN',
      },
      select: {
        recommendedActivity: true,
        severity: true,
        description: true,
      },
    });

    // Aggregate recommended activities by type
    const activityMap = new Map<string, { count: number; severity: Set<string> }>();
    for (const gap of openGaps) {
      const activity = gap.recommendedActivity || 'LITERATURE_UPDATE';
      const current = activityMap.get(activity) || { count: 0, severity: new Set() };
      current.count++;
      current.severity.add(gap.severity);
      activityMap.set(activity, current);
    }

    const recommendedActivities = Array.from(activityMap.entries())
      .map(([activityType, data]) => ({
        activityType,
        reason: `${data.count} open gap${data.count > 1 ? 's' : ''} requiring attention (${Array.from(data.severity).join(', ')})`,
        gapCount: data.count,
      }))
      .sort((a, b) => b.gapCount - a.gapCount);

    // Calculate suggested date range based on last cycle and update frequency
    const lastCycle = plan.cycles[0];
    let suggestedStartDate: Date;
    let suggestedEndDate: Date;

    if (lastCycle) {
      suggestedStartDate = new Date(lastCycle.endDate);
      suggestedStartDate.setDate(suggestedStartDate.getDate() + 1);
    } else {
      suggestedStartDate = new Date();
    }

    // Default to 12-month cycle (annual)
    const frequencyMonths = this.parseFrequencyMonths(plan.updateFrequency);
    suggestedEndDate = new Date(suggestedStartDate);
    suggestedEndDate.setMonth(suggestedEndDate.getMonth() + frequencyMonths);

    // Generate suggested name
    const year = suggestedStartDate.getFullYear();
    const cycleNumber = (plan.cycles.length || 0) + 1;
    const suggestedName = `PMS Cycle ${cycleNumber} - ${year}`;

    return {
      pmsPlanId,
      suggestedName,
      suggestedStartDate: suggestedStartDate.toISOString().split('T')[0]!,
      suggestedEndDate: suggestedEndDate.toISOString().split('T')[0]!,
      openGapsCount: openGaps.length,
      recommendedActivities,
    };
  }

  private parseFrequencyMonths(frequency: string): number {
    // Parse frequency string like "ANNUAL", "SEMI_ANNUAL", "QUARTERLY"
    const freq = frequency.toLowerCase();
    if (freq.includes('annual') && !freq.includes('semi')) {
      return 12;
    } else if (freq.includes('semi')) {
      return 6;
    } else if (freq.includes('quarter')) {
      return 3;
    }
    return 12; // Default to annual
  }
}
