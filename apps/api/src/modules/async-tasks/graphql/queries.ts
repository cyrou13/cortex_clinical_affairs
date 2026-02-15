import { builder } from '../../../graphql/builder.js';
import { AsyncTaskType } from './types.js';
import { requireAuth } from '../../../shared/middleware/rbac-middleware.js';
import { TaskService } from '../../../shared/services/task-service.js';
import { getRedis } from '../../../config/redis.js';

builder.queryField('activeTasks', (t) =>
  t.field({
    type: [AsyncTaskType],
    description: 'Returns running and pending tasks for the current user',
    resolve: async (_parent, _args, ctx) => {
      requireAuth(ctx);
      const service = new TaskService(ctx.prisma, getRedis());
      return service.getActiveTasks(ctx.user.id);
    },
  }),
);

builder.queryField('taskHistory', (t) =>
  t.field({
    type: [AsyncTaskType],
    description: 'Returns completed, failed, and cancelled tasks for the current user',
    args: {
      limit: t.arg.int({ required: false, defaultValue: 20 }),
      offset: t.arg.int({ required: false, defaultValue: 0 }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      const service = new TaskService(ctx.prisma, getRedis());
      return service.getTaskHistory(ctx.user.id, args.limit ?? 20);
    },
  }),
);

builder.queryField('task', (t) =>
  t.field({
    type: AsyncTaskType,
    description: 'Returns a single task by ID',
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      const service = new TaskService(ctx.prisma, getRedis());
      return service.getTaskStatus(args.id);
    },
  }),
);
