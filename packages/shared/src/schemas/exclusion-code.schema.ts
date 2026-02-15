import { z } from 'zod';

// --- Exclusion Code schemas ---

export const AddExclusionCodeInput = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Code must contain only alphanumeric characters and underscores'),
  label: z
    .string()
    .min(1, 'Label is required')
    .max(100, 'Label must be at most 100 characters'),
  shortCode: z
    .string()
    .regex(/^E[1-9][0-9]?$/, 'Short code must follow the pattern E1-E99'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});
export type AddExclusionCodeInput = z.infer<typeof AddExclusionCodeInput>;

export const RenameExclusionCodeInput = z.object({
  label: z
    .string()
    .min(1, 'Label is required')
    .max(100, 'Label must be at most 100 characters'),
  shortCode: z
    .string()
    .regex(/^E[1-9][0-9]?$/, 'Short code must follow the pattern E1-E99')
    .optional(),
});
export type RenameExclusionCodeInput = z.infer<typeof RenameExclusionCodeInput>;

export const ReorderExclusionCodesInput = z.object({
  orderedIds: z
    .array(z.string().uuid('Each ID must be a valid UUID'))
    .min(1, 'At least one ID is required'),
});
export type ReorderExclusionCodesInput = z.infer<typeof ReorderExclusionCodesInput>;

export const ConfigureThresholdsInput = z
  .object({
    likelyRelevantThreshold: z
      .number()
      .int('Threshold must be an integer')
      .min(0, 'Threshold must be between 0 and 100')
      .max(100, 'Threshold must be between 0 and 100'),
    uncertainLowerThreshold: z
      .number()
      .int('Threshold must be an integer')
      .min(0, 'Threshold must be between 0 and 100')
      .max(100, 'Threshold must be between 0 and 100'),
  })
  .refine(
    (data) => data.uncertainLowerThreshold < data.likelyRelevantThreshold,
    {
      message: 'uncertainLowerThreshold must be less than likelyRelevantThreshold',
      path: ['uncertainLowerThreshold'],
    },
  );
export type ConfigureThresholdsInput = z.infer<typeof ConfigureThresholdsInput>;

// --- Custom AI Filter schemas ---

export const CreateCustomAiFilterInput = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  criterion: z
    .string()
    .min(1, 'Criterion is required')
    .max(2000, 'Criterion must be at most 2000 characters'),
});
export type CreateCustomAiFilterInput = z.infer<typeof CreateCustomAiFilterInput>;

export const UpdateCustomAiFilterInput = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  criterion: z
    .string()
    .min(1, 'Criterion is required')
    .max(2000, 'Criterion must be at most 2000 characters')
    .optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCustomAiFilterInput = z.infer<typeof UpdateCustomAiFilterInput>;
