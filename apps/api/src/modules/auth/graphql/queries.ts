import { builder } from '../../../graphql/builder.js';
import { UserType, UserListType, ProjectMemberType, PermissionEntryType } from './types.js';
import { checkPermission } from '../../../shared/middleware/rbac-middleware.js';
import { getPermissionsForRole } from '@cortex/shared';
import type { UserRole } from '@cortex/shared';
import { MODULE_TYPES } from '@cortex/shared';
import { ManageUsersUseCase } from '../application/use-cases/manage-users.js';
import { AssignUserToProjectUseCase } from '../application/use-cases/assign-user-to-project.js';

builder.queryField('me', (t) =>
  t.field({
    type: UserType,
    nullable: true,
    resolve: async (_parent, _args, ctx) => {
      if (!ctx.user) return null;
      return ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
      });
    },
  }),
);

builder.queryField('users', (t) =>
  t.field({
    type: UserListType,
    args: {
      role: t.arg.string({ required: false }),
      isActive: t.arg.boolean({ required: false }),
      search: t.arg.string({ required: false }),
      limit: t.arg.int({ required: false }),
      offset: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'users', 'read');
      const useCase = new ManageUsersUseCase(ctx.prisma);
      return useCase.listUsers({
        role: args.role as UserRole | undefined,
        isActive: args.isActive ?? undefined,
        search: args.search ?? undefined,
        limit: args.limit ?? undefined,
        offset: args.offset ?? undefined,
      });
    },
  }),
);

builder.queryField('projectMembers', (t) =>
  t.field({
    type: [ProjectMemberType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'read');
      const useCase = new AssignUserToProjectUseCase(ctx.prisma);
      return useCase.listProjectMembers(args.projectId);
    },
  }),
);

builder.queryField('userPermissions', (t) =>
  t.field({
    type: [PermissionEntryType],
    args: {
      userId: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      if (!ctx.user) throw new Error('Authentication required');

      // Users can view their own permissions; admins can view anyone's
      const targetUserId = args.userId ?? ctx.user.id;
      if (targetUserId !== ctx.user.id) {
        checkPermission(ctx, 'users', 'read');
      }

      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { role: true },
      });

      if (!targetUser) return [];

      const permissions = getPermissionsForRole(targetUser.role as UserRole);
      return MODULE_TYPES.map((module) => ({
        module,
        actions: [...(permissions[module] ?? [])],
      }));
    },
  }),
);
