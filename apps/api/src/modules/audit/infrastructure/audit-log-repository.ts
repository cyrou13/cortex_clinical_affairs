import type { PrismaClient, AuditLog, Prisma } from '@prisma/client';

export interface AuditLogCreateInput {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogFilter {
  userId?: string;
  targetType?: string;
  targetId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

/**
 * Read-only repository for AuditLog entries.
 * Only exposes `create` as the single write method.
 * No update or delete methods -- audit logs are append-only.
 */
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        before: (data.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (data.after ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findMany(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.targetType) where.targetType = filter.targetType;
    if (filter.targetId) where.targetId = filter.targetId;
    if (filter.action) where.action = filter.action;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filter.limit ?? 50,
      skip: filter.offset ?? 0,
    });
  }

  async findByEntity(targetType: string, targetId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        targetType,
        targetId,
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
