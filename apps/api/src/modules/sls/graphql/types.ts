import type { QueryExecutionResult, DeduplicationStats } from '@cortex/shared';
import { builder } from '../../../graphql/builder.js';

// --- Enum types ---

export const SlsSessionTypeEnum = builder.enumType('SlsSessionType', {
  values: ['SOA_CLINICAL', 'SOA_DEVICE', 'SIMILAR_DEVICE', 'PMS_UPDATE', 'AD_HOC'] as const,
});

export const SlsSessionStatusEnum = builder.enumType('SlsSessionStatus', {
  values: ['DRAFT', 'SCREENING', 'LOCKED'] as const,
});

// --- Metrics type ---

export const SessionMetricsType = builder.objectRef<{
  articleCount: number;
  queryCount: number;
  screenedCount: number;
  screeningProgress: number;
  articleCountsByStatus?: Record<string, number>;
}>('SessionMetrics');

builder.objectType(SessionMetricsType, {
  fields: (t) => ({
    articleCount: t.exposeInt('articleCount'),
    queryCount: t.exposeInt('queryCount'),
    screenedCount: t.exposeInt('screenedCount'),
    screeningProgress: t.exposeInt('screeningProgress'),
    articleCountsByStatus: t.expose('articleCountsByStatus', { type: 'JSON', nullable: true }),
  }),
});

// --- SLS Session type ---

export const SlsSessionObjectType = builder.objectRef<{
  id: string;
  projectId: string;
  cepId: string;
  name: string;
  type: string;
  status: string;
  scopeFields: unknown;
  createdById: string;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metrics?: {
    articleCount: number;
    queryCount: number;
    screenedCount: number;
    screeningProgress: number;
    articleCountsByStatus?: Record<string, number>;
  };
  queries?: Array<{
    id: string;
    sessionId: string;
    name: string;
    queryString: string;
    version: number;
    isActive: boolean;
    parentQueryId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  exclusionCodes?: Array<{
    id: string;
    sessionId: string;
    code: string;
    label: string;
    shortCode: string | null;
    isHidden: boolean;
    displayOrder: number;
  }>;
}>('SlsSession');

builder.objectType(SlsSessionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    cepId: t.exposeString('cepId'),
    name: t.exposeString('name'),
    type: t.exposeString('type'),
    status: t.exposeString('status'),
    scopeFields: t.expose('scopeFields', { type: 'JSON', nullable: true }),
    createdById: t.exposeString('createdById'),
    lockedAt: t.expose('lockedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    metrics: t.field({
      type: SessionMetricsType,
      nullable: true,
      resolve: (parent) => parent.metrics ?? null,
    }),
    queries: t.field({
      type: ['JSON'],
      nullable: true,
      resolve: (parent) => parent.queries ?? null,
    }),
    exclusionCodes: t.field({
      type: ['JSON'],
      nullable: true,
      resolve: (parent) => parent.exclusionCodes ?? null,
    }),
  }),
});

// --- SLS Query type ---

export const SlsQueryObjectType = builder.objectRef<{
  id: string;
  sessionId: string;
  name: string;
  queryString: string;
  version: number;
  isActive: boolean;
  parentQueryId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}>('SlsQuery');

