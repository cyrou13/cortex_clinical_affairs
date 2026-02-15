import { describe, it, expect } from 'vitest';
import {
  REGULATORY_CONTEXTS,
  isValidContext,
  getContextLabel,
  requiresFda,
} from './regulatory-context.js';

describe('RegulatoryContext value object', () => {
  it('exports REGULATORY_CONTEXTS with 3 values', () => {
    expect(REGULATORY_CONTEXTS).toHaveLength(3);
    expect(REGULATORY_CONTEXTS).toContain('CE_MDR');
    expect(REGULATORY_CONTEXTS).toContain('FDA_510K');
    expect(REGULATORY_CONTEXTS).toContain('DUAL');
  });

  describe('isValidContext', () => {
    it('returns true for CE_MDR', () => {
      expect(isValidContext('CE_MDR')).toBe(true);
    });

    it('returns true for FDA_510K', () => {
      expect(isValidContext('FDA_510K')).toBe(true);
    });

    it('returns true for DUAL', () => {
      expect(isValidContext('DUAL')).toBe(true);
    });

    it('returns false for invalid context', () => {
      expect(isValidContext('INVALID')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidContext('')).toBe(false);
    });

    it('returns false for lowercase variant', () => {
      expect(isValidContext('ce_mdr')).toBe(false);
    });
  });

  describe('getContextLabel', () => {
    it('returns correct label for CE_MDR', () => {
      expect(getContextLabel('CE_MDR')).toBe('CE Marking (MDR 2017/745)');
    });

    it('returns correct label for FDA_510K', () => {
      expect(getContextLabel('FDA_510K')).toBe('FDA 510(k)');
    });

    it('returns correct label for DUAL', () => {
      expect(getContextLabel('DUAL')).toBe('Dual Submission (CE MDR + FDA 510(k))');
    });
  });

  describe('requiresFda', () => {
    it('returns false for CE_MDR', () => {
      expect(requiresFda('CE_MDR')).toBe(false);
    });

    it('returns true for FDA_510K', () => {
      expect(requiresFda('FDA_510K')).toBe(true);
    });

    it('returns true for DUAL', () => {
      expect(requiresFda('DUAL')).toBe(true);
    });
  });
});
