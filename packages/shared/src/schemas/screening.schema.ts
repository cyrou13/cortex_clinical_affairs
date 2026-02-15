import { z } from 'zod';

// --- Screening Decision Enum ---

export const ScreeningDecisionEnum = z.enum(['INCLUDED', 'EXCLUDED', 'SKIPPED']);
export type ScreeningDecisionEnum = z.infer<typeof ScreeningDecisionEnum>;

// --- Screen Article Input ---

export const ScreenArticleInput = z.object({
  articleId: z.string().uuid('Valid article ID is required'),
  decision: ScreeningDecisionEnum,
  exclusionCodeId: z.string().uuid('Valid exclusion code ID is required').optional(),
  reason: z.string().min(1, 'Reason is required'),
});
export type ScreenArticleInput = z.infer<typeof ScreenArticleInput>;

// --- Bulk Screen Articles Input ---

export const BulkScreenArticlesInput = z.object({
  articleIds: z.array(z.string().uuid()).min(1, 'At least one article ID is required'),
  decision: ScreeningDecisionEnum,
  exclusionCodeId: z.string().uuid('Valid exclusion code ID is required').optional(),
  reason: z.string().min(1, 'Reason is required'),
});
export type BulkScreenArticlesInput = z.infer<typeof BulkScreenArticlesInput>;
