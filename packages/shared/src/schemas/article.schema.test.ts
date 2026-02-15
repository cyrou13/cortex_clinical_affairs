import { describe, it, expect } from 'vitest';
import { ArticleMetadata, ArticleFilter, ImportArticlesInput } from './article.schema.js';
import { ArticleStatusEnum } from './sls-session.schema.js';

describe('ArticleStatusEnum', () => {
  it.each([
    'PENDING',
    'SCORED',
    'INCLUDED',
    'EXCLUDED',
    'SKIPPED',
    'FULL_TEXT_REVIEW',
    'FINAL_INCLUDED',
    'FINAL_EXCLUDED',
  ])('accepts %s', (value) => {
    expect(ArticleStatusEnum.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(ArticleStatusEnum.safeParse('DRAFT').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(ArticleStatusEnum.safeParse('').success).toBe(false);
  });
});

describe('ArticleMetadata schema', () => {
  const validMetadata = {
    title: 'Effectiveness of spinal fusion devices in adults',
    abstract: 'Background: Spinal fusion...',
    authors: ['Smith J', 'Doe A'],
    doi: '10.1234/example.2024',
    pmid: '12345678',
    publicationDate: '2024-01-15',
    journal: 'Journal of Orthopaedic Research',
    sourceDatabase: 'PUBMED',
  };

  it('accepts valid complete metadata', () => {
    const result = ArticleMetadata.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it('accepts metadata with only title (minimum required)', () => {
    const result = ArticleMetadata.safeParse({ title: 'A simple title' });
    expect(result.success).toBe(true);
  });

  it('rejects metadata without title', () => {
    const { title: _, ...noTitle } = validMetadata;
    const result = ArticleMetadata.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = ArticleMetadata.safeParse({ ...validMetadata, title: '' });
    expect(result.success).toBe(false);
  });

  it('accepts metadata without abstract', () => {
    const { abstract: _, ...rest } = validMetadata;
    const result = ArticleMetadata.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts metadata without authors', () => {
    const { authors: _, ...rest } = validMetadata;
    const result = ArticleMetadata.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts metadata with empty authors array', () => {
    const result = ArticleMetadata.safeParse({ ...validMetadata, authors: [] });
    expect(result.success).toBe(true);
  });

  it('accepts metadata without doi', () => {
    const { doi: _, ...rest } = validMetadata;
    const result = ArticleMetadata.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts metadata without pmid', () => {
    const { pmid: _, ...rest } = validMetadata;
    const result = ArticleMetadata.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects non-string authors array items', () => {
    const result = ArticleMetadata.safeParse({ ...validMetadata, authors: [123, 456] });
    expect(result.success).toBe(false);
  });
});

describe('ArticleFilter schema', () => {
  it('accepts valid filter with all fields', () => {
    const result = ArticleFilter.safeParse({
      status: 'PENDING',
      yearFrom: 2020,
      yearTo: 2024,
      sourceDatabase: 'PUBMED',
      searchText: 'spinal fusion',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty filter', () => {
    const result = ArticleFilter.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts filter with only status', () => {
    const result = ArticleFilter.safeParse({ status: 'SCORED' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = ArticleFilter.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects yearFrom below 1900', () => {
    const result = ArticleFilter.safeParse({ yearFrom: 1800 });
    expect(result.success).toBe(false);
  });

  it('rejects yearTo above 2100', () => {
    const result = ArticleFilter.safeParse({ yearTo: 2200 });
    expect(result.success).toBe(false);
  });

  it('accepts filter with only searchText', () => {
    const result = ArticleFilter.safeParse({ searchText: 'cardiac' });
    expect(result.success).toBe(true);
  });
});

describe('ImportArticlesInput schema', () => {
  const validInput = {
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    queryId: '660e8400-e29b-41d4-a716-446655440000',
    executionId: '770e8400-e29b-41d4-a716-446655440000',
    articles: [{ title: 'Test article' }],
  };

  it('accepts valid input', () => {
    const result = ImportArticlesInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid sessionId', () => {
    const result = ImportArticlesInput.safeParse({ ...validInput, sessionId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid queryId', () => {
    const result = ImportArticlesInput.safeParse({ ...validInput, queryId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid executionId', () => {
    const result = ImportArticlesInput.safeParse({ ...validInput, executionId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty articles array', () => {
    const result = ImportArticlesInput.safeParse({ ...validInput, articles: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing articles', () => {
    const { articles: _, ...rest } = validInput;
    const result = ImportArticlesInput.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
