import type { PrismaClient } from '@prisma/client';

export type MilestoneStatus = 'pending' | 'active' | 'completed';

export interface Milestone {
  id: string;
  name: string;
  module: string;
  status: MilestoneStatus;
  targetDate: string | null;
  completedDate: string | null;
  order: number;
}

const DEFAULT_MILESTONES = [
  { id: 'sls-complete', name: 'SLS Complete', module: 'sls', order: 1 },
  { id: 'soa-complete', name: 'SOA Complete', module: 'soa', order: 2 },
  { id: 'validation-complete', name: 'Validation Complete', module: 'validation', order: 3 },
  { id: 'cer-assembled', name: 'CER Assembled', module: 'cer', order: 4 },
  { id: 'pms-plan-active', name: 'PMS Plan Active', module: 'pms', order: 5 },
];

export class GetProjectTimelineUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string): Promise<Milestone[]> {
    // For new projects, return default milestones with pending status
    // Will be enhanced when module states are tracked
    return DEFAULT_MILESTONES.map((m) => ({
      ...m,
      status: 'pending' as MilestoneStatus,
      targetDate: null,
      completedDate: null,
    }));
  }
}
