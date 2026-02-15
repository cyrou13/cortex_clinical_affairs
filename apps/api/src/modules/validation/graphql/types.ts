import { builder } from '../../../graphql/builder.js';

// --- Validation Study type (Story 4.1) ---

export const ValidationStudyObjectType = builder.objectRef<{
  id: string;
  projectId: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  soaAnalysisId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lockedAt: Date | null;
  lockedById: string | null;
}>('ValidationStudy');

builder.objectType(ValidationStudyObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    name: t.exposeString('name'),
    type: t.exposeString('type'),
    status: t.exposeString('status'),
    description: t.exposeString('description', { nullable: true }),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    lockedAt: t.expose('lockedAt', { type: 'DateTime', nullable: true }),
    lockedById: t.exposeString('lockedById', { nullable: true }),
  }),
});

export const CreateStudyResultType = builder.objectRef<{
  validationStudyId: string;
  name: string;
  type: string;
  soaAnalysisId: string;
  benchmarkCount: number;
}>('CreateStudyResult');

builder.objectType(CreateStudyResultType, {
  fields: (t) => ({
    validationStudyId: t.exposeString('validationStudyId'),
    name: t.exposeString('name'),
    type: t.exposeString('type'),
    soaAnalysisId: t.exposeString('soaAnalysisId'),
    benchmarkCount: t.exposeInt('benchmarkCount'),
  }),
});

// --- Acceptance Criterion type (Story 4.1) ---

export const AcceptanceCriterionObjectType = builder.objectRef<{
  id: string;
  validationStudyId: string;
  soaBenchmarkId: string;
  name: string;
  threshold: number | null;
  unit: string | null;
  metricType: string | null;
}>('AcceptanceCriterion');

builder.objectType(AcceptanceCriterionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    validationStudyId: t.exposeString('validationStudyId'),
    soaBenchmarkId: t.exposeString('soaBenchmarkId'),
    name: t.exposeString('name'),
    threshold: t.exposeFloat('threshold', { nullable: true }),
    unit: t.exposeString('unit', { nullable: true }),
    metricType: t.exposeString('metricType', { nullable: true }),
  }),
});

// --- Protocol type (Story 4.2) ---

export const ProtocolObjectType = builder.objectRef<{
  id: string;
  validationStudyId: string;
  version: string;
  status: string;
  summary: string | null;
  endpoints: string | null;
  sampleSizeJustification: string | null;
  statisticalStrategy: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}>('Protocol');

