import type { PrismaClient, Prisma } from '@prisma/client';
import type { GraphQLContext } from '../../graphql/context.js';
import { logger } from '../utils/logger.js';

export interface AuditOptions {
  action: string;
  targetType: string;
  getTargetId: (args: any) => string;
  getBefore?: (args: any, ctx: GraphQLContext) => Promise<Record<string, unknown> | null>;
}

/**
 * Higher-order resolver wrapper that automatically logs audit trail entries.
 *
 * - Captures "before" state if `getBefore` is provided
 * - Calls the original resolver
 * - Logs success to AuditLog (fire-and-forget)
 * - On error: logs with `action + '.failed'` suffix and re-throws
 */
export function withAudit<TParent, TArgs, TResult>(
  options: AuditOptions,
  resolver: (parent: TParent, args: TArgs, ctx: GraphQLContext) => Promise<TResult>,
) {
  return async (parent: TParent, args: TArgs, ctx: GraphQLContext): Promise<TResult> => {
    const { action, targetType, getTargetId, getBefore } = options;
    const targetId = getTargetId(args);
    const userId = ctx.user?.id ?? 'anonymous';
    const timestamp = new Date().toISOString();

    let before: Record<string, unknown> | null = null;

    // Capture "before" state if a getter is provided
    if (getBefore) {
      try {
        before = await getBefore(args, ctx);
      } catch (err) {
        logger.warn({ err, action, targetType, targetId }, 'Failed to capture before state for audit');
      }
    }

    try {
      const result = await resolver(parent, args, ctx);

      // Fire-and-forget audit log write
      writeAuditLog(ctx.prisma, {
        userId,
        action,
        targetType,
        targetId,
        before,
        after: result as Record<string, unknown> | null,
        metadata: {
          requestId: ctx.requestId,
          timestamp,
        },
      });

      return result;
    } catch (error: unknown) {
      const errorCode =
        error instanceof Error && 'code' in error
          ? (error as Error & { code: string }).code
          : 'UNKNOWN';
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Fire-and-forget audit log for failure
      writeAuditLog(ctx.prisma, {
        userId,
        action: `${action}.failed`,
        targetType,
        targetId,
        before,
        after: null,
        metadata: {
          requestId: ctx.requestId,
          timestamp,
          error: {
            code: errorCode,
            message: errorMessage,
          },
        },
      });

      throw error;
    }
  };
}

/**
 * Writes an audit log entry without awaiting the result (fire-and-forget).
 * Errors are caught and logged but never propagate to the caller.
 */
function writeAuditLog(
  prisma: PrismaClient,
  data: {
    userId: string;
    action: string;
    targetType: string;
    targetId: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    metadata: Record<string, unknown>;
  },
): void {
  void prisma.auditLog
    .create({
      data: {
        userId: data.userId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        before: (data.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (data.after ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    })
    .catch((err: unknown) => {
      logger.error({ err, audit: data }, 'Failed to write audit log');
    });
}
