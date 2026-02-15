import { builder } from '../../../graphql/builder.js';

export const UserType = builder.objectRef<{
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}>('User');

builder.objectType(UserType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name'),
    avatarUrl: t.exposeString('avatarUrl', { nullable: true }),
    role: t.exposeString('role'),
    isActive: t.exposeBoolean('isActive'),
    mfaEnabled: t.exposeBoolean('mfaEnabled'),
    lastLoginAt: t.expose('lastLoginAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const ProjectMemberType = builder.objectRef<{
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: Date;
  user?: { id: string; email: string; name: string; avatarUrl: string | null; role: string; isActive: boolean; mfaEnabled: boolean; lastLoginAt: Date | null; createdAt: Date };
}>('ProjectMember');

builder.objectType(ProjectMemberType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    userId: t.exposeString('userId'),
    role: t.exposeString('role'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    user: t.field({
      type: UserType,
      nullable: true,
      resolve: (parent) => parent.user ?? null,
    }),
  }),
});

export const UserListType = builder.objectRef<{
  users: Array<{
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    mfaEnabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
}>('UserList');

builder.objectType(UserListType, {
  fields: (t) => ({
    users: t.field({
      type: [UserType],
      resolve: (parent) => parent.users,
    }),
    total: t.exposeInt('total'),
  }),
});

export const PermissionEntryType = builder.objectRef<{
  module: string;
  actions: string[];
}>('PermissionEntry');

builder.objectType(PermissionEntryType, {
  fields: (t) => ({
    module: t.exposeString('module'),
    actions: t.exposeStringList('actions'),
  }),
});
