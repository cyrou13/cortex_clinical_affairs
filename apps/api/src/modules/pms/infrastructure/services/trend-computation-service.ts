interface SignificantChange {
  metric: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  isSignificant: boolean;
  description: string;
}

interface TrendDataPoint {
  period: string;
  complaintCount: number;
  complaintRate: number;
  incidentCount: number;
  incidentRate: number;
}

interface PreviousCycleData {
  complaintCount: number;
  complaintRate: number;
  incidentCount: number;
  incidentRate: number;
}

export interface TrendComputationConfig {
  thresholdPercent?: number; // Default: 20%
  significancePValue?: number; // Default: 0.05
}

export class TrendComputationService {
  private readonly thresholdPercent: number;
  private readonly significancePValue: number;

  constructor(config: TrendComputationConfig = {}) {
    this.thresholdPercent = config.thresholdPercent ?? 20;
    this.significancePValue = config.significancePValue ?? 0.05;
  }

  /**
   * Calculate complaint rate per 1000 devices per year
   */
  calculateComplaintRate(
    complaintCount: number,
    installedBase: number,
    periodMonths: number,
  ): number {
    if (installedBase === 0) return 0;
    return (complaintCount / installedBase) * 1000 * (12 / periodMonths);
  }

  /**
   * Detect significant changes between current and previous period
   * Uses both threshold-based and statistical significance detection
   */
  detectSignificantChanges(
    currentData: TrendDataPoint,
    previousData: PreviousCycleData | null,
  ): SignificantChange[] {
    const changes: SignificantChange[] = [];

    if (!previousData) {
      return changes; // No previous data to compare
    }

    // Check complaint rate change
    const complaintRateChange = this.analyzeChange(
      'Complaint Rate',
      previousData.complaintRate,
      currentData.complaintRate,
      'complaints per 1000 devices',
    );
    if (complaintRateChange) {
      changes.push(complaintRateChange);
    }

    // Check incident rate change
    const incidentRateChange = this.analyzeChange(
      'Incident Rate',
      previousData.incidentRate,
      currentData.incidentRate,
      'incidents per 1000 devices',
    );
    if (incidentRateChange) {
      changes.push(incidentRateChange);
    }

    // Check complaint count change
    const complaintCountChange = this.analyzeChange(
      'Complaint Count',
      previousData.complaintCount,
      currentData.complaintCount,
      'complaints',
    );
    if (complaintCountChange) {
      changes.push(complaintCountChange);
    }

    // Check incident count change
    const incidentCountChange = this.analyzeChange(
      'Incident Count',
      previousData.incidentCount,
      currentData.incidentCount,
      'incidents',
    );
    if (incidentCountChange) {
      changes.push(incidentCountChange);
    }

    return changes;
  }

  /**
   * Analyze a single metric for significant change
   */
  private analyzeChange(
    metricName: string,
    previousValue: number,
    currentValue: number,
    unit: string,
  ): SignificantChange | null {
    if (previousValue === 0 && currentValue === 0) {
      return null; // No change to report
    }

    let changePercent: number;
    if (previousValue === 0) {
      changePercent = 100; // New occurrences
    } else {
      changePercent = ((currentValue - previousValue) / previousValue) * 100;
    }

    const absChangePercent = Math.abs(changePercent);
    const isSignificant = absChangePercent >= this.thresholdPercent;

    if (!isSignificant) {
      return null; // Not significant enough to report
    }

    // Statistical significance for count-based metrics using chi-square approximation
    const pValue = this.calculateProportionTestPValue(previousValue, currentValue);
    const isStatisticallySignificant = pValue < this.significancePValue;

    const direction = changePercent > 0 ? 'increased' : 'decreased';
    const description = `${metricName} ${direction} by ${Math.round(absChangePercent)}% compared to previous period (from ${Math.round(previousValue * 100) / 100} to ${Math.round(currentValue * 100) / 100} ${unit})${isStatisticallySignificant ? ` (p < ${this.significancePValue})` : ''}`;

    return {
      metric: metricName,
      previousValue: Math.round(previousValue * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      isSignificant: isSignificant && isStatisticallySignificant,
      description,
    };
  }

  /**
   * Simple proportion test p-value calculation using chi-square approximation
   * For MVP: simplified statistical test
   */
  private calculateProportionTestPValue(value1: number, value2: number): number {
    // For MVP, use a simplified approach
    // In production, this could use a proper chi-square or z-test
    const total = value1 + value2;
    if (total === 0) return 1.0;

    const expected = total / 2;
    const chiSquare =
      Math.pow(value1 - expected, 2) / expected + Math.pow(value2 - expected, 2) / expected;

    // Simplified p-value approximation for chi-square with 1 df
    // chiSquare > 3.84 corresponds to p < 0.05
    // chiSquare > 6.63 corresponds to p < 0.01
    if (chiSquare > 6.63) return 0.01;
    if (chiSquare > 3.84) return 0.04;
    return 0.1; // Not significant
  }

  /**
   * Calculate severity distribution from complaints
   */
  calculateSeverityDistribution(complaints: Array<{ severity: string }>): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const complaint of complaints) {
      distribution[complaint.severity] = (distribution[complaint.severity] ?? 0) + 1;
    }
    return distribution;
  }

  /**
   * Calculate classification distribution from complaints
   */
  calculateClassificationDistribution(
    complaints: Array<{ classification: string }>,
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const complaint of complaints) {
      distribution[complaint.classification] = (distribution[complaint.classification] ?? 0) + 1;
    }
    return distribution;
  }

  /**
   * Calculate time series data with granularity (monthly/quarterly)
   */
  calculateTimeSeries(
    complaints: Array<{ date: Date }>,
    granularity: 'monthly' | 'quarterly',
  ): Array<{ period: string; count: number }> {
    const series: Record<string, number> = {};

    for (const complaint of complaints) {
      const period = this.getPeriodKey(complaint.date, granularity);
      series[period] = (series[period] ?? 0) + 1;
    }

    return Object.entries(series)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private getPeriodKey(date: Date, granularity: 'monthly' | 'quarterly'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (granularity === 'monthly') {
      return `${year}-${month.toString().padStart(2, '0')}`;
    } else {
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    }
  }
}
