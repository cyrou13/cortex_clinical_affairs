import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  formatVersion,
  incrementMinor,
  createInitialVersion,
  compareVersions,
} from './protocol-version.js';

describe('ProtocolVersion value object', () => {
  describe('parseVersion', () => {
    it('parses "1.0" correctly', () => {
      const v = parseVersion('1.0');
      expect(v.major).toBe(1);
      expect(v.minor).toBe(0);
    });

    it('parses "2.5" correctly', () => {
      const v = parseVersion('2.5');
      expect(v.major).toBe(2);
      expect(v.minor).toBe(5);
    });

    it('throws for invalid format "1"', () => {
      expect(() => parseVersion('1')).toThrow('Invalid version format');
    });

    it('throws for invalid format "1.2.3"', () => {
      expect(() => parseVersion('1.2.3')).toThrow('Invalid version format');
    });

    it('throws for non-numeric values', () => {
      expect(() => parseVersion('a.b')).toThrow('Invalid version numbers');
    });

    it('throws for negative major version', () => {
      expect(() => parseVersion('-1.0')).toThrow('Invalid version numbers');
    });

    it('throws for zero major version', () => {
      expect(() => parseVersion('0.1')).toThrow('Invalid version numbers');
    });

    it('throws for negative minor version', () => {
      expect(() => parseVersion('1.-1')).toThrow('Invalid version numbers');
    });
  });

  describe('formatVersion', () => {
    it('formats {1, 0} as "1.0"', () => {
      expect(formatVersion({ major: 1, minor: 0 })).toBe('1.0');
    });

    it('formats {2, 3} as "2.3"', () => {
      expect(formatVersion({ major: 2, minor: 3 })).toBe('2.3');
    });
  });

  describe('incrementMinor', () => {
    it('increments 1.0 to 1.1', () => {
      const v = incrementMinor({ major: 1, minor: 0 });
      expect(v.major).toBe(1);
      expect(v.minor).toBe(1);
    });

    it('increments 1.5 to 1.6', () => {
      const v = incrementMinor({ major: 1, minor: 5 });
      expect(v.major).toBe(1);
      expect(v.minor).toBe(6);
    });

    it('does not modify major version', () => {
      const v = incrementMinor({ major: 3, minor: 9 });
      expect(v.major).toBe(3);
      expect(v.minor).toBe(10);
    });
  });

  describe('createInitialVersion', () => {
    it('returns version 1.0', () => {
      const v = createInitialVersion();
      expect(v.major).toBe(1);
      expect(v.minor).toBe(0);
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions({ major: 1, minor: 0 }, { major: 1, minor: 0 })).toBe(0);
    });

    it('returns negative when a < b (major)', () => {
      expect(compareVersions({ major: 1, minor: 0 }, { major: 2, minor: 0 })).toBeLessThan(0);
    });

    it('returns positive when a > b (major)', () => {
      expect(compareVersions({ major: 2, minor: 0 }, { major: 1, minor: 0 })).toBeGreaterThan(0);
    });

    it('returns negative when a < b (minor)', () => {
      expect(compareVersions({ major: 1, minor: 1 }, { major: 1, minor: 2 })).toBeLessThan(0);
    });

    it('returns positive when a > b (minor)', () => {
      expect(compareVersions({ major: 1, minor: 3 }, { major: 1, minor: 2 })).toBeGreaterThan(0);
    });
  });
});
