import { describe, it, expect } from 'vitest';
import {
  computeSubgroupMetrics,
  assessFairness,
  type SubgroupDataPoint,
  type SubgroupMetrics,
  type FairnessConfig,
} from './fairness-analysis.js';

const DEFAULT_CONFIG: FairnessConfig = {
  classificationThreshold: 0.5,
  disparateImpactMinRatio: 0.8,
  equalizedOddsThreshold: 0.1,
};

function makeDataPoints(
  subgroup: string,
  points: Array<{ prediction: number; groundTruth: number }>,
): SubgroupDataPoint[] {
  return points.map((p) => ({
    prediction: p.prediction,
    groundTruth: p.groundTruth,
    subgroupValue: subgroup,
  }));
}

function makeFairData(): SubgroupDataPoint[] {
  return [
    // Group A: 10 points, high performance
    ...makeDataPoints('A', [
      { prediction: 0.9, groundTruth: 1 },
      { prediction: 0.8, groundTruth: 1 },
      { prediction: 0.7, groundTruth: 1 },
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.2, groundTruth: 0 },
      { prediction: 0.3, groundTruth: 0 },
      { prediction: 0.85, groundTruth: 1 },
      { prediction: 0.15, groundTruth: 0 },
      { prediction: 0.9, groundTruth: 1 },
      { prediction: 0.1, groundTruth: 0 },
    ]),
    // Group B: 10 points, similar performance
    ...makeDataPoints('B', [
      { prediction: 0.85, groundTruth: 1 },
      { prediction: 0.75, groundTruth: 1 },
      { prediction: 0.8, groundTruth: 1 },
      { prediction: 0.15, groundTruth: 0 },
      { prediction: 0.2, groundTruth: 0 },
      { prediction: 0.25, groundTruth: 0 },
      { prediction: 0.9, groundTruth: 1 },
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.88, groundTruth: 1 },
      { prediction: 0.12, groundTruth: 0 },
    ]),
  ];
}

function makeUnfairData(): SubgroupDataPoint[] {
  return [
    // Group A: high sensitivity (all positives detected)
    ...makeDataPoints('A', [
      { prediction: 0.9, groundTruth: 1 },
      { prediction: 0.8, groundTruth: 1 },
      { prediction: 0.7, groundTruth: 1 },
      { prediction: 0.6, groundTruth: 1 },
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.2, groundTruth: 0 },
      { prediction: 0.15, groundTruth: 0 },
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.9, groundTruth: 1 },
      { prediction: 0.05, groundTruth: 0 },
    ]),
    // Group B: low sensitivity (misses many positives) — unfair
    ...makeDataPoints('B', [
      { prediction: 0.3, groundTruth: 1 }, // FN
      { prediction: 0.2, groundTruth: 1 }, // FN
      { prediction: 0.4, groundTruth: 1 }, // FN
      { prediction: 0.6, groundTruth: 1 }, // TP
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.2, groundTruth: 0 },
      { prediction: 0.15, groundTruth: 0 },
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.7, groundTruth: 1 }, // TP
      { prediction: 0.05, groundTruth: 0 },
    ]),
  ];
}

