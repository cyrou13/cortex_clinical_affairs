import { describe, it, expect } from 'vitest';
import {
  CER_UPDATE_CONCLUSIONS,
  isValidCerUpdateConclusion,
} from '../cer-update-conclusion.js';

describe('CerUpdateConclusion value object', () => {
  it('exports CER_UPDATE_CONCLUSIONS with 3 values', () => {
    expect(CER_UPDATE_CONCLUSIONS).toHaveLength(3);
    expect(CER_UPDATE_CONCLUSIONS).toContain('CER_UPDATE_REQUIRED');
    expect(CER_UPDATE_CONCLUSIONS).toContain('CER_UPDATE_NOT_REQUIRED');
    expect(CER_UPDATE_CONCLUSIONS).toContain('CER_PATCH_REQUIRED');
  });

  describe('isValidCerUpdateConclusion', () => {
    it.each([
      'CER_UPDATE_REQUIRED',
      'CER_UPDATE_NOT_REQUIRED',
      'CER_PATCH_REQUIRED',
    ] as const)('returns true for %s', (conclusion) => {
      expect(isValidCerUpdateConclusion(conclusion)).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidCerUpdateConclusion('INVALID')).toBe(false);
      expect(isValidCerUpdateConclusion('')).toBe(false);
      expect(isValidCerUpdateConclusion('cer_update_required')).toBe(false);
    });
  });
});
