import { z } from 'zod';

// --- Enums ---

export const DatabaseSource = z.enum(['PUBMED', 'PMC', 'GOOGLE_SCHOLAR', 'CLINICAL_TRIALS']);
export type DatabaseSource = z.infer<typeof DatabaseSource>;

export const ExecutionStatus = z.enum(['RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED']);
export type ExecutionStatus = z.infer<typeof ExecutionStatus>;

// --- Input schemas ---

export const ExecuteQueryInput = z.object({
  queryId: z.string().uuid('Valid query ID is required'),
  databases: z.array(DatabaseSource).min(1, 'At least one database must be selected'),
  sessionId: z.string().uuid('Valid session ID is required'),
});
export type ExecuteQueryInput = z.infer<typeof ExecuteQueryInput>;

// --- Result type ---

export interface QueryExecutionResult {
  id: string;
  queryId: string;
  database: string;
  status: string;
  articlesFound: number;
  articlesImported: number;
  reproducibilityStatement: string | null;
  errorMessage: string | null;
  executedAt: Date;
  completedAt: Date | null;
}
