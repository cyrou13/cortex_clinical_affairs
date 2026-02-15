import { builder } from '../../../graphql/builder.js';
import { ProjectType, CepType } from './types.js';
import { ProjectMemberType } from '../../auth/graphql/types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project.js';
import { ConfigureCepUseCase } from '../application/use-cases/configure-cep.js';
import { AssignProjectUsersUseCase } from '../application/use-cases/assign-project-users.js';
import { getEventBus } from '../../../shared/events/rabbitmq-event-bus.js';
import { ValidationError } from '../../../shared/errors/index.js';

builder.mutationField('createProject', (t) =>
  t.field({
    type: ProjectType,
    args: {
      name: t.arg.string({ required: true }),
      deviceName: t.arg.string({ required: true }),
      deviceClass: t.arg.string({ required: true }),
      regulatoryContext: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'write');
      const eventBus = getEventBus();
      const useCase = new CreateProjectUseCase(ctx.prisma, eventBus);
      return useCase.execute(args, ctx.user!.id, ctx.requestId);
    },
  }),
);

builder.mutationField('updateProject', (t) =>
  t.field({
    type: ProjectType,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      deviceName: t.arg.string({ required: false }),
      deviceClass: t.arg.string({ required: false }),
      regulatoryContext: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'write');
      await checkProjectMembership(ctx, args.id);

      const data: Record<string, string> = {};
      if (args.name) {
        if (args.name.trim().length === 0) throw new ValidationError('Project name cannot be empty');
        if (args.name.length > 200) throw new ValidationError('Project name must be 200 characters or less');
        data.name = args.name.trim();
      }
      if (args.deviceName) {
        if (args.deviceName.trim().length === 0) throw new ValidationError('Device name cannot be empty');
        data.deviceName = args.deviceName.trim();
      }
      if (args.deviceClass) data.deviceClass = args.deviceClass;
      if (args.regulatoryContext) data.regulatoryContext = args.regulatoryContext;

      return ctx.prisma.project.update({
        where: { id: args.id },
        data,
        include: { cep: true },
      });
    },
  }),
);

builder.mutationField('configureCep', (t) =>
  t.field({
    type: CepType,
    args: {
      projectId: t.arg.string({ required: true }),
      scope: t.arg.string({ required: false }),
      objectives: t.arg.string({ required: false }),
      deviceClassification: t.arg.string({ required: false }),
      clinicalBackground: t.arg.string({ required: false }),
      searchStrategy: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new ConfigureCepUseCase(ctx.prisma);
      const { projectId, ...input } = args;
      return useCase.execute(projectId, input, ctx.user!.id);
    },
  }),
);

builder.mutationField('assignProjectUsers', (t) =>
  t.field({
    type: [ProjectMemberType],
    args: {
      projectId: t.arg.string({ required: true }),
      userIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new AssignProjectUsersUseCase(ctx.prisma);
      const assignments = args.userIds.map((userId) => ({ userId }));
      return useCase.execute(args.projectId, assignments, ctx.user!.id);
    },
  }),
);
