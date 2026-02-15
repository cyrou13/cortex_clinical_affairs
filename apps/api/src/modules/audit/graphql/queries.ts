import { builder } from '../../../graphql/builder.js';
import { AuditLogType } from './types.js';
import { checkPermission } from '../../../shared/middleware/rbac-middleware.js';

builder.queryField('auditLogs', (t) =>
  t.field({
    type: [AuditLogType],
    args: {
      userId: t.arg.string({ required: false }),
      targetType: t.arg.string({ required: false }),
      targetId: t.arg.string({ required: false }),
      action: t.arg.string({ required: false }),
      limit: t.arg.int({ required: false }),
      offset: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'audit', 'read');

      const where: Record<string, unknown> = {};
      if (args.userId) where.userId = args.userId;
      if (args.targetType) where.targetType = args.targetType;
      if (args.targetId) where.targetId = args.targetId;
      if (args.action) where.action = args.action;

      return ctx.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: args.limit ?? 50,
        skip: args.offset ?? 0,
      });
    },
  }),
);

builder.queryField('entityHistory', (t) =>
  t.field({
    type: [AuditLogType],
    args: {
      targetType: t.arg.string({ required: true }),
      targetId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'audit', 'read');

      return ctx.prisma.auditLog.findMany({
        where: {
          targetType: args.targetType,
          targetId: args.targetId,
        },
        orderBy: { timestamp: 'desc' },
      });
    },
  }),
);
