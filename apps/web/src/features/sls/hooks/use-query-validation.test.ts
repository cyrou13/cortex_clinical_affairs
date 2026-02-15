import { describe, it, expect } from 'vitest';
import { validateQueryString } from './use-query-validation';

describe('useQueryValidation / validateQueryString', () => {
  describe('valid queries', () => {
    it('returns valid for empty string', () => {
      const result = validateQueryString('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for simple term', () => {
      const result = validateQueryString('cancer');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for simple AND query', () => {
      const result = validateQueryString('cancer AND treatment');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for simple OR query', () => {
      const result = validateQueryString('cancer OR tumor');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for NOT query', () => {
      const result = validateQueryString('NOT excluded');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for nested parentheses', () => {
      const result = validateQueryString('(cancer OR tumor) AND (treatment OR therapy)');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for quoted phrases', () => {
      const result = validateQueryString('"cervical spine" AND "neck pain"');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for field qualifiers', () => {
      const result = validateQueryString('cancer[ti] AND treatment[mh]');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for tiab field qualifier', () => {
      const result = validateQueryString('pain[tiab] OR discomfort[tiab]');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for tw field qualifier', () => {
      const result = validateQueryString('surgery[tw]');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for truncation wildcard', () => {
      const result = validateQueryString('surg* AND treat*');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for complex query with all features', () => {
      const result = validateQueryString(
        '("cervical spine"[ti] OR neck*[tiab]) AND (treatment[mh] OR therapy) NOT "case report"',
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('unbalanced parentheses', () => {
    it('detects unclosed opening parenthesis', () => {
      const result = validateQueryString('(cancer AND treatment');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched opening parenthesis');
    });

    it('detects unmatched closing parenthesis', () => {
      const result = validateQueryString('cancer AND treatment)');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched closing parenthesis');
    });

    it('detects multiple unclosed parentheses', () => {
      const result = validateQueryString('((cancer AND treatment)');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched opening parenthesis');
    });
  });

  describe('empty groups', () => {
    it('detects empty parentheses', () => {
      const result = validateQueryString('cancer AND ()');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty group "()" is not allowed');
    });

    it('detects empty parentheses with whitespace', () => {
      const result = validateQueryString('cancer AND (  )');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty group "()" is not allowed');
    });
  });

  describe('consecutive operators', () => {
    it('detects AND OR consecutive', () => {
      const result = validateQueryString('cancer AND OR treatment');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Consecutive operators'))).toBe(true);
    });

    it('detects AND AND consecutive', () => {
      const result = validateQueryString('cancer AND AND treatment');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Consecutive operators'))).toBe(true);
    });
  });

  describe('operator position', () => {
    it('detects AND at start', () => {
      const result = validateQueryString('AND cancer');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot start with'))).toBe(true);
    });

    it('detects OR at start', () => {
      const result = validateQueryString('OR cancer');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot start with'))).toBe(true);
    });

    it('detects operator at end', () => {
      const result = validateQueryString('cancer AND');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot end with'))).toBe(true);
    });
  });

  describe('quoted strings', () => {
    it('detects unclosed quotation mark', () => {
      const result = validateQueryString('"cervical spine AND treatment');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unclosed quotation mark');
    });

    it('allows properly quoted strings', () => {
      const result = validateQueryString('"cervical spine" AND "neck pain"');
      expect(result.isValid).toBe(true);
    });
  });

  describe('field qualifiers', () => {
    it('detects invalid field qualifier', () => {
      const result = validateQueryString('cancer[xyz]');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid field qualifier'))).toBe(true);
    });

    it('accepts valid field qualifiers', () => {
      const qualifiers = ['ti', 'tiab', 'mh', 'tw'];
      for (const q of qualifiers) {
        const result = validateQueryString(`cancer[${q}]`);
        expect(result.isValid).toBe(true);
      }
    });
  });
});
