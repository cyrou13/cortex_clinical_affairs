import { describe, it, expect } from 'vitest';
import {
  createCerVersion,
  validateCerTransition,
  transitionCerStatus,
  ensureCerNotLocked,
  linkUpstreamModule,
} from './cer-version.js';
import type { CerVersionData } from './cer-version.js';

function makeCerVersion(overrides?: Partial<CerVersionData>): CerVersionData {
  return {
    id: 'cer-1',
    projectId: 'proj-1',
    regulatoryContext: 'CE_MDR',
    versionType: 'INITIAL',
    versionNumber: '1.0.0',
    status: 'DRAFT',
    createdById: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lockedAt: null,
    lockedById: null,
    ...overrides,
  };
}

describe('CerVersion entity', () => {
  describe('createCerVersion', () => {
    it('creates a CER version with DRAFT status', () => {
      const result = createCerVersion('proj-1', 'CE_MDR', 'INITIAL', 'user-1');
      expect(result.status).toBe('DRAFT');
      expect(result.projectId).toBe('proj-1');
      expect(result.regulatoryContext).toBe('CE_MDR');
      expect(result.versionType).toBe('INITIAL');
      expect(result.versionNumber).toBe('1.0.0');
      expect(result.id).toBeTruthy();
    });

    it('generates version 2.0.0 for ANNUAL_UPDATE from 1.0.0', () => {
      const result = createCerVersion('proj-1', 'CE_MDR', 'ANNUAL_UPDATE', 'user-1', '1.0.0');
      expect(result.versionNumber).toBe('2.0.0');
    });

    it('generates version 1.0.1 for PATCH_UPDATE from 1.0.0', () => {
      const result = createCerVersion('proj-1', 'CE_MDR', 'PATCH_UPDATE', 'user-1', '1.0.0');
      expect(result.versionNumber).toBe('1.0.1');
    });

    it('throws for invalid regulatory context', () => {
      expect(() => createCerVersion('proj-1', 'INVALID', 'INITIAL', 'user-1')).toThrow(
        'Invalid regulatory context',
      );
    });

    it('throws for invalid version type', () => {
      expect(() => createCerVersion('proj-1', 'CE_MDR', 'INVALID', 'user-1')).toThrow(
        'Invalid version type',
      );
    });

    it('sets lockedAt and lockedById to null', () => {
      const result = createCerVersion('proj-1', 'FDA_510K', 'INITIAL', 'user-1');
      expect(result.lockedAt).toBeNull();
      expect(result.lockedById).toBeNull();
    });

    it('sets createdById', () => {
      const result = createCerVersion('proj-1', 'DUAL', 'INITIAL', 'user-42');
      expect(result.createdById).toBe('user-42');
    });
  });

  describe('validateCerTransition', () => {
    it('allows DRAFT -> IN_PROGRESS', () => {
      expect(validateCerTransition('DRAFT', 'IN_PROGRESS')).toBe(true);
    });

    it('allows REVIEW -> FINALIZED', () => {
      expect(validateCerTransition('REVIEW', 'FINALIZED')).toBe(true);
    });

    it('rejects DRAFT -> LOCKED', () => {
      expect(validateCerTransition('DRAFT', 'LOCKED')).toBe(false);
    });

    it('rejects LOCKED -> DRAFT', () => {
      expect(validateCerTransition('LOCKED', 'DRAFT')).toBe(false);
    });
  });

  describe('transitionCerStatus', () => {
    it('transitions DRAFT to IN_PROGRESS', () => {
      const entity = makeCerVersion({ status: 'DRAFT' });
      const result = transitionCerStatus(entity, 'IN_PROGRESS');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('sets lockedAt when transitioning to LOCKED', () => {
      const entity = makeCerVersion({ status: 'FINALIZED' });
      const result = transitionCerStatus(entity, 'LOCKED');
      expect(result.status).toBe('LOCKED');
      expect(result.lockedAt).toBeTruthy();
    });

    it('throws on invalid transition', () => {
      const entity = makeCerVersion({ status: 'DRAFT' });
      expect(() => transitionCerStatus(entity, 'LOCKED')).toThrow('Cannot transition');
    });
  });

  describe('ensureCerNotLocked', () => {
    it('does not throw for DRAFT', () => {
      expect(() => ensureCerNotLocked(makeCerVersion({ status: 'DRAFT' }))).not.toThrow();
    });

    it('does not throw for IN_PROGRESS', () => {
      expect(() => ensureCerNotLocked(makeCerVersion({ status: 'IN_PROGRESS' }))).not.toThrow();
    });

    it('throws for LOCKED', () => {
      expect(() => ensureCerNotLocked(makeCerVersion({ status: 'LOCKED' }))).toThrow('locked');
    });
  });

  describe('linkUpstreamModule', () => {
    it('creates a link for SLS module', () => {
      const link = linkUpstreamModule('cer-1', 'SLS', 'sls-1', '2024-01-01T00:00:00Z');
      expect(link.cerVersionId).toBe('cer-1');
      expect(link.moduleType).toBe('SLS');
      expect(link.moduleId).toBe('sls-1');
      expect(link.lockedAt).toBe('2024-01-01T00:00:00Z');
      expect(link.id).toBeTruthy();
    });

    it('creates a link for SOA module', () => {
      const link = linkUpstreamModule('cer-1', 'SOA', 'soa-1', '2024-01-01T00:00:00Z');
      expect(link.moduleType).toBe('SOA');
    });

    it('creates a link for VALIDATION module', () => {
      const link = linkUpstreamModule('cer-1', 'VALIDATION', 'val-1', '2024-01-01T00:00:00Z');
      expect(link.moduleType).toBe('VALIDATION');
    });

    it('throws for invalid module type', () => {
      expect(() =>
        linkUpstreamModule('cer-1', 'INVALID', 'mod-1', '2024-01-01T00:00:00Z'),
      ).toThrow('Invalid upstream module type');
    });
  });
});
