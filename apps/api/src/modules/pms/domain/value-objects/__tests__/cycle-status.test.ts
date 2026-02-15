import { describe, it, expect } from 'vitest';
import {
  CYCLE_STATUSES,
  canTransitionCycle,
  isValidCycleStatus,
} from '../cycle-status.js';

describe('CycleStatus value object', () => {
  it('exports CYCLE_STATUSES with 3 values', () => {
    expect(CYCLE_STATUSES).toHaveLength(3);
    expect(CYCLE_STATUSES).toContain('PLANNED');
    expect(CYCLE_STATUSES).toContain('ACTIVE');
    expect(CYCLE_STATUSES).toContain('COMPLETED');
  });

  describe('canTransitionCycle', () => {
    it('allows PLANNED -> ACTIVE', () => {
      expect(canTransitionCycle('PLANNED', 'ACTIVE')).toBe(true);
    });

    it('allows ACTIVE -> COMPLETED', () => {
      expect(canTransitionCycle('ACTIVE', 'COMPLETED')).toBe(true);
    });

    it('rejects COMPLETED -> PLANNED', () => {
      expect(canTransitionCycle('COMPLETED', 'PLANNED')).toBe(false);
    });

    it('rejects PLANNED -> COMPLETED', () => {
      expect(canTransitionCycle('PLANNED', 'COMPLETED')).toBe(false);
    });

    it('rejects COMPLETED -> ACTIVE', () => {
      expect(canTransitionCycle('COMPLETED', 'ACTIVE')).toBe(false);
    });

    it('rejects ACTIVE -> PLANNED', () => {
      expect(canTransitionCycle('ACTIVE', 'PLANNED')).toBe(false);
    });
  });

  describe('isValidCycleStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isValidCycleStatus('PLANNED')).toBe(true);
      expect(isValidCycleStatus('ACTIVE')).toBe(true);
      expect(isValidCycleStatus('COMPLETED')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isValidCycleStatus('INVALID')).toBe(false);
      expect(isValidCycleStatus('')).toBe(false);
      expect(isValidCycleStatus('planned')).toBe(false);
    });
  });
});
