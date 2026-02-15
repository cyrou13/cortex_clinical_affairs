import { builder } from '../../../graphql/builder.js';

// --- Story 6.1: PMS Plan ---

export const PmsPlanObjectType = builder.objectRef<{
  id: string;
  projectId: string;
  cerVersionId: string;
  updateFrequency: string;
  dataCollectionMethods: unknown;
  status: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  approvedById: string | null;
  activatedAt: Date | null;
}>('PmsPlan');

builder.objectType(PmsPlanObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    cerVersionId: t.exposeString('cerVersionId'),
    updateFrequency: t.exposeString('updateFrequency'),
    dataCollectionMethods: t.expose('dataCollectionMethods', { type: 'JSON' }),
    status: t.exposeString('status'),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    approvedAt: t.expose('approvedAt', { type: 'DateTime', nullable: true }),
    approvedById: t.exposeString('approvedById', { nullable: true }),
    activatedAt: t.expose('activatedAt', { type: 'DateTime', nullable: true }),
  }),
});

export const CreatePmsPlanResultType = builder.objectRef<{
  pmsPlanId: string;
  projectId: string;
  cerVersionId: string;
  status: string;
}>('CreatePmsPlanResult');

builder.objectType(CreatePmsPlanResultType, {
  fields: (t) => ({
    pmsPlanId: t.exposeString('pmsPlanId'),
    projectId: t.exposeString('projectId'),
    cerVersionId: t.exposeString('cerVersionId'),
    status: t.exposeString('status'),
  }),
});

export const UpdatePmsPlanResultType = builder.objectRef<{
  pmsPlanId: string;
  updateFrequency: string;
  dataCollectionMethods: unknown;
  status: string;
}>('UpdatePmsPlanResult');

builder.objectType(UpdatePmsPlanResultType, {
  fields: (t) => ({
    pmsPlanId: t.exposeString('pmsPlanId'),
    updateFrequency: t.exposeString('updateFrequency'),
    dataCollectionMethods: t.expose('dataCollectionMethods', { type: 'JSON' }),
    status: t.exposeString('status'),
  }),
});

export const ApprovePlanResultType = builder.objectRef<{
  pmsPlanId: string;
  status: string;
  approvedAt: string;
}>('ApprovePlanResult');

builder.objectType(ApprovePlanResultType, {
  fields: (t) => ({
    pmsPlanId: t.exposeString('pmsPlanId'),
    status: t.exposeString('status'),
    approvedAt: t.exposeString('approvedAt'),
  }),
});

export const ActivatePlanResultType = builder.objectRef<{
  pmsPlanId: string;
  status: string;
  activatedAt: string;
}>('ActivatePlanResult');

builder.objectType(ActivatePlanResultType, {
  fields: (t) => ({
    pmsPlanId: t.exposeString('pmsPlanId'),
    status: t.exposeString('status'),
    activatedAt: t.exposeString('activatedAt'),
  }),
});

export const VigilanceDbObjectType = builder.objectRef<{
  id: string;
  pmsPlanId: string;
  databaseName: string;
  enabled: boolean;
  searchKeywords: unknown;
}>('PmsPlanVigilanceDb');

builder.objectType(VigilanceDbObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsPlanId: t.exposeString('pmsPlanId'),
    databaseName: t.exposeString('databaseName'),
    enabled: t.exposeBoolean('enabled'),
    searchKeywords: t.expose('searchKeywords', { type: 'JSON' }),
  }),
});

export const ResponsibilityObjectType = builder.objectRef<{
  id: string;
  pmsPlanId: string;
  activityType: string;
  userId: string;
  role: string;
  description: string | null;
}>('PmsResponsibility');

builder.objectType(ResponsibilityObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsPlanId: t.exposeString('pmsPlanId'),
    activityType: t.exposeString('activityType'),
    userId: t.exposeString('userId'),
    role: t.exposeString('role'),
    description: t.exposeString('description', { nullable: true }),
  }),
});

// --- Story 6.2: Gap Registry ---

