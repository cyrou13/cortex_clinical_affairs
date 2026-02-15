export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface WilsonCIResult {
  lower: number;
  upper: number;
  center: number;
}

export interface StatisticsResult {
  sensitivity: number;
  specificity: number;
  sensitivityCI: WilsonCIResult;
  specificityCI: WilsonCIResult;
  accuracy: number;
  ppv: number;
  npv: number;
  sampleSize: number;
}

/**
 * Compute sensitivity (true positive rate / recall)
 * sensitivity = TP / (TP + FN)
 */
export function computeSensitivity(matrix: ConfusionMatrix): number {
  const denominator = matrix.truePositives + matrix.falseNegatives;
  if (denominator === 0) return 0;
  return matrix.truePositives / denominator;
}

/**
 * Compute specificity (true negative rate)
 * specificity = TN / (TN + FP)
 */
export function computeSpecificity(matrix: ConfusionMatrix): number {
  const denominator = matrix.trueNegatives + matrix.falsePositives;
  if (denominator === 0) return 0;
  return matrix.trueNegatives / denominator;
}

/**
 * Compute Wilson score confidence interval
 * Used for binomial proportions - recommended for medical device validation
 */
export function computeWilsonCI(
  successes: number,
  total: number,
  confidenceLevel: number = 0.95,
): WilsonCIResult {
  if (total === 0) {
    return { lower: 0, upper: 0, center: 0 };
  }

  // z-score for confidence level
  const z = getZScore(confidenceLevel);
  const p = successes / total;
  const n = total;

  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    center,
  };
}

/**
 * Compute accuracy = (TP + TN) / (TP + TN + FP + FN)
 */
export function computeAccuracy(matrix: ConfusionMatrix): number {
  const total =
    matrix.truePositives +
    matrix.trueNegatives +
    matrix.falsePositives +
    matrix.falseNegatives;
  if (total === 0) return 0;
  return (matrix.truePositives + matrix.trueNegatives) / total;
}

/**
 * Compute Positive Predictive Value = TP / (TP + FP)
 */
export function computePPV(matrix: ConfusionMatrix): number {
  const denominator = matrix.truePositives + matrix.falsePositives;
  if (denominator === 0) return 0;
  return matrix.truePositives / denominator;
}

/**
 * Compute Negative Predictive Value = TN / (TN + FN)
 */
export function computeNPV(matrix: ConfusionMatrix): number {
  const denominator = matrix.trueNegatives + matrix.falseNegatives;
  if (denominator === 0) return 0;
  return matrix.trueNegatives / denominator;
}

/**
 * Build confusion matrix from predictions
 */
export function buildConfusionMatrix(
  predictions: Array<{ groundTruth: string; prediction: string }>,
  positiveLabel: string = 'POSITIVE',
): ConfusionMatrix {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const { groundTruth, prediction } of predictions) {
    const isActualPositive = groundTruth === positiveLabel;
    const isPredictedPositive = prediction === positiveLabel;

    if (isActualPositive && isPredictedPositive) tp++;
    else if (!isActualPositive && isPredictedPositive) fp++;
    else if (!isActualPositive && !isPredictedPositive) tn++;
    else if (isActualPositive && !isPredictedPositive) fn++;
  }

  return { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn };
}

/**
 * Compute all statistics from a confusion matrix
 */
export function computeStatistics(
  matrix: ConfusionMatrix,
  confidenceLevel: number = 0.95,
): StatisticsResult {
  const sensitivity = computeSensitivity(matrix);
  const specificity = computeSpecificity(matrix);
  const accuracy = computeAccuracy(matrix);
  const ppv = computePPV(matrix);
  const npv = computeNPV(matrix);

  const sensitivityTotal = matrix.truePositives + matrix.falseNegatives;
  const specificityTotal = matrix.trueNegatives + matrix.falsePositives;

  const sensitivityCI = computeWilsonCI(
    matrix.truePositives,
    sensitivityTotal,
    confidenceLevel,
  );
  const specificityCI = computeWilsonCI(
    matrix.trueNegatives,
    specificityTotal,
    confidenceLevel,
  );

  const sampleSize =
    matrix.truePositives +
    matrix.falsePositives +
    matrix.trueNegatives +
    matrix.falseNegatives;

  return {
    sensitivity,
    specificity,
    sensitivityCI,
    specificityCI,
    accuracy,
    ppv,
    npv,
    sampleSize,
  };
}

function getZScore(confidenceLevel: number): number {
  // Common z-scores for confidence levels
  const zScores: Record<string, number> = {
    '0.9': 1.645,
    '0.95': 1.96,
    '0.99': 2.576,
  };
  return zScores[confidenceLevel.toString()] ?? 1.96;
}
