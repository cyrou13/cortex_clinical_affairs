import { builder } from '../../../graphql/builder.js';

// --- SOA Enums ---

export const SoaTypeEnum = builder.enumType('SoaType', {
  values: ['CLINICAL', 'SIMILAR_DEVICE', 'ALTERNATIVE'] as const,
});

export const SoaStatusEnum = builder.enumType('SoaStatus', {
  values: ['DRAFT', 'IN_PROGRESS', 'LOCKED'] as const,
});

// --- SOA Analysis type ---

export const SoaAnalysisObjectType = builder.objectRef<{
  id: string;
  projectId: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lockedAt: Date | null;
  lockedById: string | null;
}>('SoaAnalysis');

builder.objectType(SoaAnalysisObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    name: t.exposeString('name'),
    type: t.exposeString('type'),
    status: t.exposeString('status'),
    description: t.exposeString('description', { nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    lockedAt: t.expose('lockedAt', { type: 'DateTime', nullable: true }),
    lockedById: t.exposeString('lockedById', { nullable: true }),
  }),
});

// --- SOA SLS Link type ---

export const SoaSlsLinkObjectType = builder.objectRef<{
  id: string;
  soaAnalysisId: string;
  slsSessionId: string;
  createdAt: Date;
}>('SoaSlsLink');

builder.objectType(SoaSlsLinkObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    slsSessionId: t.exposeString('slsSessionId'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// --- Thematic Section type ---

export const ThematicSectionObjectType = builder.objectRef<{
  id: string;
  soaAnalysisId: string;
  sectionKey: string;
  title: string;
  narrativeContent: string | null;
  narrativeAiDraft: unknown;
  status: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}>('ThematicSection');

builder.objectType(ThematicSectionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    sectionKey: t.exposeString('sectionKey'),
    title: t.exposeString('title'),
    narrativeContent: t.exposeString('narrativeContent', { nullable: true }),
    narrativeAiDraft: t.expose('narrativeAiDraft', { type: 'JSON', nullable: true }),
    status: t.exposeString('status'),
    orderIndex: t.exposeInt('orderIndex'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// --- Create SOA Result type ---

export const CreateSoaResultType = builder.objectRef<{
  soaAnalysisId: string;
  name: string;
  type: string;
  sectionCount: number;
}>('CreateSoaResult');

builder.objectType(CreateSoaResultType, {
  fields: (t) => ({
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    name: t.exposeString('name'),
    type: t.exposeString('type'),
    sectionCount: t.exposeInt('sectionCount'),
  }),
});

// --- Link SLS Sessions Result type ---

export const LinkSlsSessionsResultType = builder.objectRef<{
  linkedCount: number;
  skippedCount: number;
}>('LinkSlsSessionsResult');

builder.objectType(LinkSlsSessionsResultType, {
  fields: (t) => ({
    linkedCount: t.exposeInt('linkedCount'),
    skippedCount: t.exposeInt('skippedCount'),
  }),
});

// --- Dependency Check Result type ---

export const DependencyCheckResultType = builder.objectRef<{
  canProceed: boolean;
  warnings: string[];
}>('DependencyCheckResult');

builder.objectType(DependencyCheckResultType, {
  fields: (t) => ({
    canProceed: t.exposeBoolean('canProceed'),
    warnings: t.exposeStringList('warnings'),
  }),
});

// --- SOA Progress type ---

export const SoaProgressType = builder.objectRef<{
  totalSections: number;
  draftCount: number;
  inProgressCount: number;
  finalizedCount: number;
}>('SoaProgress');

builder.objectType(SoaProgressType, {
  fields: (t) => ({
    totalSections: t.exposeInt('totalSections'),
    draftCount: t.exposeInt('draftCount'),
    inProgressCount: t.exposeInt('inProgressCount'),
    finalizedCount: t.exposeInt('finalizedCount'),
  }),
});

// --- Extraction Grid type (Story 3.2) ---

export const ExtractionGridObjectType = builder.objectRef<{
  id: string;
  soaAnalysisId: string;
  thematicSectionId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}>('ExtractionGrid');

builder.objectType(ExtractionGridObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    thematicSectionId: t.exposeString('thematicSectionId', { nullable: true }),
    name: t.exposeString('name'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const GridColumnObjectType = builder.objectRef<{
  id: string;
  extractionGridId: string;
  name: string;
  displayName: string;
  dataType: string;
  orderIndex: number;
  isRequired: boolean;
}>('GridColumn');

builder.objectType(GridColumnObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    extractionGridId: t.exposeString('extractionGridId'),
    name: t.exposeString('name'),
    displayName: t.exposeString('displayName'),
    dataType: t.exposeString('dataType'),
    orderIndex: t.exposeInt('orderIndex'),
    isRequired: t.exposeBoolean('isRequired'),
  }),
});

export const GridCellObjectType = builder.objectRef<{
  id: string;
  extractionGridId: string;
  articleId: string;
  gridColumnId: string;
  value: string | null;
  aiExtractedValue: string | null;
  confidenceLevel: string | null;
  sourceQuote: string | null;
  sourcePageNumber: number | null;
  pdfLocationData: unknown;
  validationStatus: string;
  validatedById: string | null;
  validatedAt: string | null;
}>('GridCell');

builder.objectType(GridCellObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    extractionGridId: t.exposeString('extractionGridId'),
    articleId: t.exposeString('articleId'),
    gridColumnId: t.exposeString('gridColumnId'),
    value: t.exposeString('value', { nullable: true }),
    aiExtractedValue: t.exposeString('aiExtractedValue', { nullable: true }),
    confidenceLevel: t.exposeString('confidenceLevel', { nullable: true }),
    sourceQuote: t.exposeString('sourceQuote', { nullable: true }),
    sourcePageNumber: t.exposeInt('sourcePageNumber', { nullable: true }),
    pdfLocationData: t.expose('pdfLocationData', { type: 'JSON', nullable: true }),
    validationStatus: t.exposeString('validationStatus'),
    validatedById: t.exposeString('validatedById', { nullable: true }),
    validatedAt: t.exposeString('validatedAt', { nullable: true }),
  }),
});

