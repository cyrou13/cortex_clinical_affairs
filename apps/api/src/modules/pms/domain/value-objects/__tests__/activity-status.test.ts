import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_STATUSES,
  canTransitionActivity,
  isValidActivityStatus,
} from '../activity-status.js';

describe('ActivityStatus value object', () => {
  it('exports ACTIVITY_STATUSES with 3 values', () => {
    expect(ACTIVITY_STATUSES).toHaveLength(3);
    expect(ACTIVITY_STATUSES).toContain('PLANNED');
    expect(ACTIVITY_STATUSES).toContain('IN_PROGRESS');
    expect(ACTIVITY_STATUSES).toContain('COMPLETED');
  });

  describe('canTransitionActivity', () => {
    it('allows PLANNED -> IN_PROGRESS', () => {
      expect(canTransitionActivity('PLANNED', 'IN_PROGRESS')).toBe(true);
    });

    it('allows IN_PROGRESS -> COMPLETED', () => {
      expect(canTransitionActivity('IN_PROGRESS', 'COMPLETED')).toBe(true);
    });

    it('rejects PLANNED -> COMPLETED', () => {
      expect(canTransitionActivity('PLANNED', 'COMPLETED')).toBe(false);
    });

    it('rejects COMPLETED -> PLANNED', () => {
      expect(canTransitionActivity('COMPLETED', 'PLANNED')).toBe(false);
    });

    it('rejects COMPLETED -> IN_PROGRESS', () => {
      expect(canTransitionActivity('COMPLETED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects IN_PROGRESS -> PLANNED', () => {
      expect(canTransitionActivity('IN_PROGRESS', 'PLANNED')).toBe(false);
    });
  });

  describe('isValidActivityStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isValidActivityStatus('PLANNED')).toBe(true);
      expect(isValidActivityStatus('IN_PROGRESS')).toBe(true);
      expect(isValidActivityStatus('COMPLETED')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isValidActivityStatus('INVALID')).toBe(false);
      expect(isValidActivityStatus('')).toBe(false);
      expect(isValidActivityStatus('planned')).toBe(false);
    });
  });
});
