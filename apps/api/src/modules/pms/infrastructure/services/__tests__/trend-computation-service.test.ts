import { describe, it, expect } from 'vitest';
import { TrendComputationService } from '../trend-computation-service.js';

describe('TrendComputationService', () => {
  const service = new TrendComputationService();

  describe('calculateComplaintRate', () => {
    it('calculates complaint rate per 1000 devices per year', () => {
      const rate = service.calculateComplaintRate(10, 5000, 12);
      expect(rate).toBe(2); // (10/5000) * 1000 * 1 = 2
    });

    it('annualizes the rate based on period months', () => {
      const rate = service.calculateComplaintRate(5, 5000, 6);
      expect(rate).toBe(2); // (5/5000) * 1000 * 2 = 2
    });

    it('returns 0 when installed base is 0', () => {
      const rate = service.calculateComplaintRate(10, 0, 12);
      expect(rate).toBe(0);
    });
  });

  describe('detectSignificantChanges', () => {
    it('detects significant increase in complaint rate', () => {
      const currentData = {
        period: '2026-01-01 - 2026-03-31',
        complaintCount: 30,
        complaintRate: 6.0,
        incidentCount: 5,
        incidentRate: 1.0,
      };

      const previousData = {
        complaintCount: 10,
        complaintRate: 2.0,
        incidentCount: 2,
        incidentRate: 0.4,
      };

      const changes = service.detectSignificantChanges(currentData, previousData);

      expect(changes.length).toBeGreaterThan(0);
      const complaintRateChange = changes.find((c) => c.metric === 'Complaint Rate');
      expect(complaintRateChange).toBeDefined();
      expect(complaintRateChange?.changePercent).toBeGreaterThan(0);
      expect(complaintRateChange?.description).toContain('increased');
    });

    it('detects significant decrease in incident rate', () => {
      const currentData = {
        period: '2026-01-01 - 2026-03-31',
        complaintCount: 10,
        complaintRate: 2.0,
        incidentCount: 1,
        incidentRate: 0.2,
      };

      const previousData = {
        complaintCount: 10,
        complaintRate: 2.0,
        incidentCount: 8,
        incidentRate: 1.6,
      };

      const changes = service.detectSignificantChanges(currentData, previousData);

      const incidentRateChange = changes.find((c) => c.metric === 'Incident Rate');
      expect(incidentRateChange).toBeDefined();
      expect(incidentRateChange?.changePercent).toBeLessThan(0);
      expect(incidentRateChange?.description).toContain('decreased');
    });

    it('returns empty array when no previous data', () => {
      const currentData = {
        period: '2026-01-01 - 2026-03-31',
        complaintCount: 30,
        complaintRate: 6.0,
        incidentCount: 5,
        incidentRate: 1.0,
      };

      const changes = service.detectSignificantChanges(currentData, null);

      expect(changes).toEqual([]);
    });

    it('does not report insignificant changes below threshold', () => {
      const currentData = {
        period: '2026-01-01 - 2026-03-31',
        complaintCount: 10,
        complaintRate: 2.0,
        incidentCount: 2,
        incidentRate: 0.4,
      };

      const previousData = {
        complaintCount: 9,
        complaintRate: 1.9,
        incidentCount: 2,
        incidentRate: 0.4,
      };

      const changes = service.detectSignificantChanges(currentData, previousData);

      // Changes are less than 20% threshold, should not be reported
      expect(changes.length).toBe(0);
    });

    it('handles zero previous values correctly', () => {
      const currentData = {
        period: '2026-01-01 - 2026-03-31',
        complaintCount: 10,
        complaintRate: 2.0,
        incidentCount: 5,
        incidentRate: 1.0,
      };

      const previousData = {
        complaintCount: 0,
        complaintRate: 0,
        incidentCount: 0,
        incidentRate: 0,
      };

      const changes = service.detectSignificantChanges(currentData, previousData);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0]!.changePercent).toBe(100);
    });
  });

  describe('calculateSeverityDistribution', () => {
    it('calculates severity distribution from complaints', () => {
      const complaints = [
        { severity: 'LOW' },
        { severity: 'LOW' },
        { severity: 'MEDIUM' },
        { severity: 'HIGH' },
        { severity: 'LOW' },
      ];

      const distribution = service.calculateSeverityDistribution(complaints);

      expect(distribution).toEqual({
        LOW: 3,
        MEDIUM: 1,
        HIGH: 1,
      });
    });

    it('returns empty object for no complaints', () => {
      const distribution = service.calculateSeverityDistribution([]);
      expect(distribution).toEqual({});
    });
  });

  describe('calculateClassificationDistribution', () => {
    it('calculates classification distribution from complaints', () => {
      const complaints = [
        { classification: 'A01' },
        { classification: 'A01' },
        { classification: 'B02' },
        { classification: 'A01' },
      ];

      const distribution = service.calculateClassificationDistribution(complaints);

      expect(distribution).toEqual({
        A01: 3,
        B02: 1,
      });
    });
  });

  describe('calculateTimeSeries', () => {
    it('calculates monthly time series', () => {
      const complaints = [
        { date: new Date('2026-01-15') },
        { date: new Date('2026-01-20') },
        { date: new Date('2026-02-10') },
        { date: new Date('2026-03-05') },
        { date: new Date('2026-03-15') },
      ];

      const series = service.calculateTimeSeries(complaints, 'monthly');

      expect(series).toEqual([
        { period: '2026-01', count: 2 },
        { period: '2026-02', count: 1 },
        { period: '2026-03', count: 2 },
      ]);
    });

    it('calculates quarterly time series', () => {
      const complaints = [
        { date: new Date('2026-01-15') },
        { date: new Date('2026-02-20') },
        { date: new Date('2026-04-10') },
        { date: new Date('2026-07-05') },
      ];

      const series = service.calculateTimeSeries(complaints, 'quarterly');

      expect(series).toEqual([
        { period: '2026-Q1', count: 2 },
        { period: '2026-Q2', count: 1 },
        { period: '2026-Q3', count: 1 },
      ]);
    });
  });

  describe('custom threshold configuration', () => {
    it('respects custom threshold percent', () => {
      const customService = new TrendComputationService({ thresholdPercent: 50 });

      const currentData = {
        period: '2026-01-01 - 2026-03-31',
        complaintCount: 15,
        complaintRate: 3.0,
        incidentCount: 3,
        incidentRate: 0.6,
      };

      const previousData = {
        complaintCount: 10,
        complaintRate: 2.0,
        incidentCount: 2,
        incidentRate: 0.4,
      };

      const changes = customService.detectSignificantChanges(currentData, previousData);

      // 50% increase required, changes are only 50%, so should be reported
      expect(changes.length).toBeGreaterThan(0);
    });
  });
});