describe('computeSubgroupMetrics', () => {
  it('computes metrics for each subgroup', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    expect(metrics).toHaveLength(2);

    const groupA = metrics.find((m) => m.subgroup === 'A')!;
    const groupB = metrics.find((m) => m.subgroup === 'B')!;

    expect(groupA.count).toBe(10);
    expect(groupB.count).toBe(10);
  });

  it('computes confusion matrix correctly for group A (fair data)', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    const groupA = metrics.find((m) => m.subgroup === 'A')!;

    // Group A: 5 positives predicted correctly, 5 negatives predicted correctly
    expect(groupA.truePositives).toBe(5);
    expect(groupA.trueNegatives).toBe(5);
    expect(groupA.falsePositives).toBe(0);
    expect(groupA.falseNegatives).toBe(0);
  });

  it('computes sensitivity correctly', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    const groupA = metrics.find((m) => m.subgroup === 'A')!;
    expect(groupA.sensitivity).toBe(1.0); // TP / (TP + FN) = 5/5
  });

  it('computes specificity correctly', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    const groupA = metrics.find((m) => m.subgroup === 'A')!;
    expect(groupA.specificity).toBe(1.0); // TN / (TN + FP) = 5/5
  });

  it('computes accuracy correctly', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    const groupA = metrics.find((m) => m.subgroup === 'A')!;
    expect(groupA.accuracy).toBe(1.0);
  });

  it('computes positive rate correctly', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    const groupA = metrics.find((m) => m.subgroup === 'A')!;
    expect(groupA.positiveRate).toBe(0.5); // (TP + FP) / total = 5/10
  });

  it('handles empty data', () => {
    const metrics = computeSubgroupMetrics([], 'gender');
    expect(metrics).toHaveLength(0);
  });

  it('handles single subgroup', () => {
    const data = makeDataPoints('A', [
      { prediction: 0.9, groundTruth: 1 },
      { prediction: 0.1, groundTruth: 0 },
    ]);

    const metrics = computeSubgroupMetrics(data, 'gender');

    expect(metrics).toHaveLength(1);
    expect(metrics[0].subgroup).toBe('A');
  });

  it('uses custom classification threshold', () => {
    const data = makeDataPoints('A', [
      { prediction: 0.6, groundTruth: 1 }, // Below 0.7 threshold = FN
      { prediction: 0.8, groundTruth: 1 }, // Above 0.7 threshold = TP
      { prediction: 0.3, groundTruth: 0 }, // TN
    ]);

    const config: FairnessConfig = {
      ...DEFAULT_CONFIG,
      classificationThreshold: 0.7,
    };

    const metrics = computeSubgroupMetrics(data, 'gender', config);

    expect(metrics[0].truePositives).toBe(1);
    expect(metrics[0].falseNegatives).toBe(1);
    expect(metrics[0].sensitivity).toBe(0.5);
  });

  it('returns metrics sorted by subgroup name', () => {
    const data = [
      ...makeDataPoints('C', [{ prediction: 0.9, groundTruth: 1 }]),
      ...makeDataPoints('A', [{ prediction: 0.9, groundTruth: 1 }]),
      ...makeDataPoints('B', [{ prediction: 0.9, groundTruth: 1 }]),
    ];

    const metrics = computeSubgroupMetrics(data, 'gender');

    expect(metrics.map((m) => m.subgroup)).toEqual(['A', 'B', 'C']);
  });

  it('handles division by zero (no positives)', () => {
    const data = makeDataPoints('A', [
      { prediction: 0.1, groundTruth: 0 },
      { prediction: 0.2, groundTruth: 0 },
    ]);

    const metrics = computeSubgroupMetrics(data, 'gender');

    expect(metrics[0].sensitivity).toBe(0);
    expect(metrics[0].ppv).toBe(0);
  });
});

