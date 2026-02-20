import type { ArticleStatusEnum } from '@cortex/shared';

/**
 * Valid article lifecycle state transitions:
 *   PENDING -> SCORED | INCLUDED | EXCLUDED | SKIPPED
 *   SCORED -> INCLUDED | EXCLUDED | SKIPPED
 *   INCLUDED -> FULL_TEXT_REVIEW
 *   FULL_TEXT_REVIEW -> FINAL_INCLUDED | FINAL_EXCLUDED
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['SCORED', 'INCLUDED', 'EXCLUDED', 'SKIPPED'],
  SCORED: ['INCLUDED', 'EXCLUDED', 'SKIPPED'],
  INCLUDED: ['FULL_TEXT_REVIEW'],
  FULL_TEXT_REVIEW: ['FINAL_INCLUDED', 'FINAL_EXCLUDED'],
  // Terminal states: EXCLUDED, SKIPPED, FINAL_INCLUDED, FINAL_EXCLUDED have no transitions
  EXCLUDED: [],
  SKIPPED: [],
  FINAL_INCLUDED: [],
  FINAL_EXCLUDED: [],
};

export interface ArticleData {
  id: string;
  sessionId: string;
  title: string;
  abstract: string | null;
  authors: unknown;
  doi: string | null;
  pmid: string | null;
  publicationDate: Date | null;
  journal: string | null;
  sourceDatabase: string | null;
  status: string;
  relevanceScore: number | null;
  aiExclusionCode: string | null;
  customFilterScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validate whether a status transition is allowed.
 */
export function validateTransition(
  fromStatus: ArticleStatusEnum,
  toStatus: ArticleStatusEnum,
): boolean {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Transition an article to a new status with validation.
 * Returns the fields to update if valid, or throws if the transition is invalid.
 */
export function transitionStatus(
  article: ArticleData,
  newStatus: ArticleStatusEnum,
  _userId: string,
  _reason?: string,
): { status: string; updatedAt: Date } {
  if (!validateTransition(article.status as ArticleStatusEnum, newStatus)) {
    throw new Error(`Invalid status transition from ${article.status} to ${newStatus}`);
  }

  return {
    status: newStatus,
    updatedAt: new Date(),
  };
}
