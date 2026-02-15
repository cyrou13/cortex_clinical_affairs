import type { PrismaClient } from '@prisma/client';
import { getDefaultPipelineStatus, type PipelineStatus } from '@cortex/shared';
import { NotFoundError } from '../../../../shared/errors/index.js';

export interface ProjectDashboard {
  id: string;
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  cep: {
    id: string;
    projectId: string;
    scope: string | null;
    objectives: string | null;
    deviceClassification: string | null;
    clinicalBackground: string | null;
    searchStrategy: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  members: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
  pipelineStatus: PipelineStatus;
  recentActivity: Array<{
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    metadata: unknown;
  }>;
}

export class GetProjectDashboardUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string): Promise<ProjectDashboard> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        cep: true,
        members: {
          include: { user: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Fetch recent activity from audit trail
    const recentActivity = await this.prisma.auditLog.findMany({
      where: {
        targetType: 'project',
        targetId: projectId,
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // For a new project, use default pipeline status
    // TODO: Compute from actual module states in later stories
    const pipelineStatus = getDefaultPipelineStatus();

    return {
      ...project,
      pipelineStatus,
      recentActivity,
    } as ProjectDashboard;
  }
}
