import { builder } from '../../../graphql/builder.js';
import { LlmConfigObjectType, LlmCostSummaryType } from './types.js';
import { checkPermission } from '../../../shared/middleware/rbac-middleware.js';
import { ResolveLlmConfigUseCase } from '../application/use-cases/resolve-llm-config.js';
import { GetCostSummaryUseCase } from '../application/use-cases/get-cost-summary.js';

builder.queryField('llmConfigs', (t) =>
  t.field({
    type: [LlmConfigObjectType],
    args: {
      projectId: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'read');

      const where: Record<string, unknown> = { isActive: true };
      if (args.projectId) {
        where.projectId = args.projectId;
      }

      return (ctx.prisma as any).llmConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);

builder.queryField('resolvedLlmConfig', (t) =>
  t.field({
    type: LlmConfigObjectType,
    nullable: true,
    args: {
      projectId: t.arg.string({ required: false }),
      taskType: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'read');

      const useCase = new ResolveLlmConfigUseCase(ctx.prisma);
      return useCase.execute(args.taskType, args.projectId ?? undefined);
    },
  }),
);

builder.queryField('llmCostSummary', (t) =>
  t.field({
    type: LlmCostSummaryType,
    args: {
      projectId: t.arg.string({ required: false }),
      startDate: t.arg.string({ required: false }),
      endDate: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'read');

      const useCase = new GetCostSummaryUseCase(ctx.prisma);
      return useCase.execute(
        args.projectId ?? undefined,
        args.startDate && args.endDate
          ? { start: args.startDate, end: args.endDate }
          : undefined,
      );
    },
  }),
);
