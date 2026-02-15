import { describe, it, expect } from 'vitest';
import {
  classifyDelta,
  computeSingleDelta,
  computeDelta,
  type MetricResult,
  type DeltaConfig,
} from './delta-analysis.js';

const HIGHER_IS_BETTER: DeltaConfig = {
  unchangedThreshold: 0.01,
  higherIsBetter: true,
};

const LOWER_IS_BETTER: DeltaConfig = {
  unchangedThreshold: 0.01,
  higherIsBetter: false,
};

describe('classifyDelta', () => {
  it('classifies improved when patch > parent (higher is better)', () => {
    expect(classifyDelta(0.90, 0.95, HIGHER_IS_BETTER)).toBe('IMPROVED');
  });

  it('classifies degraded when patch < parent (higher is better)', () => {
    expect(classifyDelta(0.95, 0.88, HIGHER_IS_BETTER)).toBe('DEGRADED');
  });

  it('classifies unchanged when delta within threshold', () => {
    expect(classifyDelta(0.95, 0.954, HIGHER_IS_BETTER)).toBe('UNCHANGED');
  });

  it('classifies improved when patch < parent (lower is better)', () => {
    expect(classifyDelta(0.10, 0.05, LOWER_IS_BETTER)).toBe('IMPROVED');
  });

  it('classifies degraded when patch > parent (lower is better)', () => {
    expect(classifyDelta(0.05, 0.15, LOWER_IS_BETTER)).toBe('DEGRADED');
  });

  it('classifies unchanged when both are zero', () => {
    expect(classifyDelta(0, 0, HIGHER_IS_BETTER)).toBe('UNCHANGED');
  });

  it('handles zero parent value with non-zero patch', () => {
    // When parent is 0, denominator becomes 1, so absolute delta is used
    const result = classifyDelta(0, 0.5, HIGHER_IS_BETTER);
    expect(result).toBe('IMPROVED');
  });

  it('uses default config when none provided', () => {
    const result = classifyDelta(0.90, 0.95);
    expect(result).toBe('IMPROVED');
  });

  it('respects custom unchanged threshold', () => {
    const config: DeltaConfig = { unchangedThreshold: 0.10, higherIsBetter: true };
    // 5% change with 10% threshold => unchanged
    expect(classifyDelta(1.0, 1.05, config)).toBe('UNCHANGED');
  });
});

describe('computeSingleDelta', () => {
  it('computes delta for matching metrics', () => {
    const parent: MetricResult = { metricName: 'AUC', value: 0.90, unit: '' };
    const patch: MetricResult = { metricName: 'AUC', value: 0.95, unit: '' };

    const result = computeSingleDelta(parent, patch);

    expect(result.metricName).toBe('AUC');
    expect(result.parentValue).toBe(0.90);
    expect(result.patchValue).toBe(0.95);
    expect(result.absoluteDelta).toBeCloseTo(0.05);
    expect(result.relativeDeltaPercent).toBeCloseTo(5.56, 1);
    expect(result.classification).toBe('IMPROVED');
    expect(result.unit).toBe('');
  });

  it('preserves subgroup from parent', () => {
    const parent: MetricResult = {
      metricName: 'Sensitivity',
      value: 92,
      unit: '%',
      subgroup: 'Female',
    };
    const patch: MetricResult = {
      metricName: 'Sensitivity',
      value: 94,
      unit: '%',
    };

    const result = computeSingleDelta(parent, patch);

    expect(result.subgroup).toBe('Female');
  });

  it('computes negative delta correctly', () => {
    const parent: MetricResult = { metricName: 'AUC', value: 0.95, unit: '' };
    const patch: MetricResult = { metricName: 'AUC', value: 0.88, unit: '' };

    const result = computeSingleDelta(parent, patch);

    expect(result.absoluteDelta).toBeCloseTo(-0.07);
    expect(result.classification).toBe('DEGRADED');
  });
});

