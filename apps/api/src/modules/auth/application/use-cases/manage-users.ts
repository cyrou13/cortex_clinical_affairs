import type { PrismaClient } from '@prisma/client';
import type { UserRole } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { logger } from '../../../../shared/utils/logger.js';

interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
}

interface UpdateUserInput {
  name?: string;
  role?: UserRole;
}

interface UserFilter {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ManageUsersUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async createUser(input: CreateUserInput, adminId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ValidationError('User with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.created',
        targetType: 'user',
        targetId: user.id,
        after: { email: user.email, name: user.name, role: user.role },
      },
    });

    logger.info({ userId: user.id, role: user.role }, 'User created');
    return user;
  }

  async updateUser(userId: string, input: UpdateUserInput, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    const before = { name: user.name, role: user.role };

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.role !== undefined && { role: input.role }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.updated',
        targetType: 'user',
        targetId: userId,
        before,
        after: { name: updated.name, role: updated.role },
      },
    });

    logger.info({ userId, changes: input }, 'User updated');
    return updated;
  }

  async deactivateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    if (userId === adminId) {
      throw new ValidationError('Cannot deactivate your own account');
    }

    // Use transaction to prevent race condition on last admin check
    const updated = await this.prisma.$transaction(async (tx) => {
      if (user.role === 'ADMIN') {
        const adminCount = await tx.user.count({
          where: { role: 'ADMIN', isActive: true },
        });
        if (adminCount <= 1) {
          throw new ValidationError('Cannot deactivate the last active Admin');
        }
      }

      const deactivated = await tx.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Invalidate all sessions
      await tx.session.deleteMany({ where: { userId } });

      return deactivated;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.deactivated',
        targetType: 'user',
        targetId: userId,
        before: { isActive: true },
        after: { isActive: false },
      },
    });

    logger.info({ userId }, 'User deactivated');
    return updated;
  }

  async reactivateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.reactivated',
        targetType: 'user',
        targetId: userId,
        before: { isActive: false },
        after: { isActive: true },
      },
    });

    logger.info({ userId }, 'User reactivated');
    return updated;
  }

  async listUsers(filter: UserFilter = {}) {
    const where: Record<string, unknown> = {};

    if (filter.role) where.role = filter.role;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }
}
