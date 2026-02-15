import { describe, it, expect } from 'vitest';
import {
  createValidationStudy,
  validateStudyTransition,
  transitionStudyStatus,
  ensureStudyNotLocked,
  linkSoa,
} from './validation-study.js';
import type { ValidationStudyData } from './validation-study.js';

function makeStudy(overrides?: Partial<ValidationStudyData>): ValidationStudyData {
  return {
    id: 'study-1',
    projectId: 'proj-1',
    name: 'Test Study',
    type: 'STANDALONE',
    status: 'DRAFT',
    description: null,
    soaAnalysisId: 'soa-1',
    createdById: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lockedAt: null,
    lockedById: null,
    ...overrides,
  };
}

describe('ValidationStudy entity', () => {
  describe('createValidationStudy', () => {
    it('creates a study with DRAFT status', () => {
      const study = createValidationStudy({
        id: 'study-1',
        projectId: 'proj-1',
        name: 'My Study',
        type: 'STANDALONE',
        soaAnalysisId: 'soa-1',
        createdById: 'user-1',
      });
      expect(study.status).toBe('DRAFT');
      expect(study.name).toBe('My Study');
      expect(study.type).toBe('STANDALONE');
      expect(study.lockedAt).toBeNull();
      expect(study.lockedById).toBeNull();
    });

    it('sets description to null when not provided', () => {
      const study = createValidationStudy({
        id: 'study-1',
        projectId: 'proj-1',
        name: 'Study',
        type: 'MRMC',
        soaAnalysisId: 'soa-1',
        createdById: 'user-1',
      });
      expect(study.description).toBeNull();
    });

    it('accepts description when provided', () => {
      const study = createValidationStudy({
        id: 'study-1',
        projectId: 'proj-1',
        name: 'Study',
        type: 'MRMC',
        soaAnalysisId: 'soa-1',
        description: 'A description',
        createdById: 'user-1',
      });
      expect(study.description).toBe('A description');
    });

    it('sets createdAt and updatedAt timestamps', () => {
      const study = createValidationStudy({
        id: 'study-1',
        projectId: 'proj-1',
        name: 'Study',
        type: 'STANDALONE',
        soaAnalysisId: 'soa-1',
        createdById: 'user-1',
      });
      expect(study.createdAt).toBeTruthy();
      expect(study.updatedAt).toBeTruthy();
    });
  });

  describe('validateStudyTransition', () => {
    it('allows DRAFT -> IN_PROGRESS', () => {
      expect(validateStudyTransition('DRAFT', 'IN_PROGRESS')).toBe(true);
    });

    it('allows IN_PROGRESS -> LOCKED', () => {
      expect(validateStudyTransition('IN_PROGRESS', 'LOCKED')).toBe(true);
    });

    it('rejects DRAFT -> LOCKED', () => {
      expect(validateStudyTransition('DRAFT', 'LOCKED')).toBe(false);
    });

    it('rejects LOCKED -> any', () => {
      expect(validateStudyTransition('LOCKED', 'DRAFT')).toBe(false);
      expect(validateStudyTransition('LOCKED', 'IN_PROGRESS')).toBe(false);
    });
  });

  describe('transitionStudyStatus', () => {
    it('transitions DRAFT to IN_PROGRESS', () => {
      const study = makeStudy({ status: 'DRAFT' });
      const result = transitionStudyStatus(study, 'IN_PROGRESS');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('sets lockedAt when transitioning to LOCKED', () => {
      const study = makeStudy({ status: 'IN_PROGRESS' });
      const result = transitionStudyStatus(study, 'LOCKED');
      expect(result.status).toBe('LOCKED');
      expect(result.lockedAt).toBeTruthy();
    });

    it('throws on invalid transition DRAFT -> LOCKED', () => {
      const study = makeStudy({ status: 'DRAFT' });
      expect(() => transitionStudyStatus(study, 'LOCKED')).toThrow('Cannot transition');
    });

    it('throws on invalid transition LOCKED -> DRAFT', () => {
      const study = makeStudy({ status: 'LOCKED' });
      expect(() => transitionStudyStatus(study, 'DRAFT')).toThrow('Cannot transition');
    });

    it('updates the updatedAt timestamp', () => {
      const study = makeStudy({ status: 'DRAFT', updatedAt: '2024-01-01T00:00:00Z' });
      const result = transitionStudyStatus(study, 'IN_PROGRESS');
      expect(result.updatedAt).not.toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('ensureStudyNotLocked', () => {
    it('does not throw for DRAFT', () => {
      expect(() => ensureStudyNotLocked(makeStudy({ status: 'DRAFT' }))).not.toThrow();
    });

    it('does not throw for IN_PROGRESS', () => {
      expect(() => ensureStudyNotLocked(makeStudy({ status: 'IN_PROGRESS' }))).not.toThrow();
    });

    it('throws for LOCKED', () => {
      expect(() => ensureStudyNotLocked(makeStudy({ status: 'LOCKED' }))).toThrow('locked');
    });
  });

  describe('linkSoa', () => {
    it('updates soaAnalysisId on non-locked study', () => {
      const study = makeStudy({ soaAnalysisId: 'soa-1' });
      const result = linkSoa(study, 'soa-2');
      expect(result.soaAnalysisId).toBe('soa-2');
    });

    it('throws when study is locked', () => {
      const study = makeStudy({ status: 'LOCKED' });
      expect(() => linkSoa(study, 'soa-2')).toThrow('locked');
    });

    it('updates the updatedAt timestamp', () => {
      const study = makeStudy({ updatedAt: '2024-01-01T00:00:00Z' });
      const result = linkSoa(study, 'soa-2');
      expect(result.updatedAt).not.toBe('2024-01-01T00:00:00Z');
    });
  });
});
