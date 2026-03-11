import { builder } from '../../../graphql/builder.js';
import { LlmConfigObjectType, LlmCostSummaryType, ProviderHealthType } from './types.js';
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

      return ctx.prisma.llmConfig.findMany({
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

builder.queryField('providerHealth', (t) =>
  t.field({
    type: [ProviderHealthType],
    resolve: async (_parent, _args, ctx) => {
      checkPermission(ctx, 'admin', 'read');

      const PROVIDERS = ['claude', 'openai', 'ollama'] as const;

      const settings = await (ctx.prisma as any).appSetting.findMany({
        where: { category: 'api_keys' },
      });

      const settingMap = new Map<string, string>(
        settings.map((s: { key: string; value: string }) => [s.key, s.value]),
      );

      const now = new Date().toISOString();

      return PROVIDERS.map((provider) => {
        let healthy = false;
        if (provider === 'claude') {
          healthy = !!settingMap.get('anthropicApiKey');
        } else if (provider === 'openai') {
          healthy = !!settingMap.get('openaiApiKey');
        } else if (provider === 'ollama') {
          // Ollama is local — consider healthy if a base URL is set, or always healthy
          healthy = !!settingMap.get('ollamaBaseUrl') || true;
        }

        return {
          provider,
          status: healthy ? 'healthy' : 'unhealthy',
          lastCheckAt: now,
        };
      });
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
        args.startDate && args.endDate ? { start: args.startDate, end: args.endDate } : undefined,
      );
    },
  }),
);
