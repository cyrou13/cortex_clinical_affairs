import { describe, it, expect } from 'vitest';
import type { ArticleMetadata } from '@cortex/shared';
import {
  deduplicate,
  normalizeTitle,
  jaccardSimilarity,
} from './deduplication-service.js';

describe('normalizeTitle', () => {
  it('converts to lowercase', () => {
    expect(normalizeTitle('Hello World')).toBe('hello world');
  });

  it('removes punctuation except hyphens', () => {
    expect(normalizeTitle('Title: A (test) study.')).toBe('title a test study');
  });

  it('preserves hyphens', () => {
    expect(normalizeTitle('Cost-effectiveness analysis')).toBe(
      'cost-effectiveness analysis',
    );
  });

  it('collapses extra whitespace', () => {
    expect(normalizeTitle('Title   with   spaces')).toBe('title with spaces');
  });

  it('removes leading "The"', () => {
    expect(normalizeTitle('The effect of treatment')).toBe('effect of treatment');
  });

  it('removes leading "A"', () => {
    expect(normalizeTitle('A randomized trial')).toBe('randomized trial');
  });

  it('removes leading "An"', () => {
    expect(normalizeTitle('An experimental study')).toBe('experimental study');
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    const result = jaccardSimilarity('alpha beta gamma', 'delta epsilon zeta');
    expect(result).toBe(0);
  });

  it('returns value between 0 and 1 for partially similar strings', () => {
    const result = jaccardSimilarity(
      'randomized controlled trial of spinal fusion',
      'randomized controlled trial of lumbar fusion',
    );
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(jaccardSimilarity('', '')).toBe(1);
  });

  it('returns 0 when one string is empty', () => {
    expect(jaccardSimilarity('hello world', '')).toBe(0);
  });
});

