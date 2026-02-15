import type { PrismaClient, Prisma } from '@prisma/client';
import { generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface UserAssignment {
  userId: string;
  role?: string;
}

export class AssignProjectUsersUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string, assignments: UserAssignment[], performedBy: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    if (assignments.length === 0) {
      throw new ValidationError('At least one user assignment is required');
    }

    // Validate all users exist and are active
    const userIds = assignments.map((a) => a.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
    });

    if (users.length !== userIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missing = userIds.filter((id) => !foundIds.has(id));
      throw new ValidationError(`Users not found or inactive: ${missing.join(', ')}`);
    }

    // Check for existing memberships
    const existing = await this.prisma.projectMember.findMany({
      where: { projectId, userId: { in: userIds } },
    });
    const existingUserIds = new Set(existing.map((m) => m.userId));

    // Only create new memberships
    const newAssignments = assignments.filter((a) => !existingUserIds.has(a.userId));

    if (newAssignments.length > 0) {
      await this.prisma.projectMember.createMany({
        data: newAssignments.map((a) => ({
          id: generateId(),
          projectId,
          userId: a.userId,
          role: a.role ?? 'MEMBER',
        })),
      });
    }

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId: performedBy,
        action: 'project.users.assigned',
        targetType: 'project',
        targetId: projectId,
        after: {
          assigned: newAssignments.map((a) => a.userId),
          skipped: assignments.filter((a) => existingUserIds.has(a.userId)).map((a) => a.userId),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Return all members including newly added
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
    });
  }
}
