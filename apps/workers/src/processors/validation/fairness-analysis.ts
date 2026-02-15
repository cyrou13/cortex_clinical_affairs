/**
 * Fairness Analysis — Algorithmic fairness metrics computation.
 *
 * Computes per-subgroup performance metrics and assesses fairness
 * using disparate impact ratio and equalized odds checks per
 * regulatory requirements for AI/ML medical devices.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface SubgroupDataPoint {
  prediction: number;
  groundTruth: number;
  subgroupValue: string;
}

export interface SubgroupMetrics {
  subgroup: string;
  count: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  accuracy: number;
  positiveRate: number;
}

export interface FairnessAssessment {
  overallPassed: boolean;
  disparateImpact: DisparateImpactResult;
  equalizedOdds: EqualizedOddsResult;
  subgroupMetrics: SubgroupMetrics[];
  recommendations: string[];
}

export interface DisparateImpactResult {
  passed: boolean;
  ratio: number;
  referenceGroup: string;
  minimumRatio: number;
  details: DisparateImpactDetail[];
}

export interface DisparateImpactDetail {
  subgroup: string;
  positiveRate: number;
  ratio: number;
  passed: boolean;
}

export interface EqualizedOddsResult {
  passed: boolean;
  maxSensitivityDifference: number;
  maxSpecificityDifference: number;
  threshold: number;
  details: EqualizedOddsDetail[];
}

export interface EqualizedOddsDetail {
  subgroup: string;
  sensitivity: number;
  specificity: number;
  sensitivityDifference: number;
  specificityDifference: number;
  passed: boolean;
}

// ── Configuration ───────────────────────────────────────────────────────

export interface FairnessConfig {
  /**
   * Threshold for binary classification. Default: 0.5
   */
  classificationThreshold: number;

  /**
   * Minimum disparate impact ratio (4/5 rule). Default: 0.8
   */
  disparateImpactMinRatio: number;

  /**
   * Maximum difference in TPR/FPR between subgroups for equalized odds.
   * Default: 0.1 (10 percentage points)
   */
  equalizedOddsThreshold: number;
}

const DEFAULT_CONFIG: FairnessConfig = {
  classificationThreshold: 0.5,
  disparateImpactMinRatio: 0.8,
  equalizedOddsThreshold: 0.1,
};

// ── Core Functions ──────────────────────────────────────────────────────

/**
 * Compute confusion matrix and derived metrics for a single subgroup.
 */
export function computeSubgroupMetrics(
  data: SubgroupDataPoint[],
  subgroupField: string,
  config: FairnessConfig = DEFAULT_CONFIG,
): SubgroupMetrics[] {
  const groups = new Map<string, SubgroupDataPoint[]>();

  for (const point of data) {
    const groupKey = point.subgroupValue;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(point);
  }

  const results: SubgroupMetrics[] = [];

  for (const [subgroup, points] of groups) {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const point of points) {
      const predicted = point.prediction >= config.classificationThreshold ? 1 : 0;
      const actual = point.groundTruth;

      if (predicted === 1 && actual === 1) tp++;
      else if (predicted === 1 && actual === 0) fp++;
      else if (predicted === 0 && actual === 0) tn++;
      else if (predicted === 0 && actual === 1) fn++;
    }

    const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const ppv = tp + fp > 0 ? tp / (tp + fp) : 0;
    const npv = tn + fn > 0 ? tn / (tn + fn) : 0;
    const accuracy = points.length > 0 ? (tp + tn) / points.length : 0;
    const positiveRate = points.length > 0 ? (tp + fp) / points.length : 0;

    results.push({
      subgroup,
      count: points.length,
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
      sensitivity,
      specificity,
      ppv,
      npv,
      accuracy,
      positiveRate,
    });
  }

  return results.sort((a, b) => a.subgroup.localeCompare(b.subgroup));
}

/**
 * Assess fairness across subgroup metrics using disparate impact and equalized odds.
 */
