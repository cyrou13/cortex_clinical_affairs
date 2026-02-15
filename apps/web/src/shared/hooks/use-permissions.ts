import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useCurrentUser } from './use-current-user';
import { hasPermission } from '@cortex/shared';
import type { UserRole } from '@cortex/shared';
import type { ModuleType, PermissionAction } from '@cortex/shared';

const USER_PERMISSIONS_QUERY = gql`
  query UserPermissions {
    userPermissions {
      module
      actions
    }
  }
`;

interface PermissionEntry {
  module: string;
  actions: string[];
}

export function usePermissions() {
  const { user } = useCurrentUser();

  const { data } = useQuery<{ userPermissions: PermissionEntry[] }>(USER_PERMISSIONS_QUERY, {
    skip: !user,
    fetchPolicy: 'cache-first',
  });

  const permissionMatrix = useMemo(() => {
    if (!data?.userPermissions) return {};
    const matrix: Record<string, string[]> = {};
    for (const entry of data.userPermissions) {
      matrix[entry.module] = entry.actions;
    }
    return matrix;
  }, [data]);

  return {
    permissions: permissionMatrix,
    role: (user?.role ?? null) as UserRole | null,
    loading: !user,
  };
}

export function useHasPermission(module: ModuleType, action: PermissionAction): boolean {
  const { role } = usePermissions();
  return useMemo(() => {
    if (!role) return false;
    return hasPermission(role, module, action);
  }, [role, module, action]);
}

export function useCanWrite(module: ModuleType): boolean {
  return useHasPermission(module, 'write');
}

export function useIsAdmin(): boolean {
  const { role } = usePermissions();
  return role === 'ADMIN';
}
