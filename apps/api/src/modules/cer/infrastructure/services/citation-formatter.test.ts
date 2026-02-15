import { describe, it, expect } from 'vitest';
import { CitationFormatterService, type ArticleMetadata } from './citation-formatter.js';

const formatter = new CitationFormatterService();

const FULL_ARTICLE: ArticleMetadata = {
  title: 'Clinical Performance of AI-based Diagnostic System',
  authors: ['Smith J', 'Doe A', 'Johnson B'],
  journal: 'Journal of Medical Devices',
  year: 2025,
  volume: '12',
  issue: '3',
  pages: '45-52',
  doi: '10.1234/jmd.2025.001',
};

describe('CitationFormatterService', () => {
  describe('Vancouver style', () => {
    it('formats complete article in Vancouver style', () => {
      const result = formatter.format(FULL_ARTICLE, 'VANCOUVER');

      expect(result).toContain('Smith J, Doe A, Johnson B.');
      expect(result).toContain('Clinical Performance of AI-based Diagnostic System.');
      expect(result).toContain('Journal of Medical Devices.');
      expect(result).toContain('2025;12(3):45-52.');
      expect(result).toContain('DOI: 10.1234/jmd.2025.001.');
    });

    it('formats article without DOI', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, doi: undefined };
      const result = formatter.formatVancouver(article);

      expect(result).not.toContain('DOI');
    });

    it('formats article without volume/issue', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, volume: undefined, issue: undefined };
      const result = formatter.formatVancouver(article);

      expect(result).toContain('2025');
      expect(result).not.toContain(';');
    });

    it('formats article without pages', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, pages: undefined };
      const result = formatter.formatVancouver(article);

      expect(result).not.toContain(':45-52');
    });

    it('uses et al. for more than 6 authors', () => {
      const article: ArticleMetadata = {
        ...FULL_ARTICLE,
        authors: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
      };
      const result = formatter.formatVancouver(article);

      expect(result).toContain('et al.');
      expect(result).not.toContain('A7');
    });

    it('handles single author', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, authors: ['Smith J'] };
      const result = formatter.formatVancouver(article);

      expect(result).toContain('Smith J.');
    });

    it('handles empty authors', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, authors: [] };
      const result = formatter.formatVancouver(article);

      expect(result).toContain('Clinical Performance');
    });
  });

  describe('Author-Year style', () => {
    it('formats complete article in Author-Year style', () => {
      const result = formatter.format(FULL_ARTICLE, 'AUTHOR_YEAR');

      expect(result).toContain('Smith J et al. (2025).');
      expect(result).toContain('Clinical Performance of AI-based Diagnostic System.');
      expect(result).toContain('Journal of Medical Devices, 12(3), 45-52.');
    });

    it('formats two authors with &', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, authors: ['Smith J', 'Doe A'] };
      const result = formatter.formatAuthorYear(article);

      expect(result).toContain('Smith J & Doe A (2025).');
    });

    it('formats single author without &', () => {
      const article: ArticleMetadata = { ...FULL_ARTICLE, authors: ['Smith J'] };
      const result = formatter.formatAuthorYear(article);

      expect(result).toContain('Smith J (2025).');
    });

    it('includes DOI when present', () => {
      const result = formatter.formatAuthorYear(FULL_ARTICLE);

      expect(result).toContain('DOI: 10.1234/jmd.2025.001.');
    });
  });

  describe('format method', () => {
    it('throws for unknown style', () => {
      expect(() => formatter.format(FULL_ARTICLE, 'UNKNOWN' as any)).toThrow(
        'Unknown citation style',
      );
    });

    it('delegates to Vancouver formatter', () => {
      const vancouver = formatter.format(FULL_ARTICLE, 'VANCOUVER');
      const direct = formatter.formatVancouver(FULL_ARTICLE);
      expect(vancouver).toBe(direct);
    });

    it('delegates to Author-Year formatter', () => {
      const ay = formatter.format(FULL_ARTICLE, 'AUTHOR_YEAR');
      const direct = formatter.formatAuthorYear(FULL_ARTICLE);
      expect(ay).toBe(direct);
    });
  });
});