export const GapRegistryEntryObjectType = builder.objectRef<{
  id: string;
  pmsPlanId: string;
  sourceModule: string;
  sourceId: string;
  description: string;
  severity: string;
  recommendedActivity: string;
  status: string;
  manuallyCreated: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}>('GapRegistryEntry');

builder.objectType(GapRegistryEntryObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsPlanId: t.exposeString('pmsPlanId'),
    sourceModule: t.exposeString('sourceModule'),
    sourceId: t.exposeString('sourceId'),
    description: t.exposeString('description'),
    severity: t.exposeString('severity'),
    recommendedActivity: t.exposeString('recommendedActivity'),
    status: t.exposeString('status'),
    manuallyCreated: t.exposeBoolean('manuallyCreated'),
    resolvedAt: t.expose('resolvedAt', { type: 'DateTime', nullable: true }),
    resolvedBy: t.exposeString('resolvedBy', { nullable: true }),
    resolutionNotes: t.exposeString('resolutionNotes', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const PopulateGapRegistryResultType = builder.objectRef<{
  pmsPlanId: string;
  populated: number;
  duplicates: number;
  totalGaps: number;
}>('PopulateGapRegistryResult');

builder.objectType(PopulateGapRegistryResultType, {
  fields: (t) => ({
    pmsPlanId: t.exposeString('pmsPlanId'),
    populated: t.exposeInt('populated'),
    duplicates: t.exposeInt('duplicates'),
    totalGaps: t.exposeInt('totalGaps'),
  }),
});

// --- Story 6.3: PMS Cycle ---

export const PmsCycleObjectType = builder.objectRef<{
  id: string;
  pmsPlanId: string;
  cerVersionId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  completedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}>('PmsCycle');

builder.objectType(PmsCycleObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsPlanId: t.exposeString('pmsPlanId'),
    cerVersionId: t.exposeString('cerVersionId'),
    name: t.exposeString('name'),
    startDate: t.expose('startDate', { type: 'DateTime' }),
    endDate: t.expose('endDate', { type: 'DateTime' }),
    status: t.exposeString('status'),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const CreateCycleResultType = builder.objectRef<{
  pmsCycleId: string;
  pmsPlanId: string;
  name: string;
  status: string;
  activityCount: number;
}>('CreateCycleResult');

builder.objectType(CreateCycleResultType, {
  fields: (t) => ({
    pmsCycleId: t.exposeString('pmsCycleId'),
    pmsPlanId: t.exposeString('pmsPlanId'),
    name: t.exposeString('name'),
    status: t.exposeString('status'),
    activityCount: t.exposeInt('activityCount'),
  }),
});

export const CycleTransitionResultType = builder.objectRef<{
  pmsCycleId: string;
  status: string;
}>('CycleTransitionResult');

builder.objectType(CycleTransitionResultType, {
  fields: (t) => ({
    pmsCycleId: t.exposeString('pmsCycleId'),
    status: t.exposeString('status'),
  }),
});

// --- Story 6.4: PMCF Activity ---

export const PmcfActivityObjectType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  activityType: string;
  assigneeId: string;
  title: string;
  description: string | null;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  findingsSummary: string | null;
  dataCollected: unknown;
  conclusions: string | null;
  createdAt: Date;
  updatedAt: Date;
}>('PmcfActivity');

builder.objectType(PmcfActivityObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    activityType: t.exposeString('activityType'),
    assigneeId: t.exposeString('assigneeId'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    status: t.exposeString('status'),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: true }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    findingsSummary: t.exposeString('findingsSummary', { nullable: true }),
    dataCollected: t.expose('dataCollected', { type: 'JSON', nullable: true }),
    conclusions: t.exposeString('conclusions', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const ActivityTransitionResultType = builder.objectRef<{
  activityId: string;
  activityType: string;
  status: string;
}>('ActivityTransitionResult');

builder.objectType(ActivityTransitionResultType, {
  fields: (t) => ({
    activityId: t.exposeString('activityId'),
    activityType: t.exposeString('activityType'),
    status: t.exposeString('status'),
  }),
});

export const UpdateActivityResultType = builder.objectRef<{
  activityId: string;
  title: string;
  status: string;
  updatedFields: string[];
}>('UpdateActivityResult');

builder.objectType(UpdateActivityResultType, {
  fields: (t) => ({
    activityId: t.exposeString('activityId'),
    title: t.exposeString('title'),
    status: t.exposeString('status'),
    updatedFields: t.exposeStringList('updatedFields'),
  }),
});

export const ReassignActivityResultType = builder.objectRef<{
  activityId: string;
  previousAssigneeId: string;
  newAssigneeId: string;
}>('ReassignActivityResult');

builder.objectType(ReassignActivityResultType, {
  fields: (t) => ({
    activityId: t.exposeString('activityId'),
    previousAssigneeId: t.exposeString('previousAssigneeId'),
    newAssigneeId: t.exposeString('newAssigneeId'),
  }),
});

// --- Story 6.5: Complaints ---

export const ComplaintObjectType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  date: Date;
  reportDate: Date;
  description: string;
  deviceIdentifier: string;
  lotNumber: string | null;
  serialNumber: string | null;
  severity: string;
  classification: string;
  classificationDescription: string | null;
  status: string;
  resolution: string | null;
  resolutionDate: Date | null;
  source: string;
  externalId: string | null;
  isIncident: boolean;
  regulatoryReportRequired: boolean;
  harmSeverity: string | null;
  correctiveAction: string | null;
  createdAt: Date;
  updatedAt: Date;
}>('Complaint');

builder.objectType(ComplaintObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    date: t.expose('date', { type: 'DateTime' }),
    reportDate: t.expose('reportDate', { type: 'DateTime' }),
    description: t.exposeString('description'),
    deviceIdentifier: t.exposeString('deviceIdentifier'),
    lotNumber: t.exposeString('lotNumber', { nullable: true }),
    serialNumber: t.exposeString('serialNumber', { nullable: true }),
    severity: t.exposeString('severity'),
    classification: t.exposeString('classification'),
    classificationDescription: t.exposeString('classificationDescription', { nullable: true }),
    status: t.exposeString('status'),
    resolution: t.exposeString('resolution', { nullable: true }),
    resolutionDate: t.expose('resolutionDate', { type: 'DateTime', nullable: true }),
    source: t.exposeString('source'),
    externalId: t.exposeString('externalId', { nullable: true }),
    isIncident: t.exposeBoolean('isIncident'),
    regulatoryReportRequired: t.exposeBoolean('regulatoryReportRequired'),
    harmSeverity: t.exposeString('harmSeverity', { nullable: true }),
    correctiveAction: t.exposeString('correctiveAction', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const ImportComplaintsResultType = builder.objectRef<{
  pmsCycleId: string;
  imported: number;
  skipped: number;
  errors: unknown;
}>('ImportComplaintsResult');

builder.objectType(ImportComplaintsResultType, {
  fields: (t) => ({
    pmsCycleId: t.exposeString('pmsCycleId'),
    imported: t.exposeInt('imported'),
    skipped: t.exposeInt('skipped'),
    errors: t.expose('errors', { type: 'JSON' }),
  }),
});

export const UpdateComplaintResultType = builder.objectRef<{
  id: string;
  status: string;
  updatedFields: string[];
}>('UpdateComplaintResult');

builder.objectType(UpdateComplaintResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    status: t.exposeString('status'),
    updatedFields: t.exposeStringList('updatedFields'),
  }),
});

// --- Story 6.6: Trend Analysis ---

export const TrendAnalysisObjectType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  analysisDate: Date;
  createdById: string;
  complaintTrends: unknown;
  severityDistribution: unknown;
  classificationDistribution: unknown;
  significantChanges: unknown;
  conclusions: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}>('TrendAnalysis');

builder.objectType(TrendAnalysisObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    analysisDate: t.expose('analysisDate', { type: 'DateTime' }),
    createdById: t.exposeString('createdById'),
    complaintTrends: t.expose('complaintTrends', { type: 'JSON' }),
    severityDistribution: t.expose('severityDistribution', { type: 'JSON' }),
    classificationDistribution: t.expose('classificationDistribution', { type: 'JSON' }),
    significantChanges: t.expose('significantChanges', { type: 'JSON' }),
    conclusions: t.exposeString('conclusions', { nullable: true }),
    status: t.exposeString('status'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const ComputeTrendsResultType = builder.objectRef<{
  trendAnalysisId: string;
  pmsCycleId: string;
  complaintTrends: unknown;
  severityDistribution: unknown;
  classificationDistribution: unknown;
  significantChanges: unknown;
  status: string;
}>('ComputeTrendsResult');

builder.objectType(ComputeTrendsResultType, {
  fields: (t) => ({
    trendAnalysisId: t.exposeString('trendAnalysisId'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    complaintTrends: t.expose('complaintTrends', { type: 'JSON' }),
    severityDistribution: t.expose('severityDistribution', { type: 'JSON' }),
    classificationDistribution: t.expose('classificationDistribution', { type: 'JSON' }),
    significantChanges: t.expose('significantChanges', { type: 'JSON' }),
    status: t.exposeString('status'),
  }),
});

export const FinalizeTrendResultType = builder.objectRef<{
  trendAnalysisId: string;
  status: string;
  conclusions: string;
}>('FinalizeTrendResult');

builder.objectType(FinalizeTrendResultType, {
  fields: (t) => ({
    trendAnalysisId: t.exposeString('trendAnalysisId'),
    status: t.exposeString('status'),
    conclusions: t.exposeString('conclusions'),
  }),
});

export const InstalledBaseEntryObjectType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  periodStart: Date;
  periodEnd: Date;
  totalUnitsShipped: number;
  activeDevices: number;
  regionBreakdown: unknown;
}>('InstalledBaseEntry');

builder.objectType(InstalledBaseEntryObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    periodStart: t.expose('periodStart', { type: 'DateTime' }),
    periodEnd: t.expose('periodEnd', { type: 'DateTime' }),
    totalUnitsShipped: t.exposeInt('totalUnitsShipped'),
    activeDevices: t.exposeInt('activeDevices'),
    regionBreakdown: t.expose('regionBreakdown', { type: 'JSON', nullable: true }),
  }),
});