describe('computeDelta', () => {
  it('computes delta summary for matching metrics', () => {
    const parentResults: MetricResult[] = [
      { metricName: 'AUC', value: 0.90, unit: '' },
      { metricName: 'Sensitivity', value: 92.0, unit: '%' },
      { metricName: 'Specificity', value: 95.0, unit: '%' },
    ];

    const patchResults: MetricResult[] = [
      { metricName: 'AUC', value: 0.95, unit: '' },
      { metricName: 'Sensitivity', value: 94.0, unit: '%' },
      { metricName: 'Specificity', value: 93.0, unit: '%' },
    ];

    const summary = computeDelta(parentResults, patchResults);

    expect(summary.totalMetrics).toBe(3);
    expect(summary.improved).toBe(2); // AUC, Sensitivity
    expect(summary.degraded).toBe(1); // Specificity
    expect(summary.unchanged).toBe(0);
    expect(summary.results).toHaveLength(3);
  });

  it('skips unmatched metrics', () => {
    const parentResults: MetricResult[] = [
      { metricName: 'AUC', value: 0.90, unit: '' },
      { metricName: 'F1-Score', value: 0.88, unit: '' },
    ];

    const patchResults: MetricResult[] = [
      { metricName: 'AUC', value: 0.95, unit: '' },
      // F1-Score not present in patch
    ];

    const summary = computeDelta(parentResults, patchResults);

    expect(summary.totalMetrics).toBe(1);
    expect(summary.results[0].metricName).toBe('AUC');
  });

  it('matches metrics by name AND subgroup', () => {
    const parentResults: MetricResult[] = [
      { metricName: 'Sensitivity', value: 90, unit: '%', subgroup: 'Male' },
      { metricName: 'Sensitivity', value: 92, unit: '%', subgroup: 'Female' },
    ];

    const patchResults: MetricResult[] = [
      { metricName: 'Sensitivity', value: 93, unit: '%', subgroup: 'Male' },
      { metricName: 'Sensitivity', value: 91, unit: '%', subgroup: 'Female' },
    ];

    const summary = computeDelta(parentResults, patchResults);

    expect(summary.totalMetrics).toBe(2);

    const maleResult = summary.results.find((r) => r.subgroup === 'Male');
    expect(maleResult!.classification).toBe('IMPROVED');

    const femaleResult = summary.results.find((r) => r.subgroup === 'Female');
    expect(femaleResult!.classification).toBe('DEGRADED');
  });

  it('handles empty parent results', () => {
    const summary = computeDelta([], [{ metricName: 'AUC', value: 0.95, unit: '' }]);

    expect(summary.totalMetrics).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it('handles empty patch results', () => {
    const summary = computeDelta(
      [{ metricName: 'AUC', value: 0.95, unit: '' }],
      [],
    );

    expect(summary.totalMetrics).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it('handles both empty', () => {
    const summary = computeDelta([], []);

    expect(summary.totalMetrics).toBe(0);
    expect(summary.improved).toBe(0);
    expect(summary.degraded).toBe(0);
    expect(summary.unchanged).toBe(0);
  });

  it('uses lower-is-better config', () => {
    const parentResults: MetricResult[] = [
      { metricName: 'FPR', value: 0.10, unit: '' },
    ];
    const patchResults: MetricResult[] = [
      { metricName: 'FPR', value: 0.05, unit: '' },
    ];

    const summary = computeDelta(parentResults, patchResults, LOWER_IS_BETTER);

    expect(summary.improved).toBe(1);
    expect(summary.results[0].classification).toBe('IMPROVED');
  });

  it('correctly counts unchanged metrics', () => {
    const parentResults: MetricResult[] = [
      { metricName: 'AUC', value: 0.950, unit: '' },
      { metricName: 'Sensitivity', value: 92.0, unit: '%' },
    ];
    const patchResults: MetricResult[] = [
      { metricName: 'AUC', value: 0.952, unit: '' }, // 0.2% change < 1% threshold
      { metricName: 'Sensitivity', value: 98.0, unit: '%' }, // Big change
    ];

    const summary = computeDelta(parentResults, patchResults);

    expect(summary.unchanged).toBe(1);
    expect(summary.improved).toBe(1);
  });
});