export const CreateGridResultType = builder.objectRef<{
  gridId: string;
  columnCount: number;
}>('CreateGridResult');

builder.objectType(CreateGridResultType, {
  fields: (t) => ({
    gridId: t.exposeString('gridId'),
    columnCount: t.exposeInt('columnCount'),
  }),
});

export const PopulateGridRowsResultType = builder.objectRef<{
  gridId: string;
  articleCount: number;
  cellCount: number;
}>('PopulateGridRowsResult');

builder.objectType(PopulateGridRowsResultType, {
  fields: (t) => ({
    gridId: t.exposeString('gridId'),
    articleCount: t.exposeInt('articleCount'),
    cellCount: t.exposeInt('cellCount'),
  }),
});

export const UpdateCellResultType = builder.objectRef<{
  cellId: string;
  value: string | null;
  validationStatus: string;
}>('UpdateCellResult');

builder.objectType(UpdateCellResultType, {
  fields: (t) => ({
    cellId: t.exposeString('cellId'),
    value: t.exposeString('value', { nullable: true }),
    validationStatus: t.exposeString('validationStatus'),
  }),
});

// --- AI Extraction Result type (Story 3.3) ---

export const ExtractGridDataResultType = builder.objectRef<{
  taskId: string;
  articleCount: number;
  columnCount: number;
}>('ExtractGridDataResult');

builder.objectType(ExtractGridDataResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    articleCount: t.exposeInt('articleCount'),
    columnCount: t.exposeInt('columnCount'),
  }),
});

// --- Cell Validation Result type (Story 3.4) ---

export const CellValidationResultType = builder.objectRef<{
  cellId: string;
  status: string;
  value?: string;
  reason?: string;
}>('CellValidationResult');

builder.objectType(CellValidationResultType, {
  fields: (t) => ({
    cellId: t.exposeString('cellId'),
    status: t.exposeString('status'),
    value: t.exposeString('value', { nullable: true }),
    reason: t.exposeString('reason', { nullable: true }),
  }),
});

// --- Article Extraction Status type (Story 3.5) ---

export const ArticleExtractionStatusType = builder.objectRef<{
  articleId: string;
  status: string;
  totalCells: number;
  validatedCells: number;
  flaggedCells: number;
}>('ArticleExtractionStatus');

builder.objectType(ArticleExtractionStatusType, {
  fields: (t) => ({
    articleId: t.exposeString('articleId'),
    status: t.exposeString('status'),
    totalCells: t.exposeInt('totalCells'),
    validatedCells: t.exposeInt('validatedCells'),
    flaggedCells: t.exposeInt('flaggedCells'),
  }),
});

export const GridExtractionProgressType = builder.objectRef<{
  gridId: string;
  totalArticles: number;
  counts: unknown;
  overallPercentage: number;
}>('GridExtractionProgress');

