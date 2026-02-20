import { describe, it, expect } from 'vitest';
import { validateTransition, transitionStatus, type ArticleData } from './article.js';

function makeArticle(overrides?: Partial<ArticleData>): ArticleData {
  return {
    id: 'article-1',
    sessionId: 'session-1',
    title: 'Test Article',
    abstract: null,
    authors: null,
    doi: null,
    pmid: null,
    publicationDate: null,
    journal: null,
    sourceDatabase: null,
    status: 'PENDING',
    relevanceScore: null,
    aiExclusionCode: null,
    customFilterScore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('validateTransition', () => {
  it('allows PENDING -> SCORED', () => {
    expect(validateTransition('PENDING', 'SCORED')).toBe(true);
  });

  it('allows SCORED -> INCLUDED', () => {
    expect(validateTransition('SCORED', 'INCLUDED')).toBe(true);
  });

  it('allows SCORED -> EXCLUDED', () => {
    expect(validateTransition('SCORED', 'EXCLUDED')).toBe(true);
  });

  it('allows SCORED -> SKIPPED', () => {
    expect(validateTransition('SCORED', 'SKIPPED')).toBe(true);
  });

  it('allows INCLUDED -> FULL_TEXT_REVIEW', () => {
    expect(validateTransition('INCLUDED', 'FULL_TEXT_REVIEW')).toBe(true);
  });

  it('allows FULL_TEXT_REVIEW -> FINAL_INCLUDED', () => {
    expect(validateTransition('FULL_TEXT_REVIEW', 'FINAL_INCLUDED')).toBe(true);
  });

  it('allows FULL_TEXT_REVIEW -> FINAL_EXCLUDED', () => {
    expect(validateTransition('FULL_TEXT_REVIEW', 'FINAL_EXCLUDED')).toBe(true);
  });

  it('allows PENDING -> INCLUDED (manual screening bypass)', () => {
    expect(validateTransition('PENDING', 'INCLUDED')).toBe(true);
  });

  it('rejects EXCLUDED -> anything (terminal state)', () => {
    expect(validateTransition('EXCLUDED', 'PENDING')).toBe(false);
    expect(validateTransition('EXCLUDED', 'SCORED')).toBe(false);
    expect(validateTransition('EXCLUDED', 'INCLUDED')).toBe(false);
  });

  it('rejects FINAL_INCLUDED -> anything (terminal state)', () => {
    expect(validateTransition('FINAL_INCLUDED', 'PENDING')).toBe(false);
    expect(validateTransition('FINAL_INCLUDED', 'FULL_TEXT_REVIEW')).toBe(false);
  });

  it('rejects FINAL_EXCLUDED -> anything (terminal state)', () => {
    expect(validateTransition('FINAL_EXCLUDED', 'PENDING')).toBe(false);
  });

  it('rejects SKIPPED -> anything (terminal state)', () => {
    expect(validateTransition('SKIPPED', 'SCORED')).toBe(false);
  });

  it('rejects SCORED -> FULL_TEXT_REVIEW (must go through INCLUDED)', () => {
    expect(validateTransition('SCORED', 'FULL_TEXT_REVIEW')).toBe(false);
  });

  it('rejects INCLUDED -> EXCLUDED (wrong path)', () => {
    expect(validateTransition('INCLUDED', 'EXCLUDED')).toBe(false);
  });
});

describe('transitionStatus', () => {
  it('returns updated fields for valid transition', () => {
    const article = makeArticle({ status: 'PENDING' });
    const result = transitionStatus(article, 'SCORED', 'user-1');

    expect(result.status).toBe('SCORED');
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('throws for invalid transition', () => {
    const article = makeArticle({ status: 'PENDING' });

    expect(() => transitionStatus(article, 'FULL_TEXT_REVIEW', 'user-1')).toThrow(
      'Invalid status transition from PENDING to FULL_TEXT_REVIEW',
    );
  });

  it('handles the full happy-path lifecycle', () => {
    let article = makeArticle({ status: 'PENDING' });

    // PENDING -> SCORED
    const r1 = transitionStatus(article, 'SCORED', 'user-1');
    expect(r1.status).toBe('SCORED');
    article = makeArticle({ ...article, ...r1 });

    // SCORED -> INCLUDED
    const r2 = transitionStatus(article, 'INCLUDED', 'user-1');
    expect(r2.status).toBe('INCLUDED');
    article = makeArticle({ ...article, ...r2 });

    // INCLUDED -> FULL_TEXT_REVIEW
    const r3 = transitionStatus(article, 'FULL_TEXT_REVIEW', 'user-1');
    expect(r3.status).toBe('FULL_TEXT_REVIEW');
    article = makeArticle({ ...article, ...r3 });

    // FULL_TEXT_REVIEW -> FINAL_INCLUDED
    const r4 = transitionStatus(article, 'FINAL_INCLUDED', 'user-1');
    expect(r4.status).toBe('FINAL_INCLUDED');
  });

  it('throws when transitioning from terminal EXCLUDED state', () => {
    const article = makeArticle({ status: 'EXCLUDED' });

    expect(() => transitionStatus(article, 'PENDING', 'user-1')).toThrow(
      'Invalid status transition',
    );
  });
});
