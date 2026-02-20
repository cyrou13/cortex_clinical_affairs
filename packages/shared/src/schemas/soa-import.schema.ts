import { z } from 'zod';

// --- Extracted entity schemas ---

export const ExtractedArticle = z.object({
  tempId: z.string(),
  title: z.string(),
  authors: z.string().optional(),
  publicationYear: z.number().optional(),
  doi: z.string().optional(),
  pmid: z.string().optional(),
  journal: z.string().optional(),
  abstract: z.string().optional(),
});
export type ExtractedArticle = z.infer<typeof ExtractedArticle>;

export const ExtractedSection = z.object({
  sectionKey: z.string(),
  title: z.string(),
  orderIndex: z.number(),
  narrativeContent: z.string().optional(),
});
export type ExtractedSection = z.infer<typeof ExtractedSection>;

export const ExtractedGridColumn = z.object({
  name: z.string(),
  displayName: z.string(),
  dataType: z.string().default('TEXT'),
  isRequired: z.boolean().default(false),
  orderIndex: z.number(),
});
export type ExtractedGridColumn = z.infer<typeof ExtractedGridColumn>;

export const ExtractedGridCell = z.object({
  articleTempId: z.string(),
  columnName: z.string(),
  value: z.string().optional(),
  sourceQuote: z.string().optional(),
});
export type ExtractedGridCell = z.infer<typeof ExtractedGridCell>;

export const ExtractedClaim = z.object({
  statementText: z.string(),
  thematicSectionKey: z.string().optional(),
  articleTempIds: z.array(z.string()),
  sourceQuote: z.string().optional(),
});
export type ExtractedClaim = z.infer<typeof ExtractedClaim>;

export const ExtractedBenchmark = z.object({
  metricName: z.string(),
  metricValue: z.string(),
  unit: z.string(),
  sourceDescription: z.string().optional(),
});
export type ExtractedBenchmark = z.infer<typeof ExtractedBenchmark>;

export const ExtractedDevice = z.object({
  deviceName: z.string(),
  manufacturer: z.string(),
  indication: z.string(),
  regulatoryStatus: z.string(),
  benchmarks: z.array(ExtractedBenchmark),
});
export type ExtractedDevice = z.infer<typeof ExtractedDevice>;

export const ExtractedQualityAssessment = z.object({
  articleTempId: z.string(),
  assessmentType: z.enum(['QUADAS_2', 'INTERNAL_READING_GRID']),
  assessmentData: z.record(z.string(), z.unknown()),
  dataContributionLevel: z.enum(['PIVOTAL', 'SUPPORTIVE', 'BACKGROUND']),
});
export type ExtractedQualityAssessment = z.infer<typeof ExtractedQualityAssessment>;

// --- SLS session schemas ---

export const ExtractedSlsQuery = z.object({
  name: z.string(),
  queryString: z.string(),
  databases: z.array(z.string()),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type ExtractedSlsQuery = z.infer<typeof ExtractedSlsQuery>;

export const ExtractedExclusionCode = z.object({
  code: z.string(),
  label: z.string(),
  shortCode: z.string(),
  description: z.string().optional(),
});
export type ExtractedExclusionCode = z.infer<typeof ExtractedExclusionCode>;

export const ExtractedSlsSession = z.object({
  type: z.enum(['SOA_CLINICAL', 'SOA_DEVICE']),
  name: z.string(),
  scopeFields: z.record(z.string(), z.unknown()),
  queries: z.array(ExtractedSlsQuery),
  exclusionCodes: z.array(ExtractedExclusionCode),
  articleTempIds: z.array(z.string()),
});
export type ExtractedSlsSession = z.infer<typeof ExtractedSlsSession>;

// --- Composite schemas ---

export const SoaExtractedData = z.object({
  soaType: z.enum(['CLINICAL', 'SIMILAR_DEVICE', 'ALTERNATIVE']),
  articles: z.array(ExtractedArticle),
  sections: z.array(ExtractedSection),
  gridColumns: z.array(ExtractedGridColumn),
  gridCells: z.array(ExtractedGridCell),
  claims: z.array(ExtractedClaim),
  similarDevices: z.array(ExtractedDevice),
  qualityAssessments: z.array(ExtractedQualityAssessment),
  slsSessions: z.array(ExtractedSlsSession).default([]),
});
export type SoaExtractedData = z.infer<typeof SoaExtractedData>;

export const GapReportItem = z.object({
  category: z.string(),
  description: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW', 'INFO']),
  count: z.number().optional(),
  details: z.string().optional(),
});
export type GapReportItem = z.infer<typeof GapReportItem>;

export const GapReport = z.object({
  items: z.array(GapReportItem),
  summary: z.object({
    totalGaps: z.number(),
    highCount: z.number(),
    mediumCount: z.number(),
    lowCount: z.number(),
    infoCount: z.number(),
  }),
  generatedAt: z.string(),
});
export type GapReport = z.infer<typeof GapReport>;

// --- Input schemas ---

export const ImportSoaDocumentInput = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().min(1),
  fileContent: z.string().min(1),
  fileFormat: z.enum(['PDF', 'DOCX']),
});
export type ImportSoaDocumentInput = z.infer<typeof ImportSoaDocumentInput>;

export const ConfirmSoaImportInput = z.object({
  importId: z.string().uuid(),
  editedData: SoaExtractedData.optional(),
});
export type ConfirmSoaImportInput = z.infer<typeof ConfirmSoaImportInput>;