export function assessFairness(
  subgroupMetrics: SubgroupMetrics[],
  config: FairnessConfig = DEFAULT_CONFIG,
): FairnessAssessment {
  if (subgroupMetrics.length < 2) {
    return {
      overallPassed: true,
      disparateImpact: {
        passed: true,
        ratio: 1,
        referenceGroup: subgroupMetrics[0]?.subgroup ?? 'N/A',
        minimumRatio: config.disparateImpactMinRatio,
        details: [],
      },
      equalizedOdds: {
        passed: true,
        maxSensitivityDifference: 0,
        maxSpecificityDifference: 0,
        threshold: config.equalizedOddsThreshold,
        details: [],
      },
      subgroupMetrics,
      recommendations: [],
    };
  }

  // Find reference group (largest subgroup)
  const referenceGroup = subgroupMetrics.reduce((a, b) =>
    a.count >= b.count ? a : b,
  );

  // Disparate Impact (4/5 rule)
  const disparateImpactDetails: DisparateImpactDetail[] = [];
  let minDisparateRatio = Infinity;

  for (const metrics of subgroupMetrics) {
    if (metrics.subgroup === referenceGroup.subgroup) continue;

    const ratio =
      referenceGroup.positiveRate > 0
        ? metrics.positiveRate / referenceGroup.positiveRate
        : metrics.positiveRate === 0
          ? 1
          : 0;

    disparateImpactDetails.push({
      subgroup: metrics.subgroup,
      positiveRate: metrics.positiveRate,
      ratio,
      passed: ratio >= config.disparateImpactMinRatio,
    });

    if (ratio < minDisparateRatio) {
      minDisparateRatio = ratio;
    }
  }

  const disparateImpactPassed = disparateImpactDetails.every((d) => d.passed);

  // Equalized Odds
  const equalizedOddsDetails: EqualizedOddsDetail[] = [];
  let maxSensDiff = 0;
  let maxSpecDiff = 0;

  for (const metrics of subgroupMetrics) {
    if (metrics.subgroup === referenceGroup.subgroup) continue;

    const sensDiff = Math.abs(metrics.sensitivity - referenceGroup.sensitivity);
    const specDiff = Math.abs(metrics.specificity - referenceGroup.specificity);

    maxSensDiff = Math.max(maxSensDiff, sensDiff);
    maxSpecDiff = Math.max(maxSpecDiff, specDiff);

    equalizedOddsDetails.push({
      subgroup: metrics.subgroup,
      sensitivity: metrics.sensitivity,
      specificity: metrics.specificity,
      sensitivityDifference: sensDiff,
      specificityDifference: specDiff,
      passed:
        sensDiff <= config.equalizedOddsThreshold &&
        specDiff <= config.equalizedOddsThreshold,
    });
  }

  const equalizedOddsPassed = equalizedOddsDetails.every((d) => d.passed);

  // Recommendations
  const recommendations: string[] = [];

  if (!disparateImpactPassed) {
    const failedGroups = disparateImpactDetails
      .filter((d) => !d.passed)
      .map((d) => d.subgroup);
    recommendations.push(
      `Disparate impact detected for subgroup(s): ${failedGroups.join(', ')}. ` +
        `Consider retraining with balanced data or applying bias mitigation.`,
    );
  }

  if (!equalizedOddsPassed) {
    const failedGroups = equalizedOddsDetails
      .filter((d) => !d.passed)
      .map((d) => d.subgroup);
    recommendations.push(
      `Equalized odds violation for subgroup(s): ${failedGroups.join(', ')}. ` +
        `Review model calibration across demographic groups.`,
    );
  }

  return {
    overallPassed: disparateImpactPassed && equalizedOddsPassed,
    disparateImpact: {
      passed: disparateImpactPassed,
      ratio: minDisparateRatio === Infinity ? 1 : minDisparateRatio,
      referenceGroup: referenceGroup.subgroup,
      minimumRatio: config.disparateImpactMinRatio,
      details: disparateImpactDetails,
    },
    equalizedOdds: {
      passed: equalizedOddsPassed,
      maxSensitivityDifference: maxSensDiff,
      maxSpecificityDifference: maxSpecDiff,
      threshold: config.equalizedOddsThreshold,
      details: equalizedOddsDetails,
    },
    subgroupMetrics,
    recommendations,
  };
}
