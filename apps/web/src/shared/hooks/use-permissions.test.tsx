import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock @cortex/shared
vi.mock('@cortex/shared', () => ({
  hasPermission: (role: string, _module: string, action: string) => {
    if (role === 'ADMIN') return true;
    if (role === 'CLINICAL_SPECIALIST' && _module === 'cer' && action === 'write') return false;
    if (role === 'CLINICAL_SPECIALIST' && _module === 'sls' && action === 'write') return true;
    return action === 'read';
  },
}));

// Mock use-current-user
vi.mock('./use-current-user', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'CLINICAL_SPECIALIST', email: 'test@test.com', name: 'Test' },
    loading: false,
  }),
}));

// Mock Apollo Client - both the core and react subpath
vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      userPermissions: [
        { module: 'sls', actions: ['read', 'write', 'lock'] },
        { module: 'cer', actions: ['read'] },
      ],
    },
    loading: false,
  }),
}));

import { usePermissions, useHasPermission, useCanWrite, useIsAdmin } from './use-permissions';

describe('usePermissions', () => {
  it('returns permission matrix for current user', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.role).toBe('CLINICAL_SPECIALIST');
    expect(result.current.permissions).toBeDefined();
    expect(result.current.permissions.sls).toContain('write');
  });

  it('returns loading false when user is loaded', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.loading).toBe(false);
  });
});

describe('useHasPermission', () => {
  it('returns true when permission exists', () => {
    const { result } = renderHook(() => useHasPermission('sls', 'write'));
    expect(result.current).toBe(true);
  });

  it('returns false when permission denied', () => {
    const { result } = renderHook(() => useHasPermission('cer', 'write'));
    expect(result.current).toBe(false);
  });
});

describe('useCanWrite', () => {
  it('returns true for writable module', () => {
    const { result } = renderHook(() => useCanWrite('sls'));
    expect(result.current).toBe(true);
  });

  it('returns false for read-only module', () => {
    const { result } = renderHook(() => useCanWrite('cer'));
    expect(result.current).toBe(false);
  });
});

describe('useIsAdmin', () => {
  it('returns false for non-admin user', () => {
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});
