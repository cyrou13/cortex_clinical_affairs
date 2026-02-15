export const PERMISSION_ACTIONS = ['read', 'write', 'lock', 'unlock', 'delete', 'admin'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const MODULE_TYPES = [
  'project',
  'sls',
  'soa',
  'validation',
  'cer',
  'pms',
  'users',
  'audit',
  'admin',
] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export type RolePermissions = Record<ModuleType, readonly PermissionAction[]>;
