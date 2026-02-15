import { describe, it, expect } from 'vitest';
import { validateBooleanQuery } from './boolean-query.js';

describe('validateBooleanQuery', () => {
  describe('valid queries', () => {
    it('accepts a simple term', () => {
      const result = validateBooleanQuery('spinal fusion');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts AND operator', () => {
      const result = validateBooleanQuery('spinal fusion AND outcomes');
      expect(result.valid).toBe(true);
    });

    it('accepts OR operator', () => {
      const result = validateBooleanQuery('spinal fusion OR lumbar fusion');
      expect(result.valid).toBe(true);
    });

    it('accepts NOT operator', () => {
      const result = validateBooleanQuery('NOT animal');
      expect(result.valid).toBe(true);
    });

    it('accepts parenthesized groups', () => {
      const result = validateBooleanQuery('(spinal fusion OR lumbar fusion) AND outcomes');
      expect(result.valid).toBe(true);
    });

    it('accepts nested parentheses', () => {
      const result = validateBooleanQuery('((spinal OR lumbar) AND fusion) AND outcomes');
      expect(result.valid).toBe(true);
    });

    it('accepts field qualifiers [ti]', () => {
      const result = validateBooleanQuery('spinal fusion[ti] AND outcomes[tiab]');
      expect(result.valid).toBe(true);
    });

    it('accepts field qualifiers [tiab]', () => {
      const result = validateBooleanQuery('device[tiab]');
      expect(result.valid).toBe(true);
    });

    it('accepts field qualifiers [mh]', () => {
      const result = validateBooleanQuery('"Spinal Fusion"[mh]');
      expect(result.valid).toBe(true);
    });

    it('accepts field qualifiers [tw]', () => {
      const result = validateBooleanQuery('implant[tw]');
      expect(result.valid).toBe(true);
    });

    it('accepts truncation wildcard', () => {
      const result = validateBooleanQuery('surg* AND outcome*');
      expect(result.valid).toBe(true);
    });

    it('accepts quoted phrases', () => {
      const result = validateBooleanQuery('"spinal fusion" AND "clinical outcomes"');
      expect(result.valid).toBe(true);
    });

    it('accepts complex query with all features', () => {
      const result = validateBooleanQuery(
        '("spinal fusion"[ti] OR lumbar*[tiab]) AND (outcome* OR complication*) NOT animal[mh]',
      );
      expect(result.valid).toBe(true);
    });

    it('accepts NOT in the middle', () => {
      const result = validateBooleanQuery('spinal fusion NOT animal');
      expect(result.valid).toBe(true);
    });
  });

  describe('empty / blank input', () => {
    it('rejects empty string', () => {
      const result = validateBooleanQuery('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query string cannot be empty');
    });

    it('rejects whitespace-only string', () => {
      const result = validateBooleanQuery('   ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query string cannot be empty');
    });
  });

  describe('unbalanced parentheses', () => {
    it('rejects missing closing parenthesis', () => {
      const result = validateBooleanQuery('(spinal fusion AND outcomes');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses: missing closing parenthesis');
    });

    it('rejects unexpected closing parenthesis', () => {
      const result = validateBooleanQuery('spinal fusion) AND outcomes');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses: unexpected closing parenthesis');
    });

    it('rejects multiple unbalanced parentheses', () => {
      const result = validateBooleanQuery('((spinal fusion AND outcomes)');
      expect(result.valid).toBe(false);
    });
  });

  describe('double operators', () => {
    it('rejects AND AND', () => {
      const result = validateBooleanQuery('spinal AND AND fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Double boolean operator detected');
    });

    it('rejects OR OR', () => {
      const result = validateBooleanQuery('spinal OR OR fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Double boolean operator detected');
    });

    it('rejects AND OR', () => {
      const result = validateBooleanQuery('spinal AND OR fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Double boolean operator detected');
    });

    it('rejects OR NOT at start (OR is leading)', () => {
      const result = validateBooleanQuery('OR NOT spinal');
      expect(result.valid).toBe(false);
    });
  });

  describe('empty groups', () => {
    it('rejects empty parentheses', () => {
      const result = validateBooleanQuery('spinal AND () AND fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty parenthesized group');
    });

    it('rejects empty parentheses with spaces', () => {
      const result = validateBooleanQuery('spinal AND (  ) AND fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty parenthesized group');
    });
  });

  describe('leading/trailing operators', () => {
    it('rejects query starting with AND', () => {
      const result = validateBooleanQuery('AND spinal fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot start with AND or OR operator');
    });

    it('rejects query starting with OR', () => {
      const result = validateBooleanQuery('OR spinal fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot start with AND or OR operator');
    });

    it('rejects query ending with AND', () => {
      const result = validateBooleanQuery('spinal fusion AND');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot end with a boolean operator');
    });

    it('rejects query ending with OR', () => {
      const result = validateBooleanQuery('spinal fusion OR');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot end with a boolean operator');
    });

    it('rejects query ending with NOT', () => {
      const result = validateBooleanQuery('spinal fusion NOT');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot end with a boolean operator');
    });
  });

  describe('unbalanced quotes', () => {
    it('rejects single unclosed quote', () => {
      const result = validateBooleanQuery('"spinal fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced quotes: missing closing quote');
    });

    it('rejects odd number of quotes', () => {
      const result = validateBooleanQuery('"spinal" AND "fusion');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced quotes: missing closing quote');
    });
  });

  describe('multiple errors', () => {
    it('reports multiple errors at once', () => {
      const result = validateBooleanQuery('AND () AND');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