describe('deduplicate', () => {
  const makeArticle = (overrides: Partial<ArticleMetadata> & { title: string }): ArticleMetadata => ({
    title: overrides.title,
    abstract: overrides.abstract,
    authors: overrides.authors,
    doi: overrides.doi,
    pmid: overrides.pmid,
    publicationDate: overrides.publicationDate,
    journal: overrides.journal,
    sourceDatabase: overrides.sourceDatabase,
  });

  describe('DOI matching', () => {
    it('detects duplicate by exact DOI match', () => {
      const existing = [makeArticle({ title: 'Article A', doi: '10.1234/test' })];
      const incoming = [makeArticle({ title: 'Article B', doi: '10.1234/test' })];

      const result = deduplicate(incoming, existing);

      expect(result.uniqueArticles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.matchType).toBe('doi');
      expect(result.stats.duplicatesByDoi).toBe(1);
    });

    it('is case-insensitive for DOI matching', () => {
      const existing = [makeArticle({ title: 'Article A', doi: '10.1234/TEST' })];
      const incoming = [makeArticle({ title: 'Article B', doi: '10.1234/test' })];

      const result = deduplicate(incoming, existing);
      expect(result.duplicates).toHaveLength(1);
      expect(result.stats.duplicatesByDoi).toBe(1);
    });

    it('trims whitespace in DOI comparison', () => {
      const existing = [makeArticle({ title: 'Article A', doi: '10.1234/test ' })];
      const incoming = [makeArticle({ title: 'Article B', doi: ' 10.1234/test' })];

      const result = deduplicate(incoming, existing);
      expect(result.duplicates).toHaveLength(1);
    });
  });

  describe('PMID matching', () => {
    it('detects duplicate by exact PMID match', () => {
      const existing = [makeArticle({ title: 'Article A', pmid: '12345678' })];
      const incoming = [makeArticle({ title: 'Article B', pmid: '12345678' })];

      const result = deduplicate(incoming, existing);

      expect(result.uniqueArticles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.matchType).toBe('pmid');
      expect(result.stats.duplicatesByPmid).toBe(1);
    });

    it('does not match different PMIDs', () => {
      const existing = [makeArticle({ title: 'Article A', pmid: '12345678' })];
      const incoming = [makeArticle({ title: 'Article B', pmid: '87654321' })];

      const result = deduplicate(incoming, existing);
      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('title fuzzy matching', () => {
    it('detects duplicate by similar title with same author and year', () => {
      const existing = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          authors: ['Smith J', 'Doe A'],
          publicationDate: '2024-01-15',
        }),
      ];
      const incoming = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          authors: ['Smith J', 'Doe A'],
          publicationDate: '2024-03-20',
        }),
      ];

      const result = deduplicate(incoming, existing);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.matchType).toBe('title');
      expect(result.stats.duplicatesByTitle).toBe(1);
    });

    it('does not match when author differs', () => {
      const existing = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          authors: ['Smith J'],
          publicationDate: '2024-01-15',
        }),
      ];
      const incoming = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          authors: ['Johnson K'],
          publicationDate: '2024-03-20',
        }),
      ];

      const result = deduplicate(incoming, existing);
      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });

    it('does not match when year differs', () => {
      const existing = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          authors: ['Smith J'],
          publicationDate: '2023-01-15',
        }),
      ];
      const incoming = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          authors: ['Smith J'],
          publicationDate: '2024-03-20',
        }),
      ];

      const result = deduplicate(incoming, existing);
      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });

    it('does not match when title similarity is too low', () => {
      const existing = [
        makeArticle({
          title: 'Cardiac surgery outcomes in elderly patients',
          authors: ['Smith J'],
          publicationDate: '2024-01-15',
        }),
      ];
      const incoming = [
        makeArticle({
          title: 'Spinal fusion effectiveness in young adults',
          authors: ['Smith J'],
          publicationDate: '2024-03-20',
        }),
      ];

      const result = deduplicate(incoming, existing);
      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });

    it('does not match when authors are missing', () => {
      const existing = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          publicationDate: '2024-01-15',
        }),
      ];
      const incoming = [
        makeArticle({
          title: 'Effectiveness of spinal fusion in degenerative disc disease patients',
          publicationDate: '2024-03-20',
        }),
      ];

      const result = deduplicate(incoming, existing);
      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('priority order', () => {
    it('DOI match takes priority over PMID match', () => {
      const existing = [
        makeArticle({
          title: 'Article A',
          doi: '10.1234/test',
          pmid: '12345678',
        }),
      ];
      const incoming = [
        makeArticle({
          title: 'Article B',
          doi: '10.1234/test',
          pmid: '12345678',
        }),
      ];

      const result = deduplicate(incoming, existing);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.matchType).toBe('doi');
      // Only counted once via DOI
      expect(result.stats.duplicatesByDoi).toBe(1);
      expect(result.stats.duplicatesByPmid).toBe(0);
    });
  });

  describe('within-batch deduplication', () => {
    it('deduplicates articles within the same incoming batch', () => {
      const incoming = [
        makeArticle({ title: 'Article A', doi: '10.1234/test' }),
        makeArticle({ title: 'Article B', doi: '10.1234/test' }),
      ];

      const result = deduplicate(incoming, []);

      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(1);
      expect(result.stats.duplicatesByDoi).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty new articles array', () => {
      const result = deduplicate([], [makeArticle({ title: 'Existing' })]);
      expect(result.uniqueArticles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.stats.totalBefore).toBe(1);
      expect(result.stats.totalAfter).toBe(1);
    });

    it('handles empty existing articles array', () => {
      const result = deduplicate(
        [makeArticle({ title: 'New Article' })],
        [],
      );
      expect(result.uniqueArticles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });

    it('handles both arrays empty', () => {
      const result = deduplicate([], []);
      expect(result.uniqueArticles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.stats.totalBefore).toBe(0);
      expect(result.stats.totalAfter).toBe(0);
    });

    it('handles articles with missing optional fields', () => {
      const incoming = [
        makeArticle({ title: 'Standalone article' }),
        makeArticle({ title: 'Another standalone article' }),
      ];

      const result = deduplicate(incoming, []);
      expect(result.uniqueArticles).toHaveLength(2);
      expect(result.duplicates).toHaveLength(0);
    });

    it('correctly computes stats', () => {
      const existing = [
        makeArticle({ title: 'E1', doi: '10.1/a' }),
        makeArticle({ title: 'E2', pmid: '111' }),
      ];
      const incoming = [
        makeArticle({ title: 'N1', doi: '10.1/a' }), // DOI dup
        makeArticle({ title: 'N2', pmid: '111' }),    // PMID dup
        makeArticle({ title: 'N3 unique article' }),   // unique
      ];

      const result = deduplicate(incoming, existing);

      expect(result.stats.totalBefore).toBe(5); // 3 new + 2 existing
      expect(result.stats.totalAfter).toBe(3);  // 1 unique + 2 existing
      expect(result.stats.duplicatesByDoi).toBe(1);
      expect(result.stats.duplicatesByPmid).toBe(1);
      expect(result.stats.duplicatesByTitle).toBe(0);
    });
  });
});
