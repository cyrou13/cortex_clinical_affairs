import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  transitionStatus,
  ensureSoaNotLocked,
} from './soa-analysis.js';
import type { SoaAnalysisData } from './soa-analysis.js';

function makeAnalysis(overrides?: Partial<SoaAnalysisData>): SoaAnalysisData {
  return {
    id: 'soa-1',
    projectId: 'proj-1',
    type: 'CLINICAL',
    status: 'DRAFT',
    name: 'Test SOA',
    description: null,
    createdById: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lockedAt: null,
    lockedById: null,
    ...overrides,
  };
}

describe('SoaAnalysis entity', () => {
  describe('validateTransition', () => {
    it('allows DRAFT -> IN_PROGRESS', () => {
      expect(validateTransition('DRAFT', 'IN_PROGRESS')).toBe(true);
    });

    it('allows IN_PROGRESS -> LOCKED', () => {
      expect(validateTransition('IN_PROGRESS', 'LOCKED')).toBe(true);
    });

    it('rejects DRAFT -> LOCKED', () => {
      expect(validateTransition('DRAFT', 'LOCKED')).toBe(false);
    });

    it('rejects LOCKED -> anything', () => {
      expect(validateTransition('LOCKED', 'DRAFT')).toBe(false);
      expect(validateTransition('LOCKED', 'IN_PROGRESS')).toBe(false);
    });
  });

  describe('transitionStatus', () => {
    it('transitions DRAFT to IN_PROGRESS', () => {
      const analysis = makeAnalysis({ status: 'DRAFT' });
      const result = transitionStatus(analysis, 'IN_PROGRESS');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('sets lockedAt when transitioning to LOCKED', () => {
      const analysis = makeAnalysis({ status: 'IN_PROGRESS' });
      const result = transitionStatus(analysis, 'LOCKED');
      expect(result.status).toBe('LOCKED');
      expect(result.lockedAt).toBeTruthy();
    });

    it('throws on invalid transition', () => {
      const analysis = makeAnalysis({ status: 'DRAFT' });
      expect(() => transitionStatus(analysis, 'LOCKED')).toThrow('Cannot transition');
    });
  });

  describe('ensureSoaNotLocked', () => {
    it('does not throw for DRAFT', () => {
      expect(() => ensureSoaNotLocked(makeAnalysis({ status: 'DRAFT' }))).not.toThrow();
    });

    it('does not throw for IN_PROGRESS', () => {
      expect(() => ensureSoaNotLocked(makeAnalysis({ status: 'IN_PROGRESS' }))).not.toThrow();
    });

    it('throws for LOCKED', () => {
      expect(() => ensureSoaNotLocked(makeAnalysis({ status: 'LOCKED' }))).toThrow('locked');
    });
  });
});
