import { builder } from '../../../graphql/builder.js';
import { EnrichedDashboardType } from './dashboard-types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { GetPipelineStatusUseCase } from '../application/use-cases/get-pipeline-status.js';
import { GetProjectMetricsUseCase } from '../application/use-cases/get-project-metrics.js';
import { GetRecentActivityUseCase } from '../application/use-cases/get-recent-activity.js';
import { GetProjectTimelineUseCase } from '../application/use-cases/get-project-timeline.js';
import { NotFoundError } from '../../../shared/errors/index.js';

builder.queryField('enrichedProjectDashboard', (t) =>
  t.field({
    type: EnrichedDashboardType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'read');
      await checkProjectMembership(ctx, args.id);

      const project = await ctx.prisma.project.findUnique({
        where: { id: args.id },
        include: {
          cep: true,
          members: {
            include: { user: true },
          },
        },
      });

      if (!project) {
        throw new NotFoundError('Project', args.id);
      }

      // Execute all use cases in parallel for performance
      const [pipelineStatusDetailed, metrics, recentActivities, milestones] = await Promise.all([
        new GetPipelineStatusUseCase(ctx.prisma).execute(args.id),
        new GetProjectMetricsUseCase(ctx.prisma).execute(args.id),
        new GetRecentActivityUseCase(ctx.prisma).execute(args.id),
        new GetProjectTimelineUseCase(ctx.prisma).execute(args.id),
      ]);

      return {
        ...project,
        members: project.members as unknown[],
        pipelineStatusDetailed,
        metrics,
        recentActivities,
        milestones,
      };
    },
  }),
);