builder.objectType(GridExtractionProgressType, {
  fields: (t) => ({
    gridId: t.exposeString('gridId'),
    totalArticles: t.exposeInt('totalArticles'),
    counts: t.expose('counts', { type: 'JSON' }),
    overallPercentage: t.exposeInt('overallPercentage'),
  }),
});

// --- Quality Assessment type (Story 3.6) ---

export const QualityAssessmentObjectType = builder.objectRef<{
  id: string;
  soaAnalysisId: string;
  articleId: string;
  assessmentType: string;
  assessmentData: unknown;
  dataContributionLevel: string;
  assessedById: string;
  assessedAt: string;
}>('QualityAssessment');

builder.objectType(QualityAssessmentObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    articleId: t.exposeString('articleId'),
    assessmentType: t.exposeString('assessmentType'),
    assessmentData: t.expose('assessmentData', { type: 'JSON' }),
    dataContributionLevel: t.exposeString('dataContributionLevel'),
    assessedById: t.exposeString('assessedById'),
    assessedAt: t.exposeString('assessedAt'),
  }),
});

export const AssessQualityResultType = builder.objectRef<{
  qualityAssessmentId: string;
  assessmentType: string;
  dataContributionLevel: string;
}>('AssessQualityResult');

builder.objectType(AssessQualityResultType, {
  fields: (t) => ({
    qualityAssessmentId: t.exposeString('qualityAssessmentId'),
    assessmentType: t.exposeString('assessmentType'),
    dataContributionLevel: t.exposeString('dataContributionLevel'),
  }),
});

export const QualitySummaryType = builder.objectRef<{
  totalAssessments: number;
  quadas2Count: number;
  readingGridCount: number;
  contributionLevels: {
    pivotal: number;
    supportive: number;
    background: number;
  };
}>('QualitySummary');

builder.objectType(QualitySummaryType, {
  fields: (t) => ({
    totalAssessments: t.exposeInt('totalAssessments'),
    quadas2Count: t.exposeInt('quadas2Count'),
    readingGridCount: t.exposeInt('readingGridCount'),
    contributionLevels: t.expose('contributionLevels', { type: 'JSON' }),
  }),
});

// --- Article Quality Assessment type (AI-generated) ---

export const ArticleQualityAssessmentObjectType = builder.objectRef<{
  id: string;
  extractionGridId: string;
  articleId: string;
  overallQuality: string;
  overallScore: number;
  criteriaScores: unknown;
  strengths: unknown;
  weaknesses: unknown;
  recommendation: string | null;
  createdAt: Date;
  updatedAt: Date;
}>('ArticleQualityAssessment');

builder.objectType(ArticleQualityAssessmentObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    extractionGridId: t.exposeString('extractionGridId'),
    articleId: t.exposeString('articleId'),
    overallQuality: t.exposeString('overallQuality'),
    overallScore: t.exposeInt('overallScore'),
    criteriaScores: t.expose('criteriaScores', { type: 'JSON', nullable: true }),
    strengths: t.expose('strengths', { type: 'JSON', nullable: true }),
    weaknesses: t.expose('weaknesses', { type: 'JSON', nullable: true }),
    recommendation: t.exposeString('recommendation', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const BatchAssessQualityResultType = builder.objectRef<{
  taskId: string;
  articleCount: number;
}>('BatchAssessQualityResult');

builder.objectType(BatchAssessQualityResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    articleCount: t.exposeInt('articleCount'),
  }),
});

// --- Section Management Result types (Story 3.7) ---

export const UpdateSectionContentResultType = builder.objectRef<{
  sectionId: string;
  status: string;
  updatedAt: string;
}>('UpdateSectionContentResult');

builder.objectType(UpdateSectionContentResultType, {
  fields: (t) => ({
    sectionId: t.exposeString('sectionId'),
    status: t.exposeString('status'),
    updatedAt: t.exposeString('updatedAt'),
  }),
});

export const FinalizeSectionResultType = builder.objectRef<{
  sectionId: string;
  status: string;
  finalizedAt: string;
}>('FinalizeSectionResult');

builder.objectType(FinalizeSectionResultType, {
  fields: (t) => ({
    sectionId: t.exposeString('sectionId'),
    status: t.exposeString('status'),
    finalizedAt: t.exposeString('finalizedAt'),
  }),
});

// --- Draft Narrative Result type (Story 3.8) ---

export const DraftNarrativeResultType = builder.objectRef<{
  taskId: string;
}>('DraftNarrativeResult');

builder.objectType(DraftNarrativeResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
  }),
});

// --- Similar Device type (Story 3.9) ---