builder.objectType(SlsQueryObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    sessionId: t.exposeString('sessionId'),
    name: t.exposeString('name'),
    queryString: t.exposeString('queryString'),
    version: t.exposeInt('version'),
    isActive: t.exposeBoolean('isActive'),
    parentQueryId: t.exposeString('parentQueryId', { nullable: true }),
    dateFrom: t.expose('dateFrom', { type: 'DateTime', nullable: true }),
    dateTo: t.expose('dateTo', { type: 'DateTime', nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// --- Generate Query Result type ---

export const GenerateQueryResultType = builder.objectRef<{
  queryString: string;
  suggestedDateFrom: string | null;
  suggestedDateTo: string | null;
}>('GenerateQueryResult');

builder.objectType(GenerateQueryResultType, {
  fields: (t) => ({
    queryString: t.exposeString('queryString'),
    suggestedDateFrom: t.exposeString('suggestedDateFrom', { nullable: true }),
    suggestedDateTo: t.exposeString('suggestedDateTo', { nullable: true }),
  }),
});

// --- QueryVersion type ---

export const QueryVersionObjectType = builder.objectRef<{
  id: string;
  queryId: string;
  version: number;
  queryString: string;
  diff: unknown;
  createdById: string;
  createdAt: Date;
}>('QueryVersion');

builder.objectType(QueryVersionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    queryId: t.exposeString('queryId'),
    version: t.exposeInt('version'),
    queryString: t.exposeString('queryString'),
    diff: t.expose('diff', { type: 'JSON', nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// --- Database Source enum ---

export const DatabaseSourceEnum = builder.enumType('DatabaseSource', {
  values: ['PUBMED', 'PMC', 'GOOGLE_SCHOLAR', 'CLINICAL_TRIALS'] as const,
});

// --- Execution Status enum ---

export const ExecutionStatusEnum = builder.enumType('ExecutionStatus', {
  values: ['RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED'] as const,
});

// --- QueryExecution type ---

export const QueryExecutionObjectType = builder.objectRef<QueryExecutionResult>('QueryExecution');

builder.objectType(QueryExecutionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    queryId: t.exposeString('queryId'),
    database: t.exposeString('database'),
    status: t.exposeString('status'),
    articlesFound: t.exposeInt('articlesFound'),
    articlesImported: t.exposeInt('articlesImported'),
    reproducibilityStatement: t.exposeString('reproducibilityStatement', { nullable: true }),
    errorMessage: t.exposeString('errorMessage', { nullable: true }),
    executedAt: t.expose('executedAt', { type: 'DateTime' }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
  }),
});

// --- ExecuteQuery result type ---

export const ExecuteQueryResultType = builder.objectRef<{
  taskId: string;
  executionIds: string[];
}>('ExecuteQueryResult');

builder.objectType(ExecuteQueryResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    executionIds: t.exposeStringList('executionIds'),
  }),
});

// --- Article Status enum ---

export const ArticleStatusGqlEnum = builder.enumType('ArticleStatus', {
  values: [
    'PENDING',
    'SCORED',
    'INCLUDED',
    'EXCLUDED',
    'SKIPPED',
    'FULL_TEXT_REVIEW',
    'FINAL_INCLUDED',
    'FINAL_EXCLUDED',
  ] as const,
});

// --- Article type ---

export const ArticleObjectType = builder.objectRef<{
  id: string;
  sessionId: string;
  title: string;
  abstract: string | null;
  authors: unknown;
  doi: string | null;
  pmid: string | null;
  publicationDate: Date | null;
  journal: string | null;
  sourceDatabase: string | null;
  pdfStatus: string | null;
  pdfVerificationResult: unknown;
  status: string;
  relevanceScore: number | null;
  aiExclusionCode: string | null;
  aiReasoning: string | null;
  aiCategory: string | null;
  scoredAt: Date | null;
  customFilterScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}>('Article');

builder.objectType(ArticleObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    sessionId: t.exposeString('sessionId'),
    title: t.exposeString('title'),
    abstract: t.exposeString('abstract', { nullable: true }),
    authors: t.expose('authors', { type: 'JSON', nullable: true }),
    doi: t.exposeString('doi', { nullable: true }),
    pmid: t.exposeString('pmid', { nullable: true }),
    publicationDate: t.expose('publicationDate', { type: 'DateTime', nullable: true }),
    journal: t.exposeString('journal', { nullable: true }),
    sourceDatabase: t.exposeString('sourceDatabase', { nullable: true }),
    pdfStatus: t.exposeString('pdfStatus', { nullable: true }),
    pdfVerificationResult: t.expose('pdfVerificationResult', { type: 'JSON', nullable: true }),
    status: t.exposeString('status'),
    relevanceScore: t.exposeFloat('relevanceScore', { nullable: true }),
    aiExclusionCode: t.exposeString('aiExclusionCode', { nullable: true }),
    aiReasoning: t.exposeString('aiReasoning', { nullable: true }),
    aiCategory: t.exposeString('aiCategory', { nullable: true }),
    scoredAt: t.expose('scoredAt', { type: 'DateTime', nullable: true }),
    customFilterScore: t.exposeFloat('customFilterScore', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// --- Article Filter input ---

export const ArticleFilterInput = builder.inputType('ArticleFilterInput', {
  fields: (t) => ({
    status: t.string({ required: false }),
    yearFrom: t.int({ required: false }),
    yearTo: t.int({ required: false }),
    sourceDatabase: t.string({ required: false }),
    searchText: t.string({ required: false }),
    pdfStatus: t.string({ required: false }),
    customFilterPassed: t.boolean({ required: false }),
  }),
});

// --- Paginated Articles type ---

export const PaginatedArticlesType = builder.objectRef<{
  items: Array<{
    id: string;
    sessionId: string;
    title: string;
    abstract: string | null;
    authors: unknown;
    doi: string | null;
    pmid: string | null;
    publicationDate: Date | null;
    journal: string | null;
    sourceDatabase: string | null;
    pdfStatus: string | null;
    pdfVerificationResult: unknown;
    status: string;
    relevanceScore: number | null;
    aiExclusionCode: string | null;
    aiReasoning: string | null;
    aiCategory: string | null;
    scoredAt: Date | null;
    customFilterScore: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  offset: number;
  limit: number;
}>('PaginatedArticles');

builder.objectType(PaginatedArticlesType, {
  fields: (t) => ({
    items: t.field({
      type: [ArticleObjectType],
      resolve: (parent) => parent.items,
    }),
    total: t.exposeInt('total'),
    offset: t.exposeInt('offset'),
    limit: t.exposeInt('limit'),
  }),
});

// --- Deduplication Stats type ---

export const DeduplicationStatsType = builder.objectRef<DeduplicationStats>('DeduplicationStats');

builder.objectType(DeduplicationStatsType, {
  fields: (t) => ({
    totalBefore: t.exposeInt('totalBefore'),
    totalAfter: t.exposeInt('totalAfter'),
    duplicatesByDoi: t.exposeInt('duplicatesByDoi'),
    duplicatesByPmid: t.exposeInt('duplicatesByPmid'),
    duplicatesByTitle: t.exposeInt('duplicatesByTitle'),
  }),
});

// --- Import Articles result type ---

export const ImportArticlesResultType = builder.objectRef<{
  importedCount: number;
  duplicateCount: number;
  stats: DeduplicationStats;
}>('ImportArticlesResult');

builder.objectType(ImportArticlesResultType, {
  fields: (t) => ({
    importedCount: t.exposeInt('importedCount'),
    duplicateCount: t.exposeInt('duplicateCount'),
    stats: t.field({
      type: DeduplicationStatsType,
      resolve: (parent) => parent.stats,
    }),
  }),
});

// --- Article Count By Status type ---

export const ArticleCountByStatusType = builder.objectRef<{
  status: string;
  count: number;
}>('ArticleCountByStatus');

builder.objectType(ArticleCountByStatusType, {
  fields: (t) => ({
    status: t.exposeString('status'),
    count: t.exposeInt('count'),
  }),
});

// --- AI Scoring Stats type ---

export const AiScoringStatsType = builder.objectRef<{
  likelyRelevantCount: number;
  uncertainCount: number;
  likelyIrrelevantCount: number;
  totalScored: number;
  acceptanceRate: number;
}>('AiScoringStats');

builder.objectType(AiScoringStatsType, {
  fields: (t) => ({
    likelyRelevantCount: t.exposeInt('likelyRelevantCount'),
    uncertainCount: t.exposeInt('uncertainCount'),
    likelyIrrelevantCount: t.exposeInt('likelyIrrelevantCount'),
    totalScored: t.exposeInt('totalScored'),
    acceptanceRate: t.exposeFloat('acceptanceRate'),
  }),
});

// --- Launch Scoring Result type ---

export const LaunchScoringResultType = builder.objectRef<{
  taskId: string;
}>('LaunchScoringResult');

builder.objectType(LaunchScoringResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
  }),
});

// --- AI Scoring Progress type (for polling) ---

export const AiScoringProgressType = builder.objectRef<{
  taskId: string;
  status: string;
  scored: number;
  total: number;
  estimatedSecondsRemaining: number | null;
}>('AiScoringProgress');

builder.objectType(AiScoringProgressType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    status: t.exposeString('status'),
    scored: t.exposeInt('scored'),
    total: t.exposeInt('total'),
    estimatedSecondsRemaining: t.exposeFloat('estimatedSecondsRemaining', { nullable: true }),
  }),
});

