import { z } from 'zod';

// --- Enums ---

export const SlsSessionType = z.enum([
  'SOA_CLINICAL',
  'SOA_DEVICE',
  'SIMILAR_DEVICE',
  'PMS_UPDATE',
  'AD_HOC',
]);
export type SlsSessionType = z.infer<typeof SlsSessionType>;

export const SlsSessionStatus = z.enum(['DRAFT', 'SCREENING', 'LOCKED']);
export type SlsSessionStatus = z.infer<typeof SlsSessionStatus>;

export const ArticleStatusEnum = z.enum([
  'PENDING',
  'SCORED',
  'INCLUDED',
  'EXCLUDED',
  'SKIPPED',
  'FULL_TEXT_REVIEW',
  'FINAL_INCLUDED',
  'FINAL_EXCLUDED',
]);
export type ArticleStatusEnum = z.infer<typeof ArticleStatusEnum>;

// --- Scope field schemas per session type ---

export const SoaClinicalScopeFields = z.object({
  indication: z.string().min(1, 'Indication is required'),
  population: z.string().min(1, 'Population is required'),
  intervention: z.string().min(1, 'Intervention is required'),
  comparator: z.string().optional(),
  outcomes: z.string().min(1, 'Outcomes are required'),
});
export type SoaClinicalScopeFields = z.infer<typeof SoaClinicalScopeFields>;

export const SoaDeviceScopeFields = z.object({
  deviceName: z.string().min(1, 'Device name is required'),
  deviceClass: z.string().min(1, 'Device class is required'),
  intendedPurpose: z.string().min(1, 'Intended purpose is required'),
  keyPerformanceEndpoints: z.string().optional(),
});
export type SoaDeviceScopeFields = z.infer<typeof SoaDeviceScopeFields>;

export const SimilarDeviceScopeFields = z.object({
  deviceCategory: z.string().min(1, 'Device category is required'),
  equivalenceCriteria: z.string().min(1, 'Equivalence criteria is required'),
  searchDatabases: z.string().optional(),
});
export type SimilarDeviceScopeFields = z.infer<typeof SimilarDeviceScopeFields>;

export const PmsUpdateScopeFields = z.object({
  dateRange: z.string().min(1, 'Date range is required'),
  updateScope: z.string().min(1, 'Update scope is required'),
  previousSlsReference: z.string().optional(),
});
export type PmsUpdateScopeFields = z.infer<typeof PmsUpdateScopeFields>;

export const AdHocScopeFields = z.object({
  description: z.string().min(1, 'Description is required'),
  searchObjective: z.string().min(1, 'Search objective is required'),
});
export type AdHocScopeFields = z.infer<typeof AdHocScopeFields>;

// --- Input schemas ---

export const CreateSlsSessionInput = z.object({
  name: z
    .string()
    .min(3, 'Session name must be at least 3 characters')
    .max(200, 'Session name must be at most 200 characters'),
  type: SlsSessionType,
  projectId: z.string().uuid('Valid project ID is required'),
  scopeFields: z.record(z.string(), z.unknown()).optional(),
});
export type CreateSlsSessionInput = z.infer<typeof CreateSlsSessionInput>;

export const UpdateSlsSessionInput = z.object({
  name: z
    .string()
    .min(3, 'Session name must be at least 3 characters')
    .max(200, 'Session name must be at most 200 characters')
    .optional(),
  scopeFields: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateSlsSessionInput = z.infer<typeof UpdateSlsSessionInput>;
