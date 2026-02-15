export const APP_NAME = 'Cortex Clinical Affairs' as const;
export const APP_VERSION = '0.1.0' as const;
export { UserRole, ROLE_HIERARCHY } from './roles.js';
export { ROLE_PERMISSIONS, hasPermission, getPermissionsForRole } from './permissions.js';
export { DEFAULT_EXCLUSION_CODES } from './exclusion-codes.js';
export {
  GRID_TEMPLATES,
  CLINICAL_SOA_TEMPLATE,
  DEVICE_SOA_TEMPLATE,
  SIMILAR_DEVICE_TEMPLATE,
  getTemplateById,
  getTemplatesForSoaType,
} from './extraction-grid-templates.js';
export type { GridColumnDefinition, GridTemplate } from './extraction-grid-templates.js';
export {
  GSPR_REQUIREMENTS,
  getGsprById,
  getGsprByChapter,
  getGsprForDeviceClass,
} from './gspr-requirements.js';
export type { GsprRequirement } from './gspr-requirements.js';
export {
  MDR_SECTIONS,
  getMdrSection,
  getMdrSectionsByUpstream,
} from './mdr-sections.js';
export type { MdrSection, UpstreamDataRequirement } from './mdr-sections.js';
