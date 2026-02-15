import { builder } from '../../../graphql/builder.js';
import { AsyncTaskType } from './types.js';
import { requireAuth } from '../../../shared/middleware/rbac-middleware.js';
import { TaskService } from '../../../shared/services/task-service.js';
import { getRedis } from '../../../config/redis.js';

builder.mutationField('cancelTask', (t) =>
  t.field({
    type: AsyncTaskType,
    description: 'Cancels a running or pending task',
    args: {
      taskId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      const service = new TaskService(ctx.prisma, getRedis());
      return service.cancelTask(args.taskId, ctx.user.id);
    },
  }),
);
