import { describe, it, expect } from 'vitest';
import {
  VERSION_TYPES,
  isValidVersionType,
  getVersionTypeLabel,
  getNextVersionNumber,
} from './version-type.js';

describe('VersionType value object', () => {
  it('exports VERSION_TYPES with 3 values', () => {
    expect(VERSION_TYPES).toHaveLength(3);
    expect(VERSION_TYPES).toContain('INITIAL');
    expect(VERSION_TYPES).toContain('ANNUAL_UPDATE');
    expect(VERSION_TYPES).toContain('PATCH_UPDATE');
  });

  describe('isValidVersionType', () => {
    it('returns true for INITIAL', () => {
      expect(isValidVersionType('INITIAL')).toBe(true);
    });

    it('returns true for ANNUAL_UPDATE', () => {
      expect(isValidVersionType('ANNUAL_UPDATE')).toBe(true);
    });

    it('returns true for PATCH_UPDATE', () => {
      expect(isValidVersionType('PATCH_UPDATE')).toBe(true);
    });

    it('returns false for invalid type', () => {
      expect(isValidVersionType('INVALID')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidVersionType('')).toBe(false);
    });
  });

  describe('getVersionTypeLabel', () => {
    it('returns "Initial Release" for INITIAL', () => {
      expect(getVersionTypeLabel('INITIAL')).toBe('Initial Release');
    });

    it('returns "Annual Update" for ANNUAL_UPDATE', () => {
      expect(getVersionTypeLabel('ANNUAL_UPDATE')).toBe('Annual Update');
    });

    it('returns "Patch Update" for PATCH_UPDATE', () => {
      expect(getVersionTypeLabel('PATCH_UPDATE')).toBe('Patch Update');
    });
  });

  describe('getNextVersionNumber', () => {
    it('returns "1.0.0" for INITIAL regardless of current version', () => {
      expect(getNextVersionNumber('0.0.0', 'INITIAL')).toBe('1.0.0');
      expect(getNextVersionNumber('3.5.2', 'INITIAL')).toBe('1.0.0');
    });

    it('increments major version for ANNUAL_UPDATE', () => {
      expect(getNextVersionNumber('1.0.0', 'ANNUAL_UPDATE')).toBe('2.0.0');
    });

    it('resets minor and patch on ANNUAL_UPDATE', () => {
      expect(getNextVersionNumber('1.2.3', 'ANNUAL_UPDATE')).toBe('2.0.0');
    });

    it('increments patch for PATCH_UPDATE', () => {
      expect(getNextVersionNumber('1.0.0', 'PATCH_UPDATE')).toBe('1.0.1');
    });

    it('handles higher patch versions', () => {
      expect(getNextVersionNumber('1.2.9', 'PATCH_UPDATE')).toBe('1.2.10');
    });

    it('throws for invalid version format', () => {
      expect(() => getNextVersionNumber('invalid', 'ANNUAL_UPDATE')).toThrow(
        'Invalid version format',
      );
    });
  });
});