describe('assessFairness', () => {
  it('passes for fair data', () => {
    const data = makeFairData();
    const metrics = computeSubgroupMetrics(data, 'gender');
    const assessment = assessFairness(metrics);

    expect(assessment.overallPassed).toBe(true);
    expect(assessment.disparateImpact.passed).toBe(true);
    expect(assessment.equalizedOdds.passed).toBe(true);
    expect(assessment.recommendations).toHaveLength(0);
  });

  it('fails for unfair data', () => {
    const data = makeUnfairData();
    const metrics = computeSubgroupMetrics(data, 'gender');
    const assessment = assessFairness(metrics);

    // Should fail equalized odds due to sensitivity difference
    expect(assessment.equalizedOdds.passed).toBe(false);
    expect(assessment.overallPassed).toBe(false);
  });

  it('detects disparate impact', () => {
    const metrics: SubgroupMetrics[] = [
      {
        subgroup: 'A',
        count: 100,
        truePositives: 40,
        falsePositives: 10,
        trueNegatives: 40,
        falseNegatives: 10,
        sensitivity: 0.8,
        specificity: 0.8,
        ppv: 0.8,
        npv: 0.8,
        accuracy: 0.8,
        positiveRate: 0.5,
      },
      {
        subgroup: 'B',
        count: 100,
        truePositives: 10,
        falsePositives: 5,
        trueNegatives: 70,
        falseNegatives: 15,
        sensitivity: 0.4,
        specificity: 0.93,
        ppv: 0.67,
        npv: 0.82,
        accuracy: 0.8,
        positiveRate: 0.15, // Much lower than A's 0.5
      },
    ];

    const assessment = assessFairness(metrics);

    expect(assessment.disparateImpact.passed).toBe(false);
    expect(assessment.disparateImpact.ratio).toBeLessThan(0.8);
  });

  it('provides recommendations for disparate impact failure', () => {
    const metrics: SubgroupMetrics[] = [
      {
        subgroup: 'A',
        count: 100,
        truePositives: 40,
        falsePositives: 10,
        trueNegatives: 40,
        falseNegatives: 10,
        sensitivity: 0.8,
        specificity: 0.8,
        ppv: 0.8,
        npv: 0.8,
        accuracy: 0.8,
        positiveRate: 0.5,
      },
      {
        subgroup: 'B',
        count: 80,
        truePositives: 5,
        falsePositives: 2,
        trueNegatives: 63,
        falseNegatives: 10,
        sensitivity: 0.33,
        specificity: 0.97,
        ppv: 0.71,
        npv: 0.86,
        accuracy: 0.85,
        positiveRate: 0.0875,
      },
    ];

    const assessment = assessFairness(metrics);

    expect(assessment.recommendations.length).toBeGreaterThan(0);
    expect(assessment.recommendations[0]).toContain('Disparate impact');
  });

  it('provides recommendations for equalized odds failure', () => {
    const data = makeUnfairData();
    const metrics = computeSubgroupMetrics(data, 'gender');
    const assessment = assessFairness(metrics);

    const eqOddsRec = assessment.recommendations.find((r) =>
      r.includes('Equalized odds'),
    );
    expect(eqOddsRec).toBeDefined();
  });

  it('handles single subgroup (trivially fair)', () => {
    const metrics: SubgroupMetrics[] = [
      {
        subgroup: 'A',
        count: 100,
        truePositives: 40,
        falsePositives: 10,
        trueNegatives: 40,
        falseNegatives: 10,
        sensitivity: 0.8,
        specificity: 0.8,
        ppv: 0.8,
        npv: 0.8,
        accuracy: 0.8,
        positiveRate: 0.5,
      },
    ];

    const assessment = assessFairness(metrics);

    expect(assessment.overallPassed).toBe(true);
  });

  it('handles empty subgroup metrics', () => {
    const assessment = assessFairness([]);

    expect(assessment.overallPassed).toBe(true);
    expect(assessment.disparateImpact.referenceGroup).toBe('N/A');
  });

  it('uses reference group as the largest subgroup', () => {
    const metrics: SubgroupMetrics[] = [
      {
        subgroup: 'Small',
        count: 10,
        truePositives: 5,
        falsePositives: 0,
        trueNegatives: 5,
        falseNegatives: 0,
        sensitivity: 1.0,
        specificity: 1.0,
        ppv: 1.0,
        npv: 1.0,
        accuracy: 1.0,
        positiveRate: 0.5,
      },
      {
        subgroup: 'Large',
        count: 100,
        truePositives: 40,
        falsePositives: 10,
        trueNegatives: 40,
        falseNegatives: 10,
        sensitivity: 0.8,
        specificity: 0.8,
        ppv: 0.8,
        npv: 0.8,
        accuracy: 0.8,
        positiveRate: 0.5,
      },
    ];

    const assessment = assessFairness(metrics);

    expect(assessment.disparateImpact.referenceGroup).toBe('Large');
  });

  it('equalized odds reports maximum differences', () => {
    const data = makeUnfairData();
    const metrics = computeSubgroupMetrics(data, 'gender');
    const assessment = assessFairness(metrics);

    expect(assessment.equalizedOdds.maxSensitivityDifference).toBeGreaterThan(0);
    expect(assessment.equalizedOdds.threshold).toBe(0.1);
  });

  it('uses custom fairness config', () => {
    const data = makeUnfairData();
    const metrics = computeSubgroupMetrics(data, 'gender');

    const strictConfig: FairnessConfig = {
      classificationThreshold: 0.5,
      disparateImpactMinRatio: 0.9,
      equalizedOddsThreshold: 0.05,
    };

    const assessment = assessFairness(metrics, strictConfig);

    // Strict thresholds should cause more failures
    expect(assessment.equalizedOdds.threshold).toBe(0.05);
  });
});
