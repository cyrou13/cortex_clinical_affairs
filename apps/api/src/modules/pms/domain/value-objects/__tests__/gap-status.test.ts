import { describe, it, expect } from 'vitest';
import {
  GAP_STATUSES,
  canTransitionGap,
  isValidGapStatus,
} from '../gap-status.js';

describe('GapStatus value object', () => {
  it('exports GAP_STATUSES with 3 values', () => {
    expect(GAP_STATUSES).toHaveLength(3);
    expect(GAP_STATUSES).toContain('OPEN');
    expect(GAP_STATUSES).toContain('IN_PROGRESS');
    expect(GAP_STATUSES).toContain('RESOLVED');
  });

  describe('canTransitionGap', () => {
    it('allows OPEN -> IN_PROGRESS', () => {
      expect(canTransitionGap('OPEN', 'IN_PROGRESS')).toBe(true);
    });

    it('allows IN_PROGRESS -> RESOLVED', () => {
      expect(canTransitionGap('IN_PROGRESS', 'RESOLVED')).toBe(true);
    });

    it('allows RESOLVED -> OPEN (re-open)', () => {
      expect(canTransitionGap('RESOLVED', 'OPEN')).toBe(true);
    });

    it('rejects OPEN -> RESOLVED', () => {
      expect(canTransitionGap('OPEN', 'RESOLVED')).toBe(false);
    });

    it('rejects IN_PROGRESS -> OPEN', () => {
      expect(canTransitionGap('IN_PROGRESS', 'OPEN')).toBe(false);
    });

    it('rejects RESOLVED -> IN_PROGRESS', () => {
      expect(canTransitionGap('RESOLVED', 'IN_PROGRESS')).toBe(false);
    });
  });

  describe('isValidGapStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isValidGapStatus('OPEN')).toBe(true);
      expect(isValidGapStatus('IN_PROGRESS')).toBe(true);
      expect(isValidGapStatus('RESOLVED')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isValidGapStatus('INVALID')).toBe(false);
      expect(isValidGapStatus('')).toBe(false);
      expect(isValidGapStatus('open')).toBe(false);
    });
  });
});
