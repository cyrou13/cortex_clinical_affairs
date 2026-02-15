import { describe, it, expect, vi } from 'vitest';
import {
  requireAuth,
  checkPermission,
  checkDocumentStatusAccess,
  withPermission,
} from './rbac-middleware.js';
import type { GraphQLContext } from '../../graphql/context.js';
import { PermissionDeniedError } from '../errors/index.js';

function makeCtx(overrides: Partial<GraphQLContext> = {}): GraphQLContext {
  return {
    prisma: {
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      projectMember: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as GraphQLContext['prisma'],
    user: { id: 'user-1', role: 'ADMIN' },
    requestId: 'req-1',
    reply: {} as GraphQLContext['reply'],
    ...overrides,
  } as GraphQLContext;
}

describe('RBAC Middleware', () => {
  describe('requireAuth', () => {
    it('passes when user is present', () => {
      const ctx = makeCtx();
      expect(() => requireAuth(ctx)).not.toThrow();
    });

    it('throws when user is null', () => {
      const ctx = makeCtx({ user: null });
      expect(() => requireAuth(ctx)).toThrow(PermissionDeniedError);
      expect(() => requireAuth(ctx)).toThrow('Authentication required');
    });
  });

  describe('checkPermission', () => {
    it('allows Admin to write on sls', () => {
      const ctx = makeCtx({ user: { id: 'u1', role: 'ADMIN' } });
      expect(() => checkPermission(ctx, 'sls', 'write')).not.toThrow();
    });

    it('allows RA_MANAGER to write on cer', () => {
      const ctx = makeCtx({ user: { id: 'u2', role: 'RA_MANAGER' } });
      expect(() => checkPermission(ctx, 'cer', 'write')).not.toThrow();
    });

    it('denies CLINICAL_SPECIALIST write on cer', () => {
      const ctx = makeCtx({ user: { id: 'u3', role: 'CLINICAL_SPECIALIST' } });
      expect(() => checkPermission(ctx, 'cer', 'write')).toThrow(PermissionDeniedError);
    });

    it('denies DATA_SCIENCE write on sls', () => {
      const ctx = makeCtx({ user: { id: 'u4', role: 'DATA_SCIENCE' } });
      expect(() => checkPermission(ctx, 'sls', 'write')).toThrow(PermissionDeniedError);
    });

    it('denies EXECUTIVE write on any module', () => {
      const ctx = makeCtx({ user: { id: 'u5', role: 'EXECUTIVE' } });
      expect(() => checkPermission(ctx, 'project', 'write')).toThrow(PermissionDeniedError);
      expect(() => checkPermission(ctx, 'sls', 'write')).toThrow(PermissionDeniedError);
    });

    it('allows AUDITOR to read', () => {
      const ctx = makeCtx({ user: { id: 'u6', role: 'AUDITOR' } });
      expect(() => checkPermission(ctx, 'sls', 'read')).not.toThrow();
    });

    it('denies AUDITOR write', () => {
      const ctx = makeCtx({ user: { id: 'u7', role: 'AUDITOR' } });
      expect(() => checkPermission(ctx, 'sls', 'write')).toThrow(PermissionDeniedError);
    });

    it('throws when not authenticated', () => {
      const ctx = makeCtx({ user: null });
      expect(() => checkPermission(ctx, 'sls', 'read')).toThrow('Authentication required');
    });

    it('logs permission check to audit trail', () => {
      const ctx = makeCtx({ user: { id: 'u1', role: 'ADMIN' } });
      checkPermission(ctx, 'sls', 'write');
      // The audit log create is called asynchronously (void)
      expect(ctx.prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('checkDocumentStatusAccess', () => {
    it('allows read on locked document for any role', () => {
      const ctx = makeCtx({ user: { id: 'u3', role: 'CLINICAL_SPECIALIST' } });
      expect(() =>
        checkDocumentStatusAccess(ctx, 'sls', 'read', { status: 'LOCKED' }),
      ).not.toThrow();
    });

    it('denies write on locked document for non-Admin', () => {
      const ctx = makeCtx({ user: { id: 'u2', role: 'RA_MANAGER' } });
      expect(() => checkDocumentStatusAccess(ctx, 'sls', 'write', { status: 'LOCKED' })).toThrow(
        'Document is locked',
      );
    });

    it('allows Admin to write on locked document', () => {
      const ctx = makeCtx({ user: { id: 'u1', role: 'ADMIN' } });
      expect(() =>
        checkDocumentStatusAccess(ctx, 'sls', 'write', { status: 'LOCKED' }),
      ).not.toThrow();
    });

    it('allows write on draft document per role matrix', () => {
      const ctx = makeCtx({ user: { id: 'u2', role: 'RA_MANAGER' } });
      expect(() =>
        checkDocumentStatusAccess(ctx, 'sls', 'write', { status: 'DRAFT' }),
      ).not.toThrow();
    });
  });

  describe('withPermission', () => {
    it('wraps resolver with permission check', () => {
      const resolver = vi.fn().mockReturnValue('result');
      const wrapped = withPermission('sls', 'write', resolver);
      const ctx = makeCtx({ user: { id: 'u1', role: 'ADMIN' } });

      const result = wrapped({}, {}, ctx);
      expect(result).toBe('result');
      expect(resolver).toHaveBeenCalled();
    });

    it('throws before calling resolver when permission denied', () => {
      const resolver = vi.fn();
      const wrapped = withPermission('users', 'admin', resolver);
      const ctx = makeCtx({ user: { id: 'u5', role: 'EXECUTIVE' } });

      expect(() => wrapped({}, {}, ctx)).toThrow(PermissionDeniedError);
      expect(resolver).not.toHaveBeenCalled();
    });
  });
});
