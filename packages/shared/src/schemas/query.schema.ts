import { z } from 'zod';

// --- Input schemas ---

export const CreateQueryInput = z.object({
  name: z.string().min(1, 'Query name is required'),
  queryString: z.string().min(1, 'Query string is required'),
  sessionId: z.string().uuid('Valid session ID is required'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});
export type CreateQueryInput = z.infer<typeof CreateQueryInput>;

export const UpdateQueryInput = z.object({
  queryString: z.string().min(1, 'Query string is required'),
  dateFrom: z.string().datetime().optional().nullable(),
  dateTo: z.string().datetime().optional().nullable(),
});
export type UpdateQueryInput = z.infer<typeof UpdateQueryInput>;

export const GenerateQueryFromTextInput = z.object({
  sessionId: z.string().uuid('Valid session ID is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});
export type GenerateQueryFromTextInput = z.infer<typeof GenerateQueryFromTextInput>;

// --- Validation result type ---

export interface BooleanQueryValidationResult {
  valid: boolean;
  errors: string[];
}
