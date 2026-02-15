import { describe, it, expect } from 'vitest';
import {
  canTransition,
  isLocked,
  VALIDATION_STATUSES,
} from './validation-status.js';

describe('ValidationStatus value object', () => {
  describe('canTransition', () => {
    it('allows DRAFT -> IN_PROGRESS', () => {
      expect(canTransition('DRAFT', 'IN_PROGRESS')).toBe(true);
    });

    it('allows IN_PROGRESS -> LOCKED', () => {
      expect(canTransition('IN_PROGRESS', 'LOCKED')).toBe(true);
    });

    it('rejects DRAFT -> LOCKED', () => {
      expect(canTransition('DRAFT', 'LOCKED')).toBe(false);
    });

    it('rejects LOCKED -> DRAFT', () => {
      expect(canTransition('LOCKED', 'DRAFT')).toBe(false);
    });

    it('rejects LOCKED -> IN_PROGRESS', () => {
      expect(canTransition('LOCKED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects IN_PROGRESS -> DRAFT', () => {
      expect(canTransition('IN_PROGRESS', 'DRAFT')).toBe(false);
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
  });

  it('exports VALIDATION_STATUSES with 3 values', () => {
    expect(VALIDATION_STATUSES).toHaveLength(3);
    expect(VALIDATION_STATUSES).toContain('DRAFT');
    expect(VALIDATION_STATUSES).toContain('IN_PROGRESS');
    expect(VALIDATION_STATUSES).toContain('LOCKED');
  });
});