builder.objectType(ProtocolObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    validationStudyId: t.exposeString('validationStudyId'),
    version: t.exposeString('version'),
    status: t.exposeString('status'),
    summary: t.exposeString('summary', { nullable: true }),
    endpoints: t.exposeString('endpoints', { nullable: true }),
    sampleSizeJustification: t.exposeString('sampleSizeJustification', { nullable: true }),
    statisticalStrategy: t.exposeString('statisticalStrategy', { nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const DefineProtocolResultType = builder.objectRef<{
  protocolId: string;
  version: string;
  status: string;
  isNew: boolean;
}>('DefineProtocolResult');

builder.objectType(DefineProtocolResultType, {
  fields: (t) => ({
    protocolId: t.exposeString('protocolId'),
    version: t.exposeString('version'),
    status: t.exposeString('status'),
    isNew: t.exposeBoolean('isNew'),
  }),
});

export const AmendProtocolResultType = builder.objectRef<{
  protocolId: string;
  fromVersion: string;
  toVersion: string;
  amendmentId: string;
  status: string;
}>('AmendProtocolResult');

builder.objectType(AmendProtocolResultType, {
  fields: (t) => ({
    protocolId: t.exposeString('protocolId'),
    fromVersion: t.exposeString('fromVersion'),
    toVersion: t.exposeString('toVersion'),
    amendmentId: t.exposeString('amendmentId'),
    status: t.exposeString('status'),
  }),
});

export const ProtocolAmendmentObjectType = builder.objectRef<{
  id: string;
  protocolId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  createdById: string;
  createdAt: Date;
}>('ProtocolAmendment');

builder.objectType(ProtocolAmendmentObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    protocolId: t.exposeString('protocolId'),
    fromVersion: t.exposeString('fromVersion'),
    toVersion: t.exposeString('toVersion'),
    reason: t.exposeString('reason'),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// --- Data Import type (Story 4.3) ---

export const DataImportObjectType = builder.objectRef<{
  id: string;
  validationStudyId: string;
  fileName: string;
  version: number;
  isActive: boolean;
  rowCount: number;
  columnCount: number;
  headers: unknown;
  uploadedById: string;
  createdAt: Date;
}>('DataImport');

builder.objectType(DataImportObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    validationStudyId: t.exposeString('validationStudyId'),
    fileName: t.exposeString('fileName'),
    version: t.exposeInt('version'),
    isActive: t.exposeBoolean('isActive'),
    rowCount: t.exposeInt('rowCount'),
    columnCount: t.exposeInt('columnCount'),
    headers: t.expose('headers', { type: 'JSON' }),
    uploadedById: t.exposeString('uploadedById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const ImportXlsResultType = builder.objectRef<{
  dataImportId: string;
  version: number;
  rowCount: number;
  columnCount: number;
  warnings: string[];
}>('ImportXlsResult');

builder.objectType(ImportXlsResultType, {
  fields: (t) => ({
    dataImportId: t.exposeString('dataImportId'),
    version: t.exposeInt('version'),
    rowCount: t.exposeInt('rowCount'),
    columnCount: t.exposeInt('columnCount'),
    warnings: t.exposeStringList('warnings'),
  }),
});

export const SetActiveVersionResultType = builder.objectRef<{
  dataImportId: string;
  version: number;
  previousActiveVersion: number | null;
}>('SetActiveVersionResult');

builder.objectType(SetActiveVersionResultType, {
  fields: (t) => ({
    dataImportId: t.exposeString('dataImportId'),
    version: t.exposeInt('version'),
    previousActiveVersion: t.exposeInt('previousActiveVersion', { nullable: true }),
  }),
});

export const RollbackResultType = builder.objectRef<{
  dataImportId: string;
  version: number;
  rolledBackFrom: number;
}>('RollbackResult');

builder.objectType(RollbackResultType, {
  fields: (t) => ({
    dataImportId: t.exposeString('dataImportId'),
    version: t.exposeInt('version'),
    rolledBackFrom: t.exposeInt('rolledBackFrom'),
  }),
});

export const ComputeDiffResultType = builder.objectRef<{
  additions: number;
  deletions: number;
  modifications: number;
  details: unknown;
}>('ComputeDiffResult');

builder.objectType(ComputeDiffResultType, {
  fields: (t) => ({
    additions: t.exposeInt('additions'),
    deletions: t.exposeInt('deletions'),
    modifications: t.exposeInt('modifications'),
    details: t.expose('details', { type: 'JSON' }),
  }),
});

// --- Results Mapping types (Story 4.4) ---

export const EndpointResultType = builder.objectRef<{
  acceptanceCriterionId: string;
  criterionName: string;
  computedValue: number;
  threshold: number;
  unit: string | null;
  result: string;
  statistics: unknown;
}>('EndpointResult');

builder.objectType(EndpointResultType, {
  fields: (t) => ({
    acceptanceCriterionId: t.exposeString('acceptanceCriterionId'),
    criterionName: t.exposeString('criterionName'),
    computedValue: t.exposeFloat('computedValue'),
    threshold: t.exposeFloat('threshold'),
    unit: t.exposeString('unit', { nullable: true }),
    result: t.exposeString('result'),
    statistics: t.expose('statistics', { type: 'JSON', nullable: true }),
  }),
});

export const MapResultsResultType = builder.objectRef<{
  validationStudyId: string;
  endpointResults: Array<{
    acceptanceCriterionId: string;
    criterionName: string;
    computedValue: number;
    threshold: number;
    unit: string | null;
    result: string;
    statistics: unknown;
  }>;
  overallMet: number;
  overallNotMet: number;
  totalCriteria: number;
}>('MapResultsResult');

builder.objectType(MapResultsResultType, {
  fields: (t) => ({
    validationStudyId: t.exposeString('validationStudyId'),
    endpointResults: t.field({
      type: [EndpointResultType],
      resolve: (parent) => parent.endpointResults as any,
    }),
    overallMet: t.exposeInt('overallMet'),
    overallNotMet: t.exposeInt('overallNotMet'),
    totalCriteria: t.exposeInt('totalCriteria'),
  }),
});

// --- GSPR Mapping types (Story 4.8) ---

export const GsprMappingObjectType = builder.objectRef<{
  id: string;
  validationStudyId: string;
  gsprId: string;
  status: string;
  justification: string | null;
  evidenceReferences: string[];
}>('GsprMapping');

builder.objectType(GsprMappingObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    validationStudyId: t.exposeString('validationStudyId'),
    gsprId: t.exposeString('gsprId'),
    status: t.exposeString('status'),
    justification: t.exposeString('justification', { nullable: true }),
    evidenceReferences: t.exposeStringList('evidenceReferences'),
  }),
});

// --- Lock Validation Result type (Story 4.8) ---

export const LockValidationResultType = builder.objectRef<{
  validationStudyId: string;
  lockedAt: string;
  snapshotId: string;
}>('LockValidationResult');

builder.objectType(LockValidationResultType, {
  fields: (t) => ({
    validationStudyId: t.exposeString('validationStudyId'),
    lockedAt: t.exposeString('lockedAt'),
    snapshotId: t.exposeString('snapshotId'),
  }),
});

// --- Link SOA Benchmarks Result type (Story 4.1) ---

export const LinkSoaBenchmarksResultType = builder.objectRef<{
  importedCount: number;
  benchmarks: unknown;
}>('LinkSoaBenchmarksResult');

builder.objectType(LinkSoaBenchmarksResultType, {
  fields: (t) => ({
    importedCount: t.exposeInt('importedCount'),
    benchmarks: t.expose('benchmarks', { type: 'JSON' }),
  }),
});
