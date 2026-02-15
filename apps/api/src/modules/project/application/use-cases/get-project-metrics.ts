import type { PrismaClient } from '@prisma/client';

export interface ProjectMetrics {
  totalArticles: number;
  includedArticles: number;
  soaSectionsComplete: number;
  soaSectionsTotal: number;
  cerSectionsComplete: number;
  cerSectionsTotal: number;
  traceabilityCoverage: number;
  teamMemberCount: number;
  lastActivityAt: string | null;
}

export class GetProjectMetricsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string): Promise<ProjectMetrics> {
    // Count team members
    const teamMemberCount = await this.prisma.projectMember.count({
      where: { projectId },
    });

    // Get last activity
    const lastActivity = await this.prisma.auditLog.findFirst({
      where: { targetType: 'project', targetId: projectId },
      orderBy: { timestamp: 'desc' },
    });

    // For now, return zeros for module-specific counts
    // These will be populated when SLS, SOA, etc. modules are implemented
    return {
      totalArticles: 0,
      includedArticles: 0,
      soaSectionsComplete: 0,
      soaSectionsTotal: 11,
      cerSectionsComplete: 0,
      cerSectionsTotal: 14,
      traceabilityCoverage: 0,
      teamMemberCount,
      lastActivityAt: lastActivity?.timestamp?.toISOString() ?? null,
    };
  }
}