export const SimilarDeviceObjectType = builder.objectRef<{
  id: string;
  soaAnalysisId: string;
  deviceName: string;
  manufacturer: string;
  indication: string;
  regulatoryStatus: string;
  status: string;
  articleCount: number;
  metadata: unknown;
  createdAt: Date;
}>('SimilarDevice');

builder.objectType(SimilarDeviceObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    deviceName: t.exposeString('deviceName'),
    manufacturer: t.exposeString('manufacturer'),
    indication: t.exposeString('indication'),
    regulatoryStatus: t.exposeString('regulatoryStatus'),
    status: t.exposeString('status'),
    articleCount: t.exposeInt('articleCount'),
    metadata: t.expose('metadata', { type: 'JSON', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const DiscoverDevicesResultType = builder.objectRef<{
  discoveredCount: number;
  totalBenchmarks: number;
}>('DiscoverDevicesResult');

builder.objectType(DiscoverDevicesResultType, {
  fields: (t) => ({
    discoveredCount: t.exposeInt('discoveredCount'),
    totalBenchmarks: t.exposeInt('totalBenchmarks'),
  }),
});

export const UpdateDeviceStatusResultType = builder.objectRef<{
  id: string;
  status: string;
}>('UpdateDeviceStatusResult');

builder.objectType(UpdateDeviceStatusResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    status: t.exposeString('status'),
  }),
});

export const BenchmarkObjectType = builder.objectRef<{
  id: string;
  similarDeviceId: string;
  metricName: string;
  metricValue: string;
  unit: string;
  sourceArticleId: string | null;
  sourceDescription: string | null;
  createdAt: Date;
}>('Benchmark');

builder.objectType(BenchmarkObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    similarDeviceId: t.exposeString('similarDeviceId'),
    metricName: t.exposeString('metricName'),
    metricValue: t.exposeString('metricValue'),
    unit: t.exposeString('unit'),
    sourceArticleId: t.exposeString('sourceArticleId', { nullable: true }),
    sourceDescription: t.exposeString('sourceDescription', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const AggregatedBenchmarkType = builder.objectRef<{
  metricName: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  range: number;
  deviceCount: number;
  unit: string;
}>('AggregatedBenchmark');

builder.objectType(AggregatedBenchmarkType, {
  fields: (t) => ({
    metricName: t.exposeString('metricName'),
    min: t.exposeFloat('min'),
    max: t.exposeFloat('max'),
    mean: t.exposeFloat('mean'),
    median: t.exposeFloat('median'),
    range: t.exposeFloat('range'),
    deviceCount: t.exposeInt('deviceCount'),
    unit: t.exposeString('unit'),
  }),
});

// --- Claim types (Story 3.10) ---

export const ClaimObjectType = builder.objectRef<{
  id: string;
  soaAnalysisId: string;
  statementText: string;
  thematicSectionId: string | null;
  status: string;
  evidenceStrength: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}>('Claim');

builder.objectType(ClaimObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    statementText: t.exposeString('statementText'),
    thematicSectionId: t.exposeString('thematicSectionId', { nullable: true }),
    status: t.exposeString('status'),
    evidenceStrength: t.exposeString('evidenceStrength', { nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// --- Generate Claims Result type ---

export const GenerateClaimsResultType = builder.objectRef<{
  taskId: string;
  sectionCount: number;
}>('GenerateClaimsResult');

builder.objectType(GenerateClaimsResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    sectionCount: t.exposeInt('sectionCount'),
  }),
});

// --- Update Claim Status Result type ---

export const UpdateClaimStatusResultType = builder.objectRef<{
  id: string;
  status: string;
}>('UpdateClaimStatusResult');

builder.objectType(UpdateClaimStatusResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    status: t.exposeString('status'),
  }),
});

export const ClaimArticleLinkObjectType = builder.objectRef<{
  id: string;
  claimId: string;
  articleId: string;
  sourceQuote: string | null;
  createdAt: Date;
}>('ClaimArticleLink');

