import { builder } from '../../../graphql/builder.js';
import { UserType, ProjectMemberType } from './types.js';
import { checkPermission, requireAuth } from '../../../shared/middleware/rbac-middleware.js';
import { UserRole } from '@cortex/shared';
import type { UserRole as UserRoleType } from '@cortex/shared';
import { ManageUsersUseCase } from '../application/use-cases/manage-users.js';
import { AssignUserToProjectUseCase } from '../application/use-cases/assign-user-to-project.js';
import { UnlockDocumentUseCase } from '../application/use-cases/unlock-document.js';
import { ValidationError } from '../../../shared/errors/index.js';

// --- Auth mutations ---

const AuthPayload = builder.objectRef<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    mfaEnabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  };
}>('AuthPayload');

builder.objectType(AuthPayload, {
  fields: (t) => ({
    accessToken: t.exposeString('accessToken'),
    refreshToken: t.exposeString('refreshToken'),
    user: t.field({
      type: UserType,
      resolve: (parent) => parent.user,
    }),
  }),
});

builder.mutationField('loginWithGoogle', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      googleToken: t.arg.string({ required: true }),
    },
    resolve: async (_parent, _args, _ctx) => {
      throw new ValidationError('Google OAuth requires valid credentials - configure GOOGLE_CLIENT_ID');
    },
  }),
);

const TokenRefreshPayload = builder.objectRef<{
  accessToken: string;
  refreshToken: string;
}>('TokenRefreshPayload');

builder.objectType(TokenRefreshPayload, {
  fields: (t) => ({
    accessToken: t.exposeString('accessToken'),
    refreshToken: t.exposeString('refreshToken'),
  }),
});

builder.mutationField('refreshToken', (t) =>
  t.field({
    type: TokenRefreshPayload,
    args: {
      refreshToken: t.arg.string({ required: true }),
    },
    resolve: async (_parent, _args, _ctx) => {
      throw new ValidationError('Token refresh requires Redis connection');
    },
  }),
);

builder.mutationField('logout', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      refreshToken: t.arg.string({ required: true }),
    },
    resolve: async (_parent, _args, _ctx) => {
      return true;
    },
  }),
);

// --- User Management mutations (Admin only) ---

builder.mutationField('createUser', (t) =>
  t.field({
    type: UserType,
    args: {
      email: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      role: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'users', 'admin');
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(args.role as UserRoleType)) {
        throw new ValidationError(`Invalid role: ${args.role}. Must be one of: ${validRoles.join(', ')}`);
      }
      const useCase = new ManageUsersUseCase(ctx.prisma);
      return useCase.createUser(
        { email: args.email, name: args.name, role: args.role as UserRoleType },
        ctx.user!.id,
      );
    },
  }),
);

builder.mutationField('updateUser', (t) =>
  t.field({
    type: UserType,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      role: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'users', 'admin');
      if (args.role) {
        const validRoles = Object.values(UserRole);
        if (!validRoles.includes(args.role as UserRoleType)) {
          throw new ValidationError(`Invalid role: ${args.role}. Must be one of: ${validRoles.join(', ')}`);
        }
      }
      const useCase = new ManageUsersUseCase(ctx.prisma);
      return useCase.updateUser(
        args.id,
        {
          name: args.name ?? undefined,
          role: (args.role as UserRoleType) ?? undefined,
        },
        ctx.user!.id,
      );
    },
  }),
);

builder.mutationField('deactivateUser', (t) =>
  t.field({
    type: UserType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'users', 'admin');
      const useCase = new ManageUsersUseCase(ctx.prisma);
      return useCase.deactivateUser(args.id, ctx.user!.id);
    },
  }),
);

builder.mutationField('reactivateUser', (t) =>
  t.field({
    type: UserType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'users', 'admin');
      const useCase = new ManageUsersUseCase(ctx.prisma);
      return useCase.reactivateUser(args.id, ctx.user!.id);
    },
  }),
);

// --- Project Assignment mutations ---

builder.mutationField('assignUserToProject', (t) =>
  t.field({
    type: ProjectMemberType,
    args: {
      userId: t.arg.string({ required: true }),
      projectId: t.arg.string({ required: true }),
      role: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'write');
      const useCase = new AssignUserToProjectUseCase(ctx.prisma);
      return useCase.assign(
        { userId: args.userId, projectId: args.projectId, role: args.role ?? undefined },
        ctx.user!.id,
      );
    },
  }),
);

builder.mutationField('removeUserFromProject', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      userId: t.arg.string({ required: true }),
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'project', 'write');
      const useCase = new AssignUserToProjectUseCase(ctx.prisma);
      return useCase.remove(args.userId, args.projectId, ctx.user!.id);
    },
  }),
);

// --- Document Unlock (Admin only) ---

builder.mutationField('unlockDocument', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      targetType: t.arg.string({ required: true }),
      targetId: t.arg.string({ required: true }),
      justification: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      checkPermission(ctx, args.targetType as 'project', 'unlock');
      const useCase = new UnlockDocumentUseCase(ctx.prisma);
      return useCase.unlock(
        {
          targetType: args.targetType,
          targetId: args.targetId,
          justification: args.justification,
        },
        ctx.user!.id,
      );
    },
  }),
);
