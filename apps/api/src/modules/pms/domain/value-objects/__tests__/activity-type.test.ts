import { describe, it, expect } from 'vitest';
import { ACTIVITY_TYPES, isValidActivityType } from '../activity-type.js';

describe('ActivityType value object', () => {
  it('exports ACTIVITY_TYPES with 7 values', () => {
    expect(ACTIVITY_TYPES).toHaveLength(7);
    expect(ACTIVITY_TYPES).toContain('LITERATURE_UPDATE');
    expect(ACTIVITY_TYPES).toContain('NAMED_DEVICE_SEARCH');
    expect(ACTIVITY_TYPES).toContain('USER_SURVEYS');
    expect(ACTIVITY_TYPES).toContain('VIGILANCE_MONITORING');
    expect(ACTIVITY_TYPES).toContain('COMPLAINTS');
    expect(ACTIVITY_TYPES).toContain('INSTALLED_BASE');
    expect(ACTIVITY_TYPES).toContain('TREND_ANALYSIS');
  });

  describe('isValidActivityType', () => {
    it.each([
      'LITERATURE_UPDATE',
      'NAMED_DEVICE_SEARCH',
      'USER_SURVEYS',
      'VIGILANCE_MONITORING',
      'COMPLAINTS',
      'INSTALLED_BASE',
      'TREND_ANALYSIS',
    ] as const)('returns true for %s', (type) => {
      expect(isValidActivityType(type)).toBe(true);
    });

    it('returns false for invalid types', () => {
      expect(isValidActivityType('INVALID')).toBe(false);
      expect(isValidActivityType('')).toBe(false);
      expect(isValidActivityType('complaints')).toBe(false);
    });
  });
});
