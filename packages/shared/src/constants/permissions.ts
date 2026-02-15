import type { UserRole } from './roles.js';
import type { ModuleType, PermissionAction, RolePermissions } from '../types/permissions.js';

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    project: ['read', 'write', 'lock', 'unlock', 'delete', 'admin'],
    sls: ['read', 'write', 'lock', 'unlock'],
    soa: ['read', 'write', 'lock', 'unlock'],
    validation: ['read', 'write', 'lock', 'unlock'],
    cer: ['read', 'write', 'lock', 'unlock'],
    pms: ['read', 'write', 'lock', 'unlock'],
    users: ['read', 'write', 'admin'],
    audit: ['read'],
    admin: ['read', 'write'],
  },
  RA_MANAGER: {
    project: ['read', 'write'],
    sls: ['read', 'write', 'lock'],
    soa: ['read', 'write', 'lock'],
    validation: ['read', 'write', 'lock'],
    cer: ['read', 'write', 'lock'],
    pms: ['read', 'write', 'lock'],
    users: ['read'],
    audit: ['read'],
    admin: [],
  },
  CLINICAL_SPECIALIST: {
    project: ['read'],
    sls: ['read', 'write', 'lock'],
    soa: ['read', 'write', 'lock'],
    validation: ['read'],
    cer: ['read'],
    pms: ['read', 'write'],
    users: [],
    audit: [],
    admin: [],
  },
  DATA_SCIENCE: {
    project: ['read'],
    sls: ['read'],
    soa: ['read'],
    validation: ['read', 'write'],
    cer: ['read'],
    pms: ['read'],
    users: [],
    audit: [],
    admin: [],
  },
  EXECUTIVE: {
    project: ['read'],
    sls: ['read'],
    soa: ['read'],
    validation: ['read'],
    cer: ['read'],
    pms: ['read'],
    users: [],
    audit: ['read'],
    admin: [],
  },
  AUDITOR: {
    project: ['read'],
    sls: ['read'],
    soa: ['read'],
    validation: ['read'],
    cer: ['read'],
    pms: ['read'],
    users: [],
    audit: ['read'],
    admin: [],
  },
} as const;

export function hasPermission(
  role: UserRole,
  module: ModuleType,
  action: PermissionAction,
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  const modulePermissions = permissions[module];
  if (!modulePermissions) return false;
  return modulePermissions.includes(action);
}

export function getPermissionsForRole(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] ?? ({} as RolePermissions);
}
