import { hasPermission } from '@cortex/shared';
import type { UserRole } from '@cortex/shared';
import type { ModuleType, PermissionAction } from '@cortex/shared';
import type { GraphQLContext } from '../../graphql/context.js';
import { PermissionDeniedError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

interface DocumentWithStatus {
  status?: string;
  projectId?: string;
}

export function requireAuth(ctx: GraphQLContext): asserts ctx is GraphQLContext & {
  user: { id: string; role: string };
} {
  if (!ctx.user) {
    throw new PermissionDeniedError('Authentication required');
  }
}

export function checkPermission(
  ctx: GraphQLContext,
  module: ModuleType,
  action: PermissionAction,
): void {
  requireAuth(ctx);

  const role = ctx.user.role as UserRole;
  const allowed = hasPermission(role, module, action);

  // Log permission check to audit trail
  void logPermissionCheck(ctx, module, action, allowed);

  if (!allowed) {
    throw new PermissionDeniedError(
      `Role ${role} cannot perform '${action}' on module '${module}'`,
    );
  }
}

export function checkDocumentStatusAccess(
  ctx: GraphQLContext,
  module: ModuleType,
  action: PermissionAction,
  document: DocumentWithStatus,
): void {
  requireAuth(ctx);

  // First check role-based permission
  checkPermission(ctx, module, action);

  // Locked documents are read-only for all except Admin (who can unlock)
  if (document.status === 'LOCKED' && action !== 'read' && action !== 'unlock') {
    if (ctx.user.role !== 'ADMIN') {
      throw new PermissionDeniedError(
        'Document is locked. Only Admin can modify locked documents.',
      );
    }
  }
}

export async function checkProjectMembership(
  ctx: GraphQLContext,
  projectId: string,
): Promise<void> {
  requireAuth(ctx);

  // Admin has access to all projects
  if (ctx.user.role === 'ADMIN') return;

  const membership = await ctx.prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: ctx.user.id,
      },
    },
  });

  if (!membership) {
    throw new PermissionDeniedError('Not a member of this project');
  }
}

export function withPermission<TParent, TArgs, TResult>(
  module: ModuleType,
  action: PermissionAction,
  resolver: (parent: TParent, args: TArgs, ctx: GraphQLContext) => TResult,
) {
  return (parent: TParent, args: TArgs, ctx: GraphQLContext): TResult => {
    checkPermission(ctx, module, action);
    return resolver(parent, args, ctx);
  };
}

async function logPermissionCheck(
  ctx: GraphQLContext,
  module: ModuleType,
  action: PermissionAction,
  allowed: boolean,
): Promise<void> {
  try {
    await ctx.prisma.auditLog.create({
      data: {
        userId: ctx.user!.id,
        action: 'permission.check',
        targetType: module,
        targetId: '-',
        metadata: {
          action,
          role: ctx.user!.role,
          result: allowed ? 'allowed' : 'denied',
        },
      },
    });
  } catch (err) {
    logger.error({ err, module, action }, 'Failed to log permission check');
  }
}
