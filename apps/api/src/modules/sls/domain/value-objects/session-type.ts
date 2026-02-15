import type { SlsSessionType } from '@cortex/shared';

export interface ScopeFieldDefinition {
  name: string;
  label: string;
  required: boolean;
  description: string;
}

const SOA_CLINICAL_FIELDS: ScopeFieldDefinition[] = [
  { name: 'indication', label: 'Indication', required: true, description: 'Clinical indication for the device' },
  { name: 'population', label: 'Population', required: true, description: 'Target patient population' },
  { name: 'intervention', label: 'Intervention', required: true, description: 'Device or treatment intervention' },
  { name: 'comparator', label: 'Comparator', required: false, description: 'Comparator device or treatment' },
  { name: 'outcomes', label: 'Outcomes', required: true, description: 'Expected clinical outcomes' },
];

const SOA_DEVICE_FIELDS: ScopeFieldDefinition[] = [
  { name: 'deviceName', label: 'Device Name', required: true, description: 'Name of the device under evaluation' },
  { name: 'deviceClass', label: 'Device Class', required: true, description: 'Regulatory device classification' },
  { name: 'intendedPurpose', label: 'Intended Purpose', required: true, description: 'Intended purpose of the device' },
  { name: 'keyPerformanceEndpoints', label: 'Key Performance Endpoints', required: false, description: 'Key performance and safety endpoints' },
];

const SIMILAR_DEVICE_FIELDS: ScopeFieldDefinition[] = [
  { name: 'deviceCategory', label: 'Device Category', required: true, description: 'Category of similar devices' },
  { name: 'equivalenceCriteria', label: 'Equivalence Criteria', required: true, description: 'Criteria for establishing equivalence' },
  { name: 'searchDatabases', label: 'Search Databases', required: false, description: 'Databases to search for similar devices' },
];

const PMS_UPDATE_FIELDS: ScopeFieldDefinition[] = [
  { name: 'dateRange', label: 'Date Range', required: true, description: 'Date range for the PMS update search' },
  { name: 'updateScope', label: 'Update Scope', required: true, description: 'Scope of the PMS update' },
  { name: 'previousSlsReference', label: 'Previous SLS Reference', required: false, description: 'Reference to the previous SLS session' },
];

const AD_HOC_FIELDS: ScopeFieldDefinition[] = [
  { name: 'description', label: 'Description', required: true, description: 'Description of the ad-hoc search' },
  { name: 'searchObjective', label: 'Search Objective', required: true, description: 'Objective of the search' },
];

const SCOPE_FIELDS_MAP: Record<SlsSessionType, ScopeFieldDefinition[]> = {
  SOA_CLINICAL: SOA_CLINICAL_FIELDS,
  SOA_DEVICE: SOA_DEVICE_FIELDS,
  SIMILAR_DEVICE: SIMILAR_DEVICE_FIELDS,
  PMS_UPDATE: PMS_UPDATE_FIELDS,
  AD_HOC: AD_HOC_FIELDS,
};

export function getScopeFieldsForType(type: SlsSessionType): ScopeFieldDefinition[] {
  return SCOPE_FIELDS_MAP[type];
}
