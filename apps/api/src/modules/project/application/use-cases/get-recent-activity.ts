import type { PrismaClient } from '@prisma/client';

export interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  targetType: string;
  targetId: string;
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  'project.created': 'created this project',
  'project.updated': 'updated project settings',
  'project.users.assigned': 'added team members',
  'cep.configured': 'updated the clinical evaluation plan',
  'permission.check': 'accessed the project',
};

export class GetRecentActivityUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string, limit = 20): Promise<ActivityEntry[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: {
        targetType: 'project',
        targetId: projectId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // Collect unique user IDs and fetch names
    const userIds = [...new Set(entries.map((e) => e.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      description: this.formatDescription(entry.action, userMap.get(entry.userId) ?? 'Unknown'),
      userId: entry.userId,
      userName: userMap.get(entry.userId) ?? 'Unknown',
      timestamp: entry.timestamp.toISOString(),
      targetType: entry.targetType,
      targetId: entry.targetId,
    }));
  }

  private formatDescription(action: string, userName: string): string {
    const template = ACTION_DESCRIPTIONS[action];
    if (template) {
      return `${userName} ${template}`;
    }
    return `${userName} performed ${action.replace(/\./g, ' ')}`;
  }
}
