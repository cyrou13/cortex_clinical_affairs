import { describe, it, expect } from 'vitest';
import { PdfLocationService } from './pdf-location-service.js';

describe('PdfLocationService', () => {
  describe('buildDeepLink', () => {
    it('builds URL with article ID and page', () => {
      const result = PdfLocationService.buildDeepLink('art-1', { page: 5 });
      expect(result.url).toContain('articleId=art-1');
      expect(result.url).toContain('page=5');
      expect(result.page).toBe(5);
    });

    it('includes highlight text when provided', () => {
      const result = PdfLocationService.buildDeepLink('art-1', {
        page: 3,
        highlightText: 'significant improvement',
      });
      expect(result.url).toContain('highlight=significant');
    });

    it('omits highlight when not provided', () => {
      const result = PdfLocationService.buildDeepLink('art-1', { page: 1 });
      expect(result.url).not.toContain('highlight');
    });
  });

  describe('mapConfidenceScore', () => {
    it('returns HIGH for score >= 80', () => {
      expect(PdfLocationService.mapConfidenceScore(80)).toBe('HIGH');
      expect(PdfLocationService.mapConfidenceScore(100)).toBe('HIGH');
    });

    it('returns MEDIUM for score 50-79', () => {
      expect(PdfLocationService.mapConfidenceScore(50)).toBe('MEDIUM');
      expect(PdfLocationService.mapConfidenceScore(79)).toBe('MEDIUM');
    });

    it('returns LOW for score < 50', () => {
      expect(PdfLocationService.mapConfidenceScore(0)).toBe('LOW');
      expect(PdfLocationService.mapConfidenceScore(49)).toBe('LOW');
    });
  });

  describe('parseLocationData', () => {
    it('parses valid location data', () => {
      const result = PdfLocationService.parseLocationData({ page: 3, highlightText: 'test' });
      expect(result).toEqual({ page: 3, highlightText: 'test', textOffset: undefined });
    });

    it('returns null for invalid data', () => {
      expect(PdfLocationService.parseLocationData(null)).toBeNull();
      expect(PdfLocationService.parseLocationData({})).toBeNull();
      expect(PdfLocationService.parseLocationData('string')).toBeNull();
    });

    it('handles partial data', () => {
      const result = PdfLocationService.parseLocationData({ page: 1 });
      expect(result).toEqual({ page: 1, textOffset: undefined, highlightText: undefined });
    });
  });
});
