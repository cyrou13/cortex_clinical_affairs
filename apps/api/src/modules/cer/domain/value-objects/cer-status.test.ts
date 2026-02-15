import { describe, it, expect } from 'vitest';
import {
  CER_STATUSES,
  canTransition,
  isLocked,
  isEditable,
  getCerStatusLabel,
} from './cer-status.js';

describe('CerStatus value object', () => {
  it('exports CER_STATUSES with 5 values', () => {
    expect(CER_STATUSES).toHaveLength(5);
    expect(CER_STATUSES).toContain('DRAFT');
    expect(CER_STATUSES).toContain('IN_PROGRESS');
    expect(CER_STATUSES).toContain('REVIEW');
    expect(CER_STATUSES).toContain('FINALIZED');
    expect(CER_STATUSES).toContain('LOCKED');
  });

  describe('canTransition', () => {
    it('allows DRAFT -> IN_PROGRESS', () => {
      expect(canTransition('DRAFT', 'IN_PROGRESS')).toBe(true);
    });

    it('allows IN_PROGRESS -> REVIEW', () => {
      expect(canTransition('IN_PROGRESS', 'REVIEW')).toBe(true);
    });

    it('allows REVIEW -> IN_PROGRESS (send back)', () => {
      expect(canTransition('REVIEW', 'IN_PROGRESS')).toBe(true);
    });

    it('allows REVIEW -> FINALIZED', () => {
      expect(canTransition('REVIEW', 'FINALIZED')).toBe(true);
    });

    it('allows FINALIZED -> LOCKED', () => {
      expect(canTransition('FINALIZED', 'LOCKED')).toBe(true);
    });

    it('rejects DRAFT -> LOCKED', () => {
      expect(canTransition('DRAFT', 'LOCKED')).toBe(false);
    });

    it('rejects DRAFT -> REVIEW', () => {
      expect(canTransition('DRAFT', 'REVIEW')).toBe(false);
    });

    it('rejects LOCKED -> DRAFT', () => {
      expect(canTransition('LOCKED', 'DRAFT')).toBe(false);
    });

    it('rejects LOCKED -> IN_PROGRESS', () => {
      expect(canTransition('LOCKED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects IN_PROGRESS -> LOCKED', () => {
      expect(canTransition('IN_PROGRESS', 'LOCKED')).toBe(false);
    });

    it('rejects FINALIZED -> DRAFT', () => {
      expect(canTransition('FINALIZED', 'DRAFT')).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('returns true for LOCKED', () => {
      expect(isLocked('LOCKED')).toBe(true);
    });

    it('returns false for DRAFT', () => {
      expect(isLocked('DRAFT')).toBe(false);
    });

    it('returns false for IN_PROGRESS', () => {
      expect(isLocked('IN_PROGRESS')).toBe(false);
    });

    it('returns false for REVIEW', () => {
      expect(isLocked('REVIEW')).toBe(false);
    });

    it('returns false for FINALIZED', () => {
      expect(isLocked('FINALIZED')).toBe(false);
    });
  });

  describe('isEditable', () => {
    it('returns true for DRAFT', () => {
      expect(isEditable('DRAFT')).toBe(true);
    });

    it('returns true for IN_PROGRESS', () => {
      expect(isEditable('IN_PROGRESS')).toBe(true);
    });

    it('returns true for REVIEW', () => {
      expect(isEditable('REVIEW')).toBe(true);
    });

    it('returns false for FINALIZED', () => {
      expect(isEditable('FINALIZED')).toBe(false);
    });

    it('returns false for LOCKED', () => {
      expect(isEditable('LOCKED')).toBe(false);
    });
  });

  describe('getCerStatusLabel', () => {
    it('returns "Draft" for DRAFT', () => {
      expect(getCerStatusLabel('DRAFT')).toBe('Draft');
    });

    it('returns "In Progress" for IN_PROGRESS', () => {
      expect(getCerStatusLabel('IN_PROGRESS')).toBe('In Progress');
    });

    it('returns "Under Review" for REVIEW', () => {
      expect(getCerStatusLabel('REVIEW')).toBe('Under Review');
    });

    it('returns "Finalized" for FINALIZED', () => {
      expect(getCerStatusLabel('FINALIZED')).toBe('Finalized');
    });

    it('returns "Locked" for LOCKED', () => {
      expect(getCerStatusLabel('LOCKED')).toBe('Locked');
    });
  });
});