// --- Exclusion Code type (Story 2.7) ---

export const ExclusionCodeObjectType = builder.objectRef<{
  id: string;
  sessionId: string;
  code: string;
  label: string;
  shortCode: string | null;
  description: string | null;
  isHidden: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}>('ExclusionCode');

builder.objectType(ExclusionCodeObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    sessionId: t.exposeString('sessionId'),
    code: t.exposeString('code'),
    label: t.exposeString('label'),
    shortCode: t.exposeString('shortCode', { nullable: true }),
    description: t.exposeString('description', { nullable: true }),
    isHidden: t.exposeBoolean('isHidden'),
    displayOrder: t.exposeInt('displayOrder'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// --- Custom AI Filter type (Story 2.7) ---

export const CustomAiFilterObjectType = builder.objectRef<{
  id: string;
  sessionId: string;
  name: string;
  criterion: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>('CustomAiFilter');

builder.objectType(CustomAiFilterObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    sessionId: t.exposeString('sessionId'),
    name: t.exposeString('name'),
    criterion: t.exposeString('criterion'),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// --- Screening Decision type (Story 2.8) ---

export const ScreeningDecisionObjectType = builder.objectRef<{
  id: string;
  articleId: string;
  userId: string;
  decision: string;
  exclusionCodeId: string | null;
  reason: string;
  isAiOverride: boolean;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
}>('ScreeningDecision');

builder.objectType(ScreeningDecisionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    articleId: t.exposeString('articleId'),
    userId: t.exposeString('userId'),
    decision: t.exposeString('decision'),
    exclusionCodeId: t.exposeString('exclusionCodeId', { nullable: true }),
    reason: t.exposeString('reason'),
    isAiOverride: t.exposeBoolean('isAiOverride'),
    previousStatus: t.exposeString('previousStatus'),
    newStatus: t.exposeString('newStatus'),
    timestamp: t.expose('timestamp', { type: 'DateTime' }),
  }),
});

// --- Bulk Screen Result type (Story 2.8) ---

export const BulkScreenResultType = builder.objectRef<{
  successCount: number;
  totalRequested: number;
}>('BulkScreenResult');

builder.objectType(BulkScreenResultType, {
  fields: (t) => ({
    successCount: t.exposeInt('successCount'),
    totalRequested: t.exposeInt('totalRequested'),
  }),
});

// --- Relevance Thresholds type (Story 2.7) ---

export const RelevanceThresholdsType = builder.objectRef<{
  likelyRelevantThreshold: number;
  uncertainLowerThreshold: number;
}>('RelevanceThresholds');

builder.objectType(RelevanceThresholdsType, {
  fields: (t) => ({
    likelyRelevantThreshold: t.exposeInt('likelyRelevantThreshold'),
    uncertainLowerThreshold: t.exposeInt('uncertainLowerThreshold'),
  }),
});

// --- Review Gate type (Story 2.9) ---

export const ReviewGateType = builder.objectRef<{
  met: boolean;
  reviewed?: number;
  total: number;
  checked?: number;
  required?: number;
}>('ReviewGate');

builder.objectType(ReviewGateType, {
  fields: (t) => ({
    met: t.exposeBoolean('met'),
    reviewed: t.exposeInt('reviewed', { nullable: true }),
    total: t.exposeInt('total'),
    checked: t.exposeInt('checked', { nullable: true }),
    required: t.exposeInt('required', { nullable: true }),
  }),
});

export const ReviewGateStatusType = builder.objectRef<{
  allArticlesReviewed: { met: boolean; reviewed: number; total: number };
  likelyRelevantSpotChecked: { met: boolean; checked: number; required: number; total: number };
  likelyIrrelevantSpotChecked: { met: boolean; checked: number; required: number; total: number };
  allGatesMet: boolean;
}>('ReviewGateStatus');

builder.objectType(ReviewGateStatusType, {
  fields: (t) => ({
    allArticlesReviewed: t.field({
      type: ReviewGateType,
      resolve: (parent) => parent.allArticlesReviewed,
    }),
    likelyRelevantSpotChecked: t.field({
      type: ReviewGateType,
      resolve: (parent) => parent.likelyRelevantSpotChecked,
    }),
    likelyIrrelevantSpotChecked: t.field({
      type: ReviewGateType,
      resolve: (parent) => parent.likelyIrrelevantSpotChecked,
    }),
    allGatesMet: t.exposeBoolean('allGatesMet'),
  }),
});

// --- Spot Check Result type (Story 2.9) ---

export const SpotCheckResultType = builder.objectRef<{
  action: string;
  articleId: string;
  newStatus?: string;
}>('SpotCheckResult');

builder.objectType(SpotCheckResultType, {
  fields: (t) => ({
    action: t.exposeString('action'),
    articleId: t.exposeString('articleId'),
    newStatus: t.exposeString('newStatus', { nullable: true }),
  }),
});

// --- Screening Audit Entry type (Story 2.9) ---

export const ScreeningAuditEntryType = builder.objectRef<{
  id: string;
  articleId: string;
  userId: string;
  decision: string;
  exclusionCodeId: string | null;
  reason: string;
  isAiOverride: boolean;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
}>('ScreeningAuditEntry');

builder.objectType(ScreeningAuditEntryType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    articleId: t.exposeString('articleId'),
    userId: t.exposeString('userId'),
    decision: t.exposeString('decision'),
    exclusionCodeId: t.exposeString('exclusionCodeId', { nullable: true }),
    reason: t.exposeString('reason'),
    isAiOverride: t.exposeBoolean('isAiOverride'),
    previousStatus: t.exposeString('previousStatus'),
    newStatus: t.exposeString('newStatus'),
    timestamp: t.expose('timestamp', { type: 'DateTime' }),
  }),
});

