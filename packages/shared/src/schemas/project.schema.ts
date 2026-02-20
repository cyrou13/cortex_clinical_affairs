import { z } from 'zod';

export const DeviceClass = z.enum(['I', 'IIa', 'IIb', 'III']);
export type DeviceClass = z.infer<typeof DeviceClass>;

export const RegulatoryContext = z.enum(['CE_MDR', 'FDA_510K', 'BOTH']);
export type RegulatoryContext = z.infer<typeof RegulatoryContext>;

export const ModuleStatus = z.enum(['NOT_STARTED', 'ACTIVE', 'COMPLETED', 'LOCKED', 'BLOCKED']);
export type ModuleStatus = z.infer<typeof ModuleStatus>;

export const CreateProjectInput = z.object({
  name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be at most 100 characters'),
  deviceName: z.string().min(1, 'Device name is required'),
  deviceClass: DeviceClass,
  regulatoryContext: RegulatoryContext,
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const ConfigureCepInput = z.object({
  scope: z.string().optional(),
  objectives: z.string().optional(),
  deviceClassification: z.string().optional(),
  clinicalBackground: z.string().optional(),
  searchStrategy: z.string().optional(),
});
export type ConfigureCepInput = z.infer<typeof ConfigureCepInput>;

export const UpdateProjectInput = z.object({
  name: z.string().min(3).max(100).optional(),
  deviceName: z.string().min(1).optional(),
  deviceClass: DeviceClass.optional(),
  regulatoryContext: RegulatoryContext.optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

export interface PipelineStatus {
  sls: ModuleStatus;
  soa: ModuleStatus;
  validation: ModuleStatus;
  cer: ModuleStatus;
  pms: ModuleStatus;
}

export function getDefaultPipelineStatus(): PipelineStatus {
  return {
    sls: 'NOT_STARTED',
    soa: 'NOT_STARTED',
    validation: 'NOT_STARTED',
    cer: 'NOT_STARTED',
    pms: 'NOT_STARTED',
  };
}
