import { builder } from '../../../graphql/builder.js';
import { LlmConfigObjectType } from './types.js';
import { checkPermission } from '../../../shared/middleware/rbac-middleware.js';
import { ConfigureLlmUseCase } from '../application/use-cases/configure-llm.js';

builder.mutationField('createLlmConfig', (t) =>
  t.field({
    type: LlmConfigObjectType,
    args: {
      level: t.arg.string({ required: true }),
      projectId: t.arg.string({ required: false }),
      taskType: t.arg.string({ required: false }),
      provider: t.arg.string({ required: true }),
      model: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'write');

      const useCase = new ConfigureLlmUseCase(ctx.prisma);
      return useCase.create({
        level: args.level,
        projectId: args.projectId ?? undefined,
        taskType: args.taskType ?? undefined,
        provider: args.provider,
        model: args.model,
      }, ctx.user!.id);
    },
  }),
);

builder.mutationField('updateLlmConfig', (t) =>
  t.field({
    type: LlmConfigObjectType,
    args: {
      id: t.arg.string({ required: true }),
      provider: t.arg.string({ required: false }),
      model: t.arg.string({ required: false }),
      isActive: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'write');

      const useCase = new ConfigureLlmUseCase(ctx.prisma);
      const updateData: Record<string, unknown> = {};
      if (args.provider !== null && args.provider !== undefined) updateData.provider = args.provider;
      if (args.model !== null && args.model !== undefined) updateData.model = args.model;
      if (args.isActive !== null && args.isActive !== undefined) updateData.isActive = args.isActive;

      return useCase.update(args.id, updateData, ctx.user!.id);
    },
  }),
);

builder.mutationField('deleteLlmConfig', (t) =>
  t.field({
    type: LlmConfigObjectType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'write');

      const useCase = new ConfigureLlmUseCase(ctx.prisma);
      return useCase.softDelete(args.id, ctx.user!.id);
    },
  }),
);