// --- Lock Dataset Result type (Story 2.10) ---

export const LockDatasetResultType = builder.objectRef<{
  sessionId: string;
  lockedAt: string;
  includedCount: number;
  excludedCount: number;
  totalArticles: number;
  prismaStatistics: unknown;
}>('LockDatasetResult');

builder.objectType(LockDatasetResultType, {
  fields: (t) => ({
    sessionId: t.exposeString('sessionId'),
    lockedAt: t.exposeString('lockedAt'),
    includedCount: t.exposeInt('includedCount'),
    excludedCount: t.exposeInt('excludedCount'),
    totalArticles: t.exposeInt('totalArticles'),
    prismaStatistics: t.expose('prismaStatistics', { type: 'JSON' }),
  }),
});

// --- Lock Preflight Check type (Story 2.10) ---

export const LockPreflightCheckType = builder.objectRef<{
  pendingCount: number;
  allGatesMet: boolean;
  includedCount: number;
  excludedCount: number;
  totalArticles: number;
  sessionStatus: string;
}>('LockPreflightCheck');

builder.objectType(LockPreflightCheckType, {
  fields: (t) => ({
    pendingCount: t.exposeInt('pendingCount'),
    allGatesMet: t.exposeBoolean('allGatesMet'),
    includedCount: t.exposeInt('includedCount'),
    excludedCount: t.exposeInt('excludedCount'),
    totalArticles: t.exposeInt('totalArticles'),
    sessionStatus: t.exposeString('sessionStatus'),
  }),
});