// --- Story 6.7/6.8: Report Generation ---

export const GenerateReportResultType = builder.objectRef<{
  taskId: string;
  pmsCycleId: string;
  status: string;
}>('GenerateReportResult');

builder.objectType(GenerateReportResultType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    status: t.exposeString('status'),
  }),
});

// --- Story 6.9: CER Update Decision ---

export const CerUpdateDecisionObjectType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  benefitRiskReAssessment: string;
  conclusion: string;
  justification: string;
  materialChangesIdentified: boolean;
  materialChangesDescription: string | null;
  status: string;
  decidedBy: string;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>('CerUpdateDecision');

builder.objectType(CerUpdateDecisionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    benefitRiskReAssessment: t.exposeString('benefitRiskReAssessment'),
    conclusion: t.exposeString('conclusion'),
    justification: t.exposeString('justification'),
    materialChangesIdentified: t.exposeBoolean('materialChangesIdentified'),
    materialChangesDescription: t.exposeString('materialChangesDescription', { nullable: true }),
    status: t.exposeString('status'),
    decidedBy: t.exposeString('decidedBy'),
    decidedAt: t.expose('decidedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const CreateCerUpdateDecisionResultType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  conclusion: string;
  status: string;
  justification: string;
  materialChangesIdentified: boolean;
}>('CreateCerUpdateDecisionResult');

builder.objectType(CreateCerUpdateDecisionResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    conclusion: t.exposeString('conclusion'),
    status: t.exposeString('status'),
    justification: t.exposeString('justification'),
    materialChangesIdentified: t.exposeBoolean('materialChangesIdentified'),
  }),
});

export const FinalizeDecisionResultType = builder.objectRef<{
  id: string;
  pmsCycleId: string;
  conclusion: string;
  status: string;
  decidedAt: string;
}>('FinalizeDecisionResult');

builder.objectType(FinalizeDecisionResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    pmsCycleId: t.exposeString('pmsCycleId'),
    conclusion: t.exposeString('conclusion'),
    status: t.exposeString('status'),
    decidedAt: t.exposeString('decidedAt'),
  }),
});
