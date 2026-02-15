import { builder } from '../../../graphql/builder.js';
import { ProjectType, ProjectDashboardType } from './types.js';
import { requireAuth, checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { GetProjectDashboardUseCase } from '../application/use-cases/get-project-dashboard.js';

builder.queryField('projects', (t) =>
  t.field({
    type: [ProjectType],
    args: {
      status: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'read');

      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;

      // Filter by membership unless admin
      if (ctx.user!.role !== 'ADMIN') {
        where.members = { some: { userId: ctx.user!.id } };
      }

      return ctx.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { cep: true },
      });
    },
  }),
);

builder.queryField('project', (t) =>
  t.field({
    type: ProjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'read');
      await checkProjectMembership(ctx, args.id);

      return ctx.prisma.project.findUnique({
        where: { id: args.id },
        include: {
          cep: true,
          members: {
            include: { user: true },
          },
        },
      });
    },
  }),
);

builder.queryField('projectDashboard', (t) =>
  t.field({
    type: ProjectDashboardType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'read');
      await checkProjectMembership(ctx, args.id);

      const useCase = new GetProjectDashboardUseCase(ctx.prisma);
      return useCase.execute(args.id) as any;
    },
  }),
);