// --- PDF Retrieval Result type (Story 2.11) ---

export const PdfRetrievalResultType = builder.objectRef<{
  taskId: string;
  articleCount: number;
}>('PdfRetrievalResult');

builder.objectType(PdfRetrievalResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    articleCount: t.exposeInt('articleCount'),
  }),
});

// --- Resolve PDF Mismatch Result type (Story 2.11) ---

export const ResolvePdfMismatchResultType = builder.objectRef<{
  articleId: string;
  newStatus: string;
}>('ResolvePdfMismatchResult');

builder.objectType(ResolvePdfMismatchResultType, {
  fields: (t) => ({
    articleId: t.exposeString('articleId'),
    newStatus: t.exposeString('newStatus'),
  }),
});

// --- PDF Retrieval Stats type (Story 2.11) ---

export const PdfRetrievalStatsType = builder.objectRef<{
  totalIncluded: number;
  pdfFound: number;
  pdfNotFound: number;
  mismatches: number;
  verified: number;
  retrieving: number;
}>('PdfRetrievalStats');

builder.objectType(PdfRetrievalStatsType, {
  fields: (t) => ({
    totalIncluded: t.exposeInt('totalIncluded'),
    pdfFound: t.exposeInt('pdfFound'),
    pdfNotFound: t.exposeInt('pdfNotFound'),
    mismatches: t.exposeInt('mismatches'),
    verified: t.exposeInt('verified'),
    retrieving: t.exposeInt('retrieving'),
  }),
});

