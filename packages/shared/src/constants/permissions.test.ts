import { describe, it, expect } from 'vitest';
import { hasPermission, getPermissionsForRole, ROLE_PERMISSIONS } from './permissions';
import { UserRole } from './roles';
import type { ModuleType, PermissionAction } from '../types/permissions';

describe('Permission Matrix', () => {
  describe('ROLE_PERMISSIONS', () => {
    it('defines permissions for all 6 roles', () => {
      const roles: UserRole[] = [
        'ADMIN',
        'RA_MANAGER',
        'CLINICAL_SPECIALIST',
        'DATA_SCIENCE',
        'EXECUTIVE',
        'AUDITOR',
      ];
      for (const role of roles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      }
    });

    it('defines permissions for all 8 modules per role', () => {
      const modules: ModuleType[] = [
        'project',
        'sls',
        'soa',
        'validation',
        'cer',
        'pms',
        'users',
        'audit',
      ];
      for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
        for (const mod of modules) {
          expect(ROLE_PERMISSIONS[role][mod]).toBeDefined();
        }
      }
    });
  });

  describe('hasPermission', () => {
    // Admin full access
    it('Admin has full access to all modules', () => {
      const modules: ModuleType[] = ['project', 'sls', 'soa', 'validation', 'cer', 'pms'];
      for (const mod of modules) {
        expect(hasPermission('ADMIN', mod, 'read')).toBe(true);
        expect(hasPermission('ADMIN', mod, 'write')).toBe(true);
        expect(hasPermission('ADMIN', mod, 'lock')).toBe(true);
        expect(hasPermission('ADMIN', mod, 'unlock')).toBe(true);
      }
    });

    it('Admin has user admin permissions', () => {
      expect(hasPermission('ADMIN', 'users', 'read')).toBe(true);
      expect(hasPermission('ADMIN', 'users', 'write')).toBe(true);
      expect(hasPermission('ADMIN', 'users', 'admin')).toBe(true);
    });

    // RA Manager
    it('RA Manager can read/write/lock all pipeline modules', () => {
      const modules: ModuleType[] = ['sls', 'soa', 'validation', 'cer', 'pms'];
      for (const mod of modules) {
        expect(hasPermission('RA_MANAGER', mod, 'read')).toBe(true);
        expect(hasPermission('RA_MANAGER', mod, 'write')).toBe(true);
        expect(hasPermission('RA_MANAGER', mod, 'lock')).toBe(true);
      }
    });

    it('RA Manager cannot unlock', () => {
      expect(hasPermission('RA_MANAGER', 'sls', 'unlock')).toBe(false);
    });

    it('RA Manager can read users but not admin', () => {
      expect(hasPermission('RA_MANAGER', 'users', 'read')).toBe(true);
      expect(hasPermission('RA_MANAGER', 'users', 'admin')).toBe(false);
    });

    // Clinical Specialist
    it('Clinical Specialist has SLS/SOA write access', () => {
      expect(hasPermission('CLINICAL_SPECIALIST', 'sls', 'write')).toBe(true);
      expect(hasPermission('CLINICAL_SPECIALIST', 'soa', 'write')).toBe(true);
    });

    it('Clinical Specialist has CER read-only', () => {
      expect(hasPermission('CLINICAL_SPECIALIST', 'cer', 'read')).toBe(true);
      expect(hasPermission('CLINICAL_SPECIALIST', 'cer', 'write')).toBe(false);
    });

    it('Clinical Specialist has validation read-only', () => {
      expect(hasPermission('CLINICAL_SPECIALIST', 'validation', 'read')).toBe(true);
      expect(hasPermission('CLINICAL_SPECIALIST', 'validation', 'write')).toBe(false);
    });

    it('Clinical Specialist has PMS read/write (no lock)', () => {
      expect(hasPermission('CLINICAL_SPECIALIST', 'pms', 'read')).toBe(true);
      expect(hasPermission('CLINICAL_SPECIALIST', 'pms', 'write')).toBe(true);
      expect(hasPermission('CLINICAL_SPECIALIST', 'pms', 'lock')).toBe(false);
    });

    it('Clinical Specialist has no user/audit access', () => {
      expect(hasPermission('CLINICAL_SPECIALIST', 'users', 'read')).toBe(false);
      expect(hasPermission('CLINICAL_SPECIALIST', 'audit', 'read')).toBe(false);
    });

    // Data Science
    it('Data Science can write validation only', () => {
      expect(hasPermission('DATA_SCIENCE', 'validation', 'read')).toBe(true);
      expect(hasPermission('DATA_SCIENCE', 'validation', 'write')).toBe(true);
      expect(hasPermission('DATA_SCIENCE', 'sls', 'write')).toBe(false);
      expect(hasPermission('DATA_SCIENCE', 'soa', 'write')).toBe(false);
      expect(hasPermission('DATA_SCIENCE', 'cer', 'write')).toBe(false);
      expect(hasPermission('DATA_SCIENCE', 'pms', 'write')).toBe(false);
    });

    // Executive
    it('Executive is read-only everywhere', () => {
      const modules: ModuleType[] = ['project', 'sls', 'soa', 'validation', 'cer', 'pms'];
      for (const mod of modules) {
        expect(hasPermission('EXECUTIVE', mod, 'read')).toBe(true);
        expect(hasPermission('EXECUTIVE', mod, 'write')).toBe(false);
      }
    });

    it('Executive can read audit log', () => {
      expect(hasPermission('EXECUTIVE', 'audit', 'read')).toBe(true);
    });

    // Auditor
    it('Auditor is read-only everywhere', () => {
      const modules: ModuleType[] = ['project', 'sls', 'soa', 'validation', 'cer', 'pms'];
      for (const mod of modules) {
        expect(hasPermission('AUDITOR', mod, 'read')).toBe(true);
        expect(hasPermission('AUDITOR', mod, 'write')).toBe(false);
      }
    });

    it('Auditor can read audit log', () => {
      expect(hasPermission('AUDITOR', 'audit', 'read')).toBe(true);
    });

    it('returns false for invalid role', () => {
      expect(hasPermission('NONEXISTENT' as UserRole, 'sls', 'read')).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('returns full permission map for Admin', () => {
      const perms = getPermissionsForRole('ADMIN');
      expect(perms.project).toContain('admin');
      expect(perms.users).toContain('admin');
    });

    it('returns empty-like object for invalid role', () => {
      const perms = getPermissionsForRole('NONEXISTENT' as UserRole);
      expect(perms).toEqual({});
    });
  });
});
