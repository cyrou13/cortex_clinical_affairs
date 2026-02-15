import { z } from 'zod';

export const LlmConfigLevel = z.enum(['SYSTEM', 'PROJECT', 'TASK']);
export type LlmConfigLevel = z.infer<typeof LlmConfigLevel>;

export const LlmTaskType = z.enum(['scoring', 'extraction', 'drafting', 'metadata_extraction']);
export type LlmTaskType = z.infer<typeof LlmTaskType>;

export const LlmProviderName = z.enum(['claude', 'openai', 'ollama']);
export type LlmProviderName = z.infer<typeof LlmProviderName>;

export const CreateLlmConfigInput = z.object({
  level: LlmConfigLevel,
  projectId: z.string().uuid().optional().nullable(),
  taskType: LlmTaskType.optional().nullable(),
  provider: LlmProviderName,
  model: z.string().min(1, 'Model name is required'),
}).refine(
  (data) => {
    if (data.level === 'PROJECT' && !data.projectId) {
      return false;
    }
    return true;
  },
  { message: 'projectId is required when level is PROJECT' },
).refine(
  (data) => {
    if (data.level === 'TASK' && !data.taskType) {
      return false;
    }
    return true;
  },
  { message: 'taskType is required when level is TASK' },
);
export type CreateLlmConfigInput = z.infer<typeof CreateLlmConfigInput>;

export const UpdateLlmConfigInput = z.object({
  provider: LlmProviderName.optional(),
  model: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    return data.provider !== undefined || data.model !== undefined || data.isActive !== undefined;
  },
  { message: 'At least one field must be provided for update' },
);
export type UpdateLlmConfigInput = z.infer<typeof UpdateLlmConfigInput>;

export const LlmCostSummary = z.object({
  totalCostUsd: z.number(),
  totalPromptTokens: z.number(),
  totalCompletionTokens: z.number(),
  byProvider: z.record(z.string(), z.object({
    costUsd: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    requestCount: z.number(),
  })),
  byTaskType: z.record(z.string(), z.object({
    costUsd: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    requestCount: z.number(),
  })),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});
export type LlmCostSummary = z.infer<typeof LlmCostSummary>;
