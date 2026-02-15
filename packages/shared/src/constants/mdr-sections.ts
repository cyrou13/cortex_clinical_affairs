export interface MdrSection {
  number: string;
  title: string;
  description: string;
  requiredUpstreamData: UpstreamDataRequirement[];
}

export interface UpstreamDataRequirement {
  moduleType: 'SLS' | 'SOA' | 'VALIDATION';
  dataType: string;
  description: string;
}

/**
 * MDR Annex XIV Part A — Clinical Evaluation Report sections
 * 14 sections as per MEDDEV 2.7/1 Rev 4 and MDR 2017/745
 */
export const MDR_SECTIONS: MdrSection[] = [
  {
    number: '1',
    title: 'Scope of the Clinical Evaluation',
    description:
      'Defines the scope, objectives, and context of the clinical evaluation including device description, intended purpose, and target patient population.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'device-description', description: 'Device description and intended purpose from SOA' },
    ],
  },
  {
    number: '2',
    title: 'Clinical Background and Current Knowledge',
    description:
      'Summarises the current knowledge and state of the art for the medical condition, alternative therapies, and similar devices.',
    requiredUpstreamData: [
      { moduleType: 'SLS', dataType: 'literature-results', description: 'Literature search results for clinical background' },
      { moduleType: 'SOA', dataType: 'state-of-art', description: 'State of the art analysis from SOA' },
    ],
  },
  {
    number: '3',
    title: 'Device Description and Specification',
    description:
      'Detailed technical description of the device, materials, design features, and intended function.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'device-specification', description: 'Device specification data from SOA' },
    ],
  },
  {
    number: '4',
    title: 'Intended Purpose and Indications',
    description:
      'Formal statement of intended purpose, medical indications, contraindications, and target patient groups.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'intended-purpose', description: 'Intended purpose and indications from SOA' },
    ],
  },
  {
    number: '5',
    title: 'Clinical Claims',
    description:
      'Lists all clinical claims made for the device, including performance claims, safety claims, and benefit claims.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'clinical-claims', description: 'Clinical claims extracted from SOA analysis' },
    ],
  },
  {
    number: '6',
    title: 'Literature Search Protocol and Results',
    description:
      'Documents the systematic literature search strategy, databases searched, inclusion/exclusion criteria, and search results.',
    requiredUpstreamData: [
      { moduleType: 'SLS', dataType: 'search-protocol', description: 'Search protocol and strategy from SLS' },
      { moduleType: 'SLS', dataType: 'search-results', description: 'Search results and article selection from SLS' },
    ],
  },
  {
    number: '7',
    title: 'Clinical Data from Literature — Appraisal and Analysis',
    description:
      'Critical appraisal of identified literature, data extraction, and analysis of clinical evidence.',
    requiredUpstreamData: [
      { moduleType: 'SLS', dataType: 'appraised-articles', description: 'Appraised literature data from SLS' },
      { moduleType: 'SOA', dataType: 'extraction-data', description: 'Extracted grid data from SOA' },
    ],
  },
  {
    number: '8',
    title: 'Equivalence Assessment',
    description:
      'Assessment of claimed equivalence with similar/predicate devices based on clinical, technical, and biological characteristics.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'equivalence-analysis', description: 'Equivalence comparison analysis from SOA' },
    ],
  },
  {
    number: '9',
    title: 'Clinical Data from Investigations',
    description:
      'Summary and analysis of data from clinical investigations, pre-market studies, and bench testing with clinical relevance.',
    requiredUpstreamData: [
      { moduleType: 'VALIDATION', dataType: 'study-results', description: 'Validation study results and statistical analysis' },
    ],
  },
  {
    number: '10',
    title: 'Post-Market Clinical Data',
    description:
      'Analysis of post-market surveillance data, vigilance reports, complaints, and post-market clinical follow-up data.',
    requiredUpstreamData: [
      { moduleType: 'SLS', dataType: 'pms-literature', description: 'Post-market literature from SLS' },
    ],
  },
  {
    number: '11',
    title: 'Benefit-Risk Analysis',
    description:
      'Comprehensive benefit-risk determination considering clinical benefits, risks, risk mitigation measures, and acceptable residual risks.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'benefit-risk-data', description: 'Benefit-risk data synthesis from SOA' },
      { moduleType: 'VALIDATION', dataType: 'safety-data', description: 'Safety and performance data from validation studies' },
    ],
  },
  {
    number: '12',
    title: 'GSPR Compliance',
    description:
      'Mapping of clinical evidence to General Safety and Performance Requirements (GSPR) demonstrating compliance with MDR Annex I.',
    requiredUpstreamData: [
      { moduleType: 'VALIDATION', dataType: 'gspr-mapping', description: 'GSPR requirement mapping from validation' },
      { moduleType: 'SOA', dataType: 'gspr-evidence', description: 'GSPR compliance evidence from SOA' },
    ],
  },
  {
    number: '13',
    title: 'Conclusions',
    description:
      'Overall conclusions of the clinical evaluation, confirmation of conformity, identification of residual risks, and recommendations for PMS/PMCF.',
    requiredUpstreamData: [
      { moduleType: 'SOA', dataType: 'conclusions', description: 'Thematic conclusions from SOA analysis' },
      { moduleType: 'VALIDATION', dataType: 'conclusions', description: 'Validation conclusions and recommendations' },
    ],
  },
  {
    number: '14',
    title: 'Date, Signature, and Qualifications of the Evaluators',
    description:
      'Identification of the clinical evaluation team, their qualifications, relevant experience, and formal sign-off.',
    requiredUpstreamData: [],
  },
];

export function getMdrSection(number: string): MdrSection | undefined {
  return MDR_SECTIONS.find((s) => s.number === number);
}

export function getMdrSectionsByUpstream(moduleType: 'SLS' | 'SOA' | 'VALIDATION'): MdrSection[] {
  return MDR_SECTIONS.filter((s) =>
    s.requiredUpstreamData.some((r) => r.moduleType === moduleType),
  );
}
