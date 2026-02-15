export const SOA_TYPES = ['CLINICAL', 'SIMILAR_DEVICE', 'ALTERNATIVE'] as const;
export type SoaType = (typeof SOA_TYPES)[number];

const CLINICAL_SECTIONS = [
  { key: 'CLINICAL_1', title: 'Scope & Objectives', orderIndex: 0 },
  { key: 'CLINICAL_2', title: 'Clinical Background & State of the Art', orderIndex: 1 },
  { key: 'CLINICAL_3', title: 'Clinical Data from Literature', orderIndex: 2 },
  { key: 'CLINICAL_4', title: 'Clinical Data from Post-Market Experience', orderIndex: 3 },
  { key: 'CLINICAL_5', title: 'Clinical Data Analysis & Synthesis', orderIndex: 4 },
  { key: 'CLINICAL_6', title: 'Conclusions & Residual Risks', orderIndex: 5 },
] as const;

const DEVICE_SECTIONS = [
  { key: 'DEVICE_1', title: 'Device Description & Intended Purpose', orderIndex: 0 },
  { key: 'DEVICE_2', title: 'Similar Device Identification', orderIndex: 1 },
  { key: 'DEVICE_3', title: 'Performance Benchmarks', orderIndex: 2 },
  { key: 'DEVICE_4', title: 'Comparison Analysis', orderIndex: 3 },
  { key: 'DEVICE_5', title: 'Equivalence Conclusions', orderIndex: 4 },
] as const;

const ALTERNATIVE_SECTIONS = [
  { key: 'ALT_1', title: 'Treatment Landscape', orderIndex: 0 },
  { key: 'ALT_2', title: 'Alternative Therapies Review', orderIndex: 1 },
  { key: 'ALT_3', title: 'Comparative Effectiveness', orderIndex: 2 },
  { key: 'ALT_4', title: 'Risk-Benefit Analysis', orderIndex: 3 },
] as const;

export function getSectionsForType(type: SoaType) {
  switch (type) {
    case 'CLINICAL':
      return [...CLINICAL_SECTIONS];
    case 'SIMILAR_DEVICE':
      return [...DEVICE_SECTIONS];
    case 'ALTERNATIVE':
      return [...ALTERNATIVE_SECTIONS];
  }
}

export function isValidSoaType(value: string): value is SoaType {
  return SOA_TYPES.includes(value as SoaType);
}
