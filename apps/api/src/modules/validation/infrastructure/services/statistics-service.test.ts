import { describe, it, expect } from 'vitest';
import {
  computeSensitivity,
  computeSpecificity,
  computeAccuracy,
  computePPV,
  computeNPV,
  computeWilsonCI,
  buildConfusionMatrix,
  computeStatistics,
  type ConfusionMatrix,
} from './statistics-service.js';

describe('StatisticsService', () => {
  // Standard confusion matrix: 90 TP, 5 FP, 85 TN, 10 FN
  const standardMatrix: ConfusionMatrix = {
    truePositives: 90,
    falsePositives: 5,
    trueNegatives: 85,
    falseNegatives: 10,
  };

  describe('computeSensitivity', () => {
    it('computes sensitivity = TP / (TP + FN)', () => {
      const result = computeSensitivity(standardMatrix);
      expect(result).toBeCloseTo(0.9, 4); // 90 / 100
    });

    it('returns 0 when TP + FN = 0', () => {
      expect(
        computeSensitivity({ truePositives: 0, falsePositives: 5, trueNegatives: 10, falseNegatives: 0 }),
      ).toBe(0);
    });

    it('returns 1.0 for perfect sensitivity', () => {
      expect(
        computeSensitivity({ truePositives: 50, falsePositives: 0, trueNegatives: 50, falseNegatives: 0 }),
      ).toBe(1);
    });
  });

  describe('computeSpecificity', () => {
    it('computes specificity = TN / (TN + FP)', () => {
      const result = computeSpecificity(standardMatrix);
      expect(result).toBeCloseTo(85 / 90, 4);
    });

    it('returns 0 when TN + FP = 0', () => {
      expect(
        computeSpecificity({ truePositives: 10, falsePositives: 0, trueNegatives: 0, falseNegatives: 5 }),
      ).toBe(0);
    });

    it('returns 1.0 for perfect specificity', () => {
      expect(
        computeSpecificity({ truePositives: 50, falsePositives: 0, trueNegatives: 50, falseNegatives: 0 }),
      ).toBe(1);
    });
  });

  describe('computeAccuracy', () => {
    it('computes accuracy = (TP + TN) / total', () => {
      const result = computeAccuracy(standardMatrix);
      expect(result).toBeCloseTo(175 / 190, 4);
    });

    it('returns 0 when total = 0', () => {
      expect(
        computeAccuracy({ truePositives: 0, falsePositives: 0, trueNegatives: 0, falseNegatives: 0 }),
      ).toBe(0);
    });
  });

  describe('computePPV', () => {
    it('computes PPV = TP / (TP + FP)', () => {
      const result = computePPV(standardMatrix);
      expect(result).toBeCloseTo(90 / 95, 4);
    });

    it('returns 0 when TP + FP = 0', () => {
      expect(
        computePPV({ truePositives: 0, falsePositives: 0, trueNegatives: 10, falseNegatives: 5 }),
      ).toBe(0);
    });
  });

  describe('computeNPV', () => {
    it('computes NPV = TN / (TN + FN)', () => {
      const result = computeNPV(standardMatrix);
      expect(result).toBeCloseTo(85 / 95, 4);
    });

    it('returns 0 when TN + FN = 0', () => {
      expect(
        computeNPV({ truePositives: 10, falsePositives: 5, trueNegatives: 0, falseNegatives: 0 }),
      ).toBe(0);
    });
  });

  describe('computeWilsonCI', () => {
    it('returns valid confidence interval', () => {
      const ci = computeWilsonCI(90, 100, 0.95);
      expect(ci.lower).toBeGreaterThan(0);
      expect(ci.upper).toBeLessThanOrEqual(1);
      expect(ci.lower).toBeLessThan(ci.upper);
      expect(ci.center).toBeGreaterThan(ci.lower);
      expect(ci.center).toBeLessThan(ci.upper);
    });

    it('returns narrower interval with larger sample size', () => {
      const smallCI = computeWilsonCI(9, 10, 0.95);
      const largeCI = computeWilsonCI(900, 1000, 0.95);
      const smallWidth = smallCI.upper - smallCI.lower;
      const largeWidth = largeCI.upper - largeCI.lower;
      expect(largeWidth).toBeLessThan(smallWidth);
    });

    it('returns {0,0,0} for zero total', () => {
      const ci = computeWilsonCI(0, 0);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBe(0);
      expect(ci.center).toBe(0);
    });

    it('lower bound is never negative', () => {
      const ci = computeWilsonCI(1, 100, 0.95);
      expect(ci.lower).toBeGreaterThanOrEqual(0);
    });

    it('upper bound is never greater than 1', () => {
      const ci = computeWilsonCI(99, 100, 0.95);
      expect(ci.upper).toBeLessThanOrEqual(1);
    });

    it('handles 99% confidence level', () => {
      const ci95 = computeWilsonCI(50, 100, 0.95);
      const ci99 = computeWilsonCI(50, 100, 0.99);
      const width95 = ci95.upper - ci95.lower;
      const width99 = ci99.upper - ci99.lower;
      expect(width99).toBeGreaterThan(width95);
    });
  });

  describe('buildConfusionMatrix', () => {
    it('builds correct matrix from predictions', () => {
      const predictions = [
        { groundTruth: 'POSITIVE', prediction: 'POSITIVE' },
        { groundTruth: 'POSITIVE', prediction: 'NEGATIVE' },
        { groundTruth: 'NEGATIVE', prediction: 'POSITIVE' },
        { groundTruth: 'NEGATIVE', prediction: 'NEGATIVE' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      expect(matrix.truePositives).toBe(1);
      expect(matrix.falseNegatives).toBe(1);
      expect(matrix.falsePositives).toBe(1);
      expect(matrix.trueNegatives).toBe(1);
    });

    it('handles custom positive label', () => {
      const predictions = [
        { groundTruth: 'YES', prediction: 'YES' },
        { groundTruth: 'NO', prediction: 'YES' },
      ];

      const matrix = buildConfusionMatrix(predictions, 'YES');
      expect(matrix.truePositives).toBe(1);
      expect(matrix.falsePositives).toBe(1);
    });

    it('handles empty predictions', () => {
      const matrix = buildConfusionMatrix([]);
      expect(matrix.truePositives).toBe(0);
      expect(matrix.falsePositives).toBe(0);
      expect(matrix.trueNegatives).toBe(0);
      expect(matrix.falseNegatives).toBe(0);
    });

    it('counts all predictions as TN when no positives', () => {
      const predictions = [
        { groundTruth: 'NEGATIVE', prediction: 'NEGATIVE' },
        { groundTruth: 'NEGATIVE', prediction: 'NEGATIVE' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      expect(matrix.trueNegatives).toBe(2);
      expect(matrix.truePositives).toBe(0);
    });
  });

  describe('computeStatistics', () => {
    it('computes all statistics from confusion matrix', () => {
      const result = computeStatistics(standardMatrix);

      expect(result.sensitivity).toBeCloseTo(0.9, 4);
      expect(result.specificity).toBeCloseTo(85 / 90, 4);
      expect(result.accuracy).toBeCloseTo(175 / 190, 4);
      expect(result.ppv).toBeCloseTo(90 / 95, 4);
      expect(result.npv).toBeCloseTo(85 / 95, 4);
      expect(result.sampleSize).toBe(190);
    });

    it('includes Wilson confidence intervals', () => {
      const result = computeStatistics(standardMatrix);

      expect(result.sensitivityCI.lower).toBeGreaterThan(0);
      expect(result.sensitivityCI.upper).toBeLessThanOrEqual(1);
      expect(result.specificityCI.lower).toBeGreaterThan(0);
      expect(result.specificityCI.upper).toBeLessThanOrEqual(1);
    });

    it('handles zero matrix gracefully', () => {
      const zeroMatrix: ConfusionMatrix = {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
      };

      const result = computeStatistics(zeroMatrix);
      expect(result.sensitivity).toBe(0);
      expect(result.specificity).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.sampleSize).toBe(0);
    });
  });
});
