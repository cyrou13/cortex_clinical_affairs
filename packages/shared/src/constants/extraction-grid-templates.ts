export interface GridColumnDefinition {
  name: string;
  displayName: string;
  dataType: 'TEXT' | 'NUMERIC' | 'BOOLEAN' | 'DATE' | 'ENUM';
  isRequired: boolean;
  orderIndex: number;
}

export interface GridTemplate {
  id: string;
  name: string;
  soaType: string;
  description?: string;
  isBuiltIn: boolean;
  columns: GridColumnDefinition[];
}

export const CLINICAL_SOA_TEMPLATE: GridTemplate = {
  id: 'tpl-clinical-default',
  name: 'Clinical SOA — Default',
  soaType: 'CLINICAL',
  description:
    'Standard clinical evidence extraction grid with study design, population, outcomes, and limitations columns.',
  isBuiltIn: true,
  columns: [
    { name: 'author', displayName: 'Author', dataType: 'TEXT', isRequired: true, orderIndex: 0 },
    { name: 'year', displayName: 'Year', dataType: 'NUMERIC', isRequired: true, orderIndex: 1 },
    {
      name: 'study_design',
      displayName: 'Study Design',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 2,
    },
    {
      name: 'population_n',
      displayName: 'Population (N)',
      dataType: 'NUMERIC',
      isRequired: false,
      orderIndex: 3,
    },
    {
      name: 'population_desc',
      displayName: 'Population Description',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 4,
    },
    {
      name: 'intervention',
      displayName: 'Intervention',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 5,
    },
    {
      name: 'comparator',
      displayName: 'Comparator',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 6,
    },
    {
      name: 'primary_outcome',
      displayName: 'Primary Outcome',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 7,
    },
    {
      name: 'secondary_outcomes',
      displayName: 'Secondary Outcomes',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 8,
    },
    {
      name: 'followup_period',
      displayName: 'Follow-up Period',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 9,
    },
    {
      name: 'key_findings',
      displayName: 'Key Findings',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 10,
    },
    {
      name: 'limitations',
      displayName: 'Limitations',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 11,
    },
  ],
};

export const DEVICE_SOA_TEMPLATE: GridTemplate = {
  id: 'tpl-device-default',
  name: 'Device SOA — Default',
  soaType: 'SIMILAR_DEVICE',
  description:
    'Device performance evaluation grid with sensitivity, specificity, PPV, NPV, and AUC metrics.',
  isBuiltIn: true,
  columns: [
    { name: 'author', displayName: 'Author', dataType: 'TEXT', isRequired: true, orderIndex: 0 },
    { name: 'year', displayName: 'Year', dataType: 'NUMERIC', isRequired: true, orderIndex: 1 },
    {
      name: 'device_model',
      displayName: 'Device Model',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 2,
    },
    {
      name: 'indication',
      displayName: 'Indication',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 3,
    },
    {
      name: 'study_type',
      displayName: 'Study Type',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 4,
    },
    {
      name: 'population_n',
      displayName: 'Population (N)',
      dataType: 'NUMERIC',
      isRequired: false,
      orderIndex: 5,
    },
    {
      name: 'sensitivity',
      displayName: 'Sensitivity',
      dataType: 'NUMERIC',
      isRequired: false,
      orderIndex: 6,
    },
    {
      name: 'specificity',
      displayName: 'Specificity',
      dataType: 'NUMERIC',
      isRequired: false,
      orderIndex: 7,
    },
    { name: 'ppv', displayName: 'PPV', dataType: 'NUMERIC', isRequired: false, orderIndex: 8 },
    { name: 'npv', displayName: 'NPV', dataType: 'NUMERIC', isRequired: false, orderIndex: 9 },
    { name: 'auc', displayName: 'AUC', dataType: 'NUMERIC', isRequired: false, orderIndex: 10 },
    {
      name: 'key_findings',
      displayName: 'Key Findings',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 11,
    },
  ],
};

export const SIMILAR_DEVICE_TEMPLATE: GridTemplate = {
  id: 'tpl-similar-device',
  name: 'Similar Device Comparison',
  soaType: 'SIMILAR_DEVICE',
  description:
    'Comparison grid for similar devices with manufacturer, endpoint, and result columns.',
  isBuiltIn: true,
  columns: [
    { name: 'author', displayName: 'Author', dataType: 'TEXT', isRequired: true, orderIndex: 0 },
    { name: 'year', displayName: 'Year', dataType: 'NUMERIC', isRequired: true, orderIndex: 1 },
    {
      name: 'device_name',
      displayName: 'Device Name',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 2,
    },
    {
      name: 'manufacturer',
      displayName: 'Manufacturer',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 3,
    },
    {
      name: 'study_type',
      displayName: 'Study Type',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 4,
    },
    {
      name: 'population_n',
      displayName: 'Population (N)',
      dataType: 'NUMERIC',
      isRequired: false,
      orderIndex: 5,
    },
    {
      name: 'primary_endpoint',
      displayName: 'Primary Endpoint',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 6,
    },
    { name: 'result', displayName: 'Result', dataType: 'TEXT', isRequired: false, orderIndex: 7 },
    {
      name: 'comparator',
      displayName: 'Comparator',
      dataType: 'TEXT',
      isRequired: false,
      orderIndex: 8,
    },
  ],
};

export const GRID_TEMPLATES: GridTemplate[] = [
  CLINICAL_SOA_TEMPLATE,
  DEVICE_SOA_TEMPLATE,
  SIMILAR_DEVICE_TEMPLATE,
];

export function getTemplateById(templateId: string): GridTemplate | undefined {
  return GRID_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplatesForSoaType(soaType: string): GridTemplate[] {
  return GRID_TEMPLATES.filter((t) => t.soaType === soaType);
}
