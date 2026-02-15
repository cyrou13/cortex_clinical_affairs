import { describe, it, expect } from 'vitest';
import {
  PMS_PLAN_STATUSES,
  canTransitionPlan,
  isValidPlanStatus,
} from '../plan-status.js';

describe('PlanStatus value object', () => {
  it('exports PMS_PLAN_STATUSES with 3 values', () => {
    expect(PMS_PLAN_STATUSES).toHaveLength(3);
    expect(PMS_PLAN_STATUSES).toContain('DRAFT');
    expect(PMS_PLAN_STATUSES).toContain('APPROVED');
    expect(PMS_PLAN_STATUSES).toContain('ACTIVE');
  });

  describe('canTransitionPlan', () => {
    it('allows DRAFT -> APPROVED', () => {
      expect(canTransitionPlan('DRAFT', 'APPROVED')).toBe(true);
    });

    it('allows APPROVED -> ACTIVE', () => {
      expect(canTransitionPlan('APPROVED', 'ACTIVE')).toBe(true);
    });

    it('rejects ACTIVE -> DRAFT', () => {
      expect(canTransitionPlan('ACTIVE', 'DRAFT')).toBe(false);
    });

    it('rejects DRAFT -> ACTIVE', () => {
      expect(canTransitionPlan('DRAFT', 'ACTIVE')).toBe(false);
    });

    it('rejects ACTIVE -> APPROVED', () => {
      expect(canTransitionPlan('ACTIVE', 'APPROVED')).toBe(false);
    });

    it('rejects APPROVED -> DRAFT', () => {
      expect(canTransitionPlan('APPROVED', 'DRAFT')).toBe(false);
    });
  });

  describe('isValidPlanStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isValidPlanStatus('DRAFT')).toBe(true);
      expect(isValidPlanStatus('APPROVED')).toBe(true);
      expect(isValidPlanStatus('ACTIVE')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isValidPlanStatus('INVALID')).toBe(false);
      expect(isValidPlanStatus('')).toBe(false);
      expect(isValidPlanStatus('draft')).toBe(false);
    });
  });
});
