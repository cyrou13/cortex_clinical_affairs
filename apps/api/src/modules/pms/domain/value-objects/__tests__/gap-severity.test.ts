import { describe, it, expect } from 'vitest';
import { GAP_SEVERITIES, isValidGapSeverity } from '../gap-severity.js';

describe('GapSeverity value object', () => {
  it('exports GAP_SEVERITIES with 4 values', () => {
    expect(GAP_SEVERITIES).toHaveLength(4);
    expect(GAP_SEVERITIES).toContain('LOW');
    expect(GAP_SEVERITIES).toContain('MEDIUM');
    expect(GAP_SEVERITIES).toContain('HIGH');
    expect(GAP_SEVERITIES).toContain('CRITICAL');
  });

  describe('isValidGapSeverity', () => {
    it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)(
      'returns true for %s',
      (severity) => {
        expect(isValidGapSeverity(severity)).toBe(true);
      },
    );

    it('returns false for invalid values', () => {
      expect(isValidGapSeverity('INVALID')).toBe(false);
      expect(isValidGapSeverity('')).toBe(false);
      expect(isValidGapSeverity('low')).toBe(false);
    });
  });
});