builder.objectType(ClaimArticleLinkObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    claimId: t.exposeString('claimId'),
    articleId: t.exposeString('articleId'),
    sourceQuote: t.exposeString('sourceQuote', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const ComparisonTableType = builder.objectRef<{
  metrics: string[];
  devices: Array<{
    deviceId: string;
    deviceName: string;
    manufacturer: string;
    indication: string;
    isSubjectDevice: boolean;
    values: Record<string, string | null>;
  }>;
}>('ComparisonTable');

builder.objectType(ComparisonTableType, {
  fields: (t) => ({
    metrics: t.exposeStringList('metrics'),
    devices: t.expose('devices', { type: 'JSON' }),
  }),
});

export const TraceabilityReportType = builder.objectRef<{
  totalClaims: number;
  linkedClaims: number;
  unlinkedClaims: number;
  traceabilityPercentage: number;
  unlinkedClaimsList: Array<{
    claimId: string;
    statementText: string;
  }>;
}>('TraceabilityReport');

builder.objectType(TraceabilityReportType, {
  fields: (t) => ({
    totalClaims: t.exposeInt('totalClaims'),
    linkedClaims: t.exposeInt('linkedClaims'),
    unlinkedClaims: t.exposeInt('unlinkedClaims'),
    traceabilityPercentage: t.exposeInt('traceabilityPercentage'),
    unlinkedClaimsList: t.expose('unlinkedClaimsList', { type: 'JSON' }),
  }),
});

// --- Lock SOA Result type (Story 3.11) ---

export const LockSoaResultType = builder.objectRef<{
  soaAnalysisId: string;
  lockedAt: string;
  sectionCount: number;
}>('LockSoaResult');

builder.objectType(LockSoaResultType, {
  fields: (t) => ({
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    lockedAt: t.exposeString('lockedAt'),
    sectionCount: t.exposeInt('sectionCount'),
  }),
});

// --- Grid Template types (Template System) ---

export const GridColumnDefinitionType = builder.objectRef<{
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  orderIndex: number;
}>('GridColumnDefinition');

builder.objectType(GridColumnDefinitionType, {
  fields: (t) => ({
    name: t.exposeString('name'),
    displayName: t.exposeString('displayName'),
    dataType: t.exposeString('dataType'),
    isRequired: t.exposeBoolean('isRequired'),
    orderIndex: t.exposeInt('orderIndex'),
  }),
});

export const GridTemplateObjectType = builder.objectRef<{
  id: string;
  name: string;
  soaType: string;
  description?: string;
  isBuiltIn: boolean;
  columns: Array<{
    name: string;
    displayName: string;
    dataType: string;
    isRequired: boolean;
    orderIndex: number;
  }>;
}>('GridTemplate');

builder.objectType(GridTemplateObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    soaType: t.exposeString('soaType'),
    description: t.exposeString('description', { nullable: true }),
    isBuiltIn: t.exposeBoolean('isBuiltIn'),
    columns: t.field({
      type: [GridColumnDefinitionType],
      resolve: (parent) => parent.columns,
    }),
  }),
});

export const CreateTemplateResultType = builder.objectRef<{
  templateId: string;
  columnCount: number;
}>('CreateTemplateResult');

builder.objectType(CreateTemplateResultType, {
  fields: (t) => ({
    templateId: t.exposeString('templateId'),
    columnCount: t.exposeInt('columnCount'),
  }),
});

export const DeleteTemplateResultType = builder.objectRef<{
  templateId: string;
  deleted: boolean;
}>('DeleteTemplateResult');

builder.objectType(DeleteTemplateResultType, {
  fields: (t) => ({
    templateId: t.exposeString('templateId'),
    deleted: t.exposeBoolean('deleted'),
  }),
});

// --- SOA Import types ---

export const SoaImportObjectType = builder.objectRef<{
  id: string;
  projectId: string;
  status: string;
  sourceFileName: string;
  sourceFormat: string;
  extractedData: unknown;
  gapReport: unknown;
  taskId: string | null;
  soaAnalysisId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}>('SoaImport');

builder.objectType(SoaImportObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    status: t.exposeString('status'),
    sourceFileName: t.exposeString('sourceFileName'),
    sourceFormat: t.exposeString('sourceFormat'),
    extractedData: t.expose('extractedData', { type: 'JSON', nullable: true }),
    gapReport: t.expose('gapReport', { type: 'JSON', nullable: true }),
    taskId: t.exposeString('taskId', { nullable: true }),
    soaAnalysisId: t.exposeString('soaAnalysisId', { nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const ImportSoaDocumentResultType = builder.objectRef<{
  importId: string;
  taskId: string;
}>('ImportSoaDocumentResult');

builder.objectType(ImportSoaDocumentResultType, {
  fields: (t) => ({
    importId: t.exposeString('importId'),
    taskId: t.exposeString('taskId'),
  }),
});

export const ConfirmSoaImportResultType = builder.objectRef<{
  soaAnalysisId: string;
  articleCount: number;
  sessionIds: string[];
}>('ConfirmSoaImportResult');

builder.objectType(ConfirmSoaImportResultType, {
  fields: (t) => ({
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    articleCount: t.exposeInt('articleCount'),
    sessionIds: t.exposeStringList('sessionIds'),
  }),
});
