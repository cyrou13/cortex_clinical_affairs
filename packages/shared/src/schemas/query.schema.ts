import { z } from 'zod';

// --- Input schemas ---

export const CreateQueryInput = z.object({
  name: z.string().min(1, 'Query name is required'),
  queryString: z.string().min(1, 'Query string is required'),
  sessionId: z.string().uuid('Valid session ID is required'),
});
export type CreateQueryInput = z.infer<typeof CreateQueryInput>;

export const UpdateQueryInput = z.object({
  queryString: z.string().min(1, 'Query string is required'),
});
export type UpdateQueryInput = z.infer<typeof UpdateQueryInput>;

// --- Validation result type ---

export interface BooleanQueryValidationResult {
  valid: boolean;
  errors: string[];
}
