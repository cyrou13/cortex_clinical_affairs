import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { logger } from '../../../../shared/utils/logger.js';

interface AssignInput {
  userId: string;
  projectId: string;
  role?: string;
}

export class AssignUserToProjectUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async assign(input: AssignInput, assignedBy: string) {
    const [user, project] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId } }),
      this.prisma.project.findUnique({ where: { id: input.projectId } }),
    ]);

    if (!user) throw new NotFoundError('User', input.userId);
    if (!project) throw new NotFoundError('Project', input.projectId);
    if (!user.isActive) throw new ValidationError('Cannot assign inactive user to project');

    const existing = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: input.projectId,
          userId: input.userId,
        },
      },
    });

    if (existing) {
      throw new ValidationError('User is already a member of this project');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        role: input.role ?? user.role,
      },
      include: { user: true, project: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: assignedBy,
        action: 'project.member.assigned',
        targetType: 'project',
        targetId: input.projectId,
        after: { userId: input.userId, role: member.role },
      },
    });

    logger.info(
      { projectId: input.projectId, userId: input.userId },
      'User assigned to project',
    );
    return member;
  }

  async remove(userId: string, projectId: string, removedBy: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) throw new NotFoundError('ProjectMember', `${projectId}:${userId}`);

    await this.prisma.projectMember.delete({
      where: { id: member.id },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: removedBy,
        action: 'project.member.removed',
        targetType: 'project',
        targetId: projectId,
        before: { userId, role: member.role },
      },
    });

    logger.info({ projectId, userId }, 'User removed from project');
    return true;
  }

  async listProjectMembers(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
