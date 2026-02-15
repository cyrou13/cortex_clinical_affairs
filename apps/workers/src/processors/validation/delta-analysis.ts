/**
 * Delta Analysis — Patch validation delta computation.
 *
 * Compares parent model results with patch model results to determine
 * if performance improved, degraded, or remained unchanged per metric.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface MetricResult {
  metricName: string;
  value: number;
  unit: string;
  subgroup?: string;
}

export type DeltaClassification = 'IMPROVED' | 'DEGRADED' | 'UNCHANGED';

export interface DeltaResult {
  metricName: string;
  parentValue: number;
  patchValue: number;
  absoluteDelta: number;
  relativeDeltaPercent: number;
  classification: DeltaClassification;
  subgroup?: string;
  unit: string;
}

export interface DeltaSummary {
  totalMetrics: number;
  improved: number;
  degraded: number;
  unchanged: number;
  results: DeltaResult[];
}

// ── Configuration ───────────────────────────────────────────────────────

export interface DeltaConfig {
  /**
   * Threshold below which a relative change is considered unchanged.
   * Default: 0.01 (1%)
   */
  unchangedThreshold: number;

  /**
   * Whether higher metric values are better (e.g., AUC, sensitivity).
   * If false, lower values are better (e.g., false positive rate).
   * Default: true
   */
  higherIsBetter: boolean;
}

const DEFAULT_CONFIG: DeltaConfig = {
  unchangedThreshold: 0.01,
  higherIsBetter: true,
};

// ── Core Functions ──────────────────────────────────────────────────────

/**
 * Classify a delta value as improved, degraded, or unchanged.
 */
export function classifyDelta(
  parentValue: number,
  patchValue: number,
  config: DeltaConfig = DEFAULT_CONFIG,
): DeltaClassification {
  if (parentValue === 0 && patchValue === 0) {
    return 'UNCHANGED';
  }

  const absoluteDelta = patchValue - parentValue;
  const denominator = parentValue !== 0 ? Math.abs(parentValue) : 1;
  const relativeDelta = Math.abs(absoluteDelta) / denominator;

  if (relativeDelta <= config.unchangedThreshold) {
    return 'UNCHANGED';
  }

  if (config.higherIsBetter) {
    return absoluteDelta > 0 ? 'IMPROVED' : 'DEGRADED';
  } else {
    return absoluteDelta < 0 ? 'IMPROVED' : 'DEGRADED';
  }
}

/**
 * Compute the delta between parent and patch results for a single metric pair.
 */
export function computeSingleDelta(
  parent: MetricResult,
  patch: MetricResult,
  config: DeltaConfig = DEFAULT_CONFIG,
): DeltaResult {
  const absoluteDelta = patch.value - parent.value;
  const denominator = parent.value !== 0 ? Math.abs(parent.value) : 1;
  const relativeDeltaPercent = (absoluteDelta / denominator) * 100;

  return {
    metricName: parent.metricName,
    parentValue: parent.value,
    patchValue: patch.value,
    absoluteDelta,
    relativeDeltaPercent,
    classification: classifyDelta(parent.value, patch.value, config),
    subgroup: parent.subgroup ?? patch.subgroup,
    unit: parent.unit,
  };
}

/**
 * Compare parent results with patch results across all matching metrics.
 *
 * Metrics are matched by metricName + subgroup. Unmatched metrics are skipped.
 */
export function computeDelta(
  parentResults: MetricResult[],
  patchResults: MetricResult[],
  config: DeltaConfig = DEFAULT_CONFIG,
): DeltaSummary {
  const patchMap = new Map<string, MetricResult>();
  for (const result of patchResults) {
    const key = buildMetricKey(result.metricName, result.subgroup);
    patchMap.set(key, result);
  }

  const results: DeltaResult[] = [];

  for (const parentResult of parentResults) {
    const key = buildMetricKey(parentResult.metricName, parentResult.subgroup);
    const patchResult = patchMap.get(key);

    if (patchResult) {
      results.push(computeSingleDelta(parentResult, patchResult, config));
    }
  }

  const improved = results.filter((r) => r.classification === 'IMPROVED').length;
  const degraded = results.filter((r) => r.classification === 'DEGRADED').length;
  const unchanged = results.filter((r) => r.classification === 'UNCHANGED').length;

  return {
    totalMetrics: results.length,
    improved,
    degraded,
    unchanged,
    results,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function buildMetricKey(metricName: string, subgroup?: string): string {
  return subgroup ? `${metricName}::${subgroup}` : metricName;
}