// --- Abstract Enrichment Stats type ---

export const AbstractEnrichmentStatsType = builder.objectRef<{
  totalArticles: number;
  withFullAbstract: number;
  withShortAbstract: number;
  withoutAbstract: number;
  needsEnrichment: number;
}>('AbstractEnrichmentStats');

builder.objectType(AbstractEnrichmentStatsType, {
  fields: (t) => ({
    totalArticles: t.exposeInt('totalArticles'),
    withFullAbstract: t.exposeInt('withFullAbstract'),
    withShortAbstract: t.exposeInt('withShortAbstract'),
    withoutAbstract: t.exposeInt('withoutAbstract'),
    needsEnrichment: t.exposeInt('needsEnrichment'),
  }),
});

// --- Enrich Article Abstract Result type ---

export const EnrichArticleResultType = builder.objectRef<{
  articleId: string;
  abstract: string | null;
  source: string | null;
  enriched: boolean;
}>('EnrichArticleResult');

builder.objectType(EnrichArticleResultType, {
  fields: (t) => ({
    articleId: t.exposeString('articleId'),
    abstract: t.exposeString('abstract', { nullable: true }),
    source: t.exposeString('source', { nullable: true }),
    enriched: t.exposeBoolean('enriched'),
  }),
});

// --- Manual Article Result type (Story 2.12) ---

export const ManualArticleResultType = builder.objectRef<{
  articleId: string;
  title: string;
  status: string;
}>('ManualArticleResult');

builder.objectType(ManualArticleResultType, {
  fields: (t) => ({
    articleId: t.exposeString('articleId'),
    title: t.exposeString('title'),
    status: t.exposeString('status'),
  }),
});

// --- Mine References Result type (Story 2.12) ---

export const MineReferencesResultType = builder.objectRef<{
  taskId: string;
  articleCount: number;
}>('MineReferencesResult');

builder.objectType(MineReferencesResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    articleCount: t.exposeInt('articleCount'),
  }),
});

// --- Mined Reference type (Story 2.12) ---

export const MinedReferenceObjectType = builder.objectRef<{
  id: string;
  sessionId: string;
  title: string;
  authors: unknown;
  year: number | null;
  journal: string | null;
  doi: string | null;
  pmid: string | null;
  validationStatus: string | null;
  isDuplicate: boolean;
  rejectionReason: string | null;
  approvalStatus: string;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}>('MinedReference');

builder.objectType(MinedReferenceObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    sessionId: t.exposeString('sessionId'),
    title: t.exposeString('title'),
    authors: t.expose('authors', { type: 'JSON', nullable: true }),
    year: t.exposeInt('year', { nullable: true }),
    journal: t.exposeString('journal', { nullable: true }),
    doi: t.exposeString('doi', { nullable: true }),
    pmid: t.exposeString('pmid', { nullable: true }),
    validationStatus: t.exposeString('validationStatus', { nullable: true }),
    isDuplicate: t.exposeBoolean('isDuplicate'),
    rejectionReason: t.exposeString('rejectionReason', { nullable: true }),
    approvalStatus: t.exposeString('approvalStatus'),
    approvedById: t.exposeString('approvedById', { nullable: true }),
    approvedAt: t.expose('approvedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// --- Approve Reference Result type (Story 2.12) ---

export const ApproveReferenceResultType = builder.objectRef<{
  referenceId: string;
  articleId?: string;
  status: string;
}>('ApproveReferenceResult');

builder.objectType(ApproveReferenceResultType, {
  fields: (t) => ({
    referenceId: t.exposeString('referenceId'),
    articleId: t.exposeString('articleId', { nullable: true }),
    status: t.exposeString('status'),
  }),
});

// --- Bulk Approve Result type (Story 2.12) ---

export const BulkApproveResultType = builder.objectRef<{
  approvedCount: number;
  totalRequested: number;
}>('BulkApproveResult');

builder.objectType(BulkApproveResultType, {
  fields: (t) => ({
    approvedCount: t.exposeInt('approvedCount'),
    totalRequested: t.exposeInt('totalRequested'),
  }),
});
