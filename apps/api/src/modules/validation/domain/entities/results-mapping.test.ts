import { describe, it, expect } from 'vitest';
import { compare, createResultsMapping, COMPARISON_RESULTS } from './results-mapping.js';

describe('ResultsMapping entity', () => {
  describe('compare', () => {
    it('returns MET when computedValue >= threshold (default operator)', () => {
      expect(compare({ computedValue: 0.95, threshold: 0.90 })).toBe('MET');
    });

    it('returns MET when computedValue equals threshold (default operator)', () => {
      expect(compare({ computedValue: 0.90, threshold: 0.90 })).toBe('MET');
    });

    it('returns NOT_MET when computedValue < threshold (default operator)', () => {
      expect(compare({ computedValue: 0.85, threshold: 0.90 })).toBe('NOT_MET');
    });

    it('handles >= operator', () => {
      expect(compare({ computedValue: 0.90, threshold: 0.90, operator: '>=' })).toBe('MET');
      expect(compare({ computedValue: 0.89, threshold: 0.90, operator: '>=' })).toBe('NOT_MET');
    });

    it('handles <= operator', () => {
      expect(compare({ computedValue: 0.05, threshold: 0.10, operator: '<=' })).toBe('MET');
      expect(compare({ computedValue: 0.15, threshold: 0.10, operator: '<=' })).toBe('NOT_MET');
    });

    it('handles > operator', () => {
      expect(compare({ computedValue: 0.91, threshold: 0.90, operator: '>' })).toBe('MET');
      expect(compare({ computedValue: 0.90, threshold: 0.90, operator: '>' })).toBe('NOT_MET');
    });

    it('handles < operator', () => {
      expect(compare({ computedValue: 0.05, threshold: 0.10, operator: '<' })).toBe('MET');
      expect(compare({ computedValue: 0.10, threshold: 0.10, operator: '<' })).toBe('NOT_MET');
    });

    it('handles = operator with exact match', () => {
      expect(compare({ computedValue: 0.90, threshold: 0.90, operator: '=' })).toBe('MET');
    });

    it('handles = operator with mismatch', () => {
      expect(compare({ computedValue: 0.91, threshold: 0.90, operator: '=' })).toBe('NOT_MET');
    });

    it('handles zero values', () => {
      expect(compare({ computedValue: 0, threshold: 0 })).toBe('MET');
      expect(compare({ computedValue: 0, threshold: 0.5 })).toBe('NOT_MET');
    });
  });

  describe('createResultsMapping', () => {
    it('creates mapping with MET result', () => {
      const mapping = createResultsMapping({
        id: 'map-1',
        validationStudyId: 'study-1',
        acceptanceCriterionId: 'crit-1',
        computedValue: 0.95,
        threshold: 0.90,
        unit: '%',
      });
      expect(mapping.result).toBe('MET');
      expect(mapping.computedValue).toBe(0.95);
      expect(mapping.threshold).toBe(0.90);
      expect(mapping.unit).toBe('%');
    });

    it('creates mapping with NOT_MET result', () => {
      const mapping = createResultsMapping({
        id: 'map-1',
        validationStudyId: 'study-1',
        acceptanceCriterionId: 'crit-1',
        computedValue: 0.80,
        threshold: 0.90,
      });
      expect(mapping.result).toBe('NOT_MET');
    });

    it('sets unit to null when not provided', () => {
      const mapping = createResultsMapping({
        id: 'map-1',
        validationStudyId: 'study-1',
        acceptanceCriterionId: 'crit-1',
        computedValue: 0.95,
        threshold: 0.90,
      });
      expect(mapping.unit).toBeNull();
    });

    it('respects the operator parameter', () => {
      const mapping = createResultsMapping({
        id: 'map-1',
        validationStudyId: 'study-1',
        acceptanceCriterionId: 'crit-1',
        computedValue: 0.05,
        threshold: 0.10,
        operator: '<=',
      });
      expect(mapping.result).toBe('MET');
    });

    it('sets createdAt timestamp', () => {
      const mapping = createResultsMapping({
        id: 'map-1',
        validationStudyId: 'study-1',
        acceptanceCriterionId: 'crit-1',
        computedValue: 0.95,
        threshold: 0.90,
      });
      expect(mapping.createdAt).toBeTruthy();
    });
  });

  it('exports COMPARISON_RESULTS with MET and NOT_MET', () => {
    expect(COMPARISON_RESULTS).toHaveLength(2);
    expect(COMPARISON_RESULTS).toContain('MET');
    expect(COMPARISON_RESULTS).toContain('NOT_MET');
  });
});
