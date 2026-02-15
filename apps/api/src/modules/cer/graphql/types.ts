import { builder } from '../../../graphql/builder.js';

// --- CER Version type (Story 5.1) ---

export const CerVersionObjectType = builder.objectRef<{
  id: string;
  projectId: string;
  regulatoryContext: string;
  versionType: string;
  versionNumber: string;
  status: string;
  previousVersionId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lockedAt: Date | null;
  lockedById: string | null;
}>('CerVersion');

builder.objectType(CerVersionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    regulatoryContext: t.exposeString('regulatoryContext'),
    versionType: t.exposeString('versionType'),
    versionNumber: t.exposeString('versionNumber'),
    status: t.exposeString('status'),
    previousVersionId: t.exposeString('previousVersionId', { nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    lockedAt: t.expose('lockedAt', { type: 'DateTime', nullable: true }),
    lockedById: t.exposeString('lockedById', { nullable: true }),
  }),
});

export const CreateCerResultType = builder.objectRef<{
  cerVersionId: string;
  versionNumber: string;
  regulatoryContext: string;
  upstreamLinksCount: number;
}>('CreateCerResult');

builder.objectType(CreateCerResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    versionNumber: t.exposeString('versionNumber'),
    regulatoryContext: t.exposeString('regulatoryContext'),
    upstreamLinksCount: t.exposeInt('upstreamLinksCount'),
  }),
});

// --- Upstream Link type (Story 5.1) ---

export const CerUpstreamLinkObjectType = builder.objectRef<{
  id: string;
  cerVersionId: string;
  moduleType: string;
  moduleId: string;
  lockedAt: string;
}>('CerUpstreamLink');

builder.objectType(CerUpstreamLinkObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    cerVersionId: t.exposeString('cerVersionId'),
    moduleType: t.exposeString('moduleType'),
    moduleId: t.exposeString('moduleId'),
    lockedAt: t.exposeString('lockedAt'),
  }),
});

export const LinkUpstreamResultType = builder.objectRef<{
  linkId: string;
  cerVersionId: string;
  moduleType: string;
  moduleId: string;
  lockedAt: string;
}>('LinkUpstreamResult');

builder.objectType(LinkUpstreamResultType, {
  fields: (t) => ({
    linkId: t.exposeString('linkId'),
    cerVersionId: t.exposeString('cerVersionId'),
    moduleType: t.exposeString('moduleType'),
    moduleId: t.exposeString('moduleId'),
    lockedAt: t.exposeString('lockedAt'),
  }),
});

// --- External Document type (Story 5.2) ---

export const CerExternalDocumentObjectType = builder.objectRef<{
  id: string;
  cerVersionId: string;
  title: string;
  version: string;
  date: string;
  summary: string;
  documentType: string;
  createdById: string;
  createdAt: Date;
}>('CerExternalDocument');

builder.objectType(CerExternalDocumentObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    cerVersionId: t.exposeString('cerVersionId'),
    title: t.exposeString('title'),
    version: t.exposeString('version'),
    date: t.exposeString('date'),
    summary: t.exposeString('summary'),
    documentType: t.exposeString('documentType'),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const UpdateExternalDocVersionResultType = builder.objectRef<{
  documentId: string;
  previousVersion: string;
  newVersion: string;
  archivedHistoryId: string;
  impactedSectionCount: number;
}>('UpdateExternalDocVersionResult');

builder.objectType(UpdateExternalDocVersionResultType, {
  fields: (t) => ({
    documentId: t.exposeString('documentId'),
    previousVersion: t.exposeString('previousVersion'),
    newVersion: t.exposeString('newVersion'),
    archivedHistoryId: t.exposeString('archivedHistoryId'),
    impactedSectionCount: t.exposeInt('impactedSectionCount'),
  }),
});

// --- Named Device Search type (Story 5.3) ---

export const NamedDeviceSearchResultType = builder.objectRef<{
  searchId: string;
  deviceName: string;
  databases: string[];
  status: string;
}>('NamedDeviceSearchResult');

builder.objectType(NamedDeviceSearchResultType, {
  fields: (t) => ({
    searchId: t.exposeString('searchId'),
    deviceName: t.exposeString('deviceName'),
    databases: t.exposeStringList('databases'),
    status: t.exposeString('status'),
  }),
});

// --- CER Section type (Story 5.4/5.5) ---

export const CerSectionObjectType = builder.objectRef<{
  id: string;
  cerVersionId: string;
  sectionNumber: string;
  title: string;
  status: string;
  orderIndex: number;
  wordCount: number | null;
  humanEditPercentage: number | null;
  versionMismatchWarning: boolean;
  createdAt: Date;
  updatedAt: Date;
}>('CerSection');

builder.objectType(CerSectionObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    cerVersionId: t.exposeString('cerVersionId'),
    sectionNumber: t.exposeString('sectionNumber'),
    title: t.exposeString('title'),
    status: t.exposeString('status'),
    orderIndex: t.exposeInt('orderIndex'),
    wordCount: t.exposeInt('wordCount', { nullable: true }),
    humanEditPercentage: t.exposeInt('humanEditPercentage', { nullable: true }),
    versionMismatchWarning: t.exposeBoolean('versionMismatchWarning'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const AssembleSectionsResultType = builder.objectRef<{
  cerVersionId: string;
  sectionCount: number;
  sectionIds: string[];
  jobIds: string[];
}>('AssembleSectionsResult');

builder.objectType(AssembleSectionsResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    sectionCount: t.exposeInt('sectionCount'),
    sectionIds: t.exposeStringList('sectionIds'),
    jobIds: t.exposeStringList('jobIds'),
  }),
});

export const ReviewSectionResultType = builder.objectRef<{
  cerSectionId: string;
  status: string;
  humanEditPercentage: number;
  wordCount: number;
}>('ReviewSectionResult');

builder.objectType(ReviewSectionResultType, {
  fields: (t) => ({
    cerSectionId: t.exposeString('cerSectionId'),
    status: t.exposeString('status'),
    humanEditPercentage: t.exposeInt('humanEditPercentage'),
    wordCount: t.exposeInt('wordCount'),
  }),
});

export const SaveSectionContentResultType = builder.objectRef<{
  cerSectionId: string;
  wordCount: number;
  savedAt: string;
}>('SaveSectionContentResult');

builder.objectType(SaveSectionContentResultType, {
  fields: (t) => ({
    cerSectionId: t.exposeString('cerSectionId'),
    wordCount: t.exposeInt('wordCount'),
    savedAt: t.exposeString('savedAt'),
  }),
});

// --- Traceability types (Story 5.6) ---

export const TraceabilityResultType = builder.objectRef<{
  cerVersionId: string;
  totalClaims: number;
  tracedClaims: number;
  coveragePercentage: number;
  untracedClaims: unknown;
  canFinalize: boolean;
}>('TraceabilityResult');

builder.objectType(TraceabilityResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    totalClaims: t.exposeInt('totalClaims'),
    tracedClaims: t.exposeInt('tracedClaims'),
    coveragePercentage: t.exposeInt('coveragePercentage'),
    untracedClaims: t.expose('untracedClaims', { type: 'JSON' }),
    canFinalize: t.exposeBoolean('canFinalize'),
  }),
});

export const ClaimTraceResultType = builder.objectRef<{
  claimTraceId: string;
  refNumber: string;
  level1: unknown;
  level2: unknown;
  level3: unknown;
  level4: unknown;
  auditTrail: unknown;
}>('ClaimTraceResult');

builder.objectType(ClaimTraceResultType, {
  fields: (t) => ({
    claimTraceId: t.exposeString('claimTraceId'),
    refNumber: t.exposeString('refNumber'),
    level1: t.expose('level1', { type: 'JSON' }),
    level2: t.expose('level2', { type: 'JSON', nullable: true }),
    level3: t.expose('level3', { type: 'JSON', nullable: true }),
    level4: t.expose('level4', { type: 'JSON', nullable: true }),
    auditTrail: t.expose('auditTrail', { type: 'JSON' }),
  }),
});

export const ProofPackageResultType = builder.objectRef<{
  claimTraceId: string;
  claimText: string;
  refNumber: string;
  sectionTitle: string;
  sectionNumber: string;
  traceChain: unknown;
  auditTrail: unknown;
  generatedAt: string;
}>('ProofPackageResult');

builder.objectType(ProofPackageResultType, {
  fields: (t) => ({
    claimTraceId: t.exposeString('claimTraceId'),
    claimText: t.exposeString('claimText'),
    refNumber: t.exposeString('refNumber'),
    sectionTitle: t.exposeString('sectionTitle'),
    sectionNumber: t.exposeString('sectionNumber'),
    traceChain: t.expose('traceChain', { type: 'JSON' }),
    auditTrail: t.expose('auditTrail', { type: 'JSON' }),
    generatedAt: t.exposeString('generatedAt'),
  }),
});

// --- GSPR types (Story 5.7) ---

export const GsprMatrixRowObjectType = builder.objectRef<{
  id: string;
  gsprId: string;
  title: string;
  status: string;
  evidenceReferences: string[];
  notes: string | null;
}>('GsprMatrixRow');

builder.objectType(GsprMatrixRowObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    gsprId: t.exposeString('gsprId'),
    title: t.exposeString('title'),
    status: t.exposeString('status'),
    evidenceReferences: t.exposeStringList('evidenceReferences'),
    notes: t.exposeString('notes', { nullable: true }),
  }),
});

export const GenerateGsprResultType = builder.objectRef<{
  cerVersionId: string;
  deviceClass: string;
  totalRequirements: number;
  rows: unknown;
}>('GenerateGsprResult');

builder.objectType(GenerateGsprResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    deviceClass: t.exposeString('deviceClass'),
    totalRequirements: t.exposeInt('totalRequirements'),
    rows: t.expose('rows', { type: 'JSON' }),
  }),
});

export const ComplianceStatementResultType = builder.objectRef<{
  cerVersionId: string;
  summary: unknown;
  gaps: unknown;
  conclusion: string;
  statementText: string;
}>('ComplianceStatementResult');

builder.objectType(ComplianceStatementResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    summary: t.expose('summary', { type: 'JSON' }),
    gaps: t.expose('gaps', { type: 'JSON' }),
    conclusion: t.exposeString('conclusion'),
    statementText: t.exposeString('statementText'),
  }),
});

// --- Benefit-Risk types (Story 5.8) ---

export const BenefitRiskResultType = builder.objectRef<{
  cerVersionId: string;
  benefits: unknown;
  risks: unknown;
  mitigations: unknown;
  riskMatrix: unknown;
}>('BenefitRiskResult');

builder.objectType(BenefitRiskResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    benefits: t.expose('benefits', { type: 'JSON' }),
    risks: t.expose('risks', { type: 'JSON' }),
    mitigations: t.expose('mitigations', { type: 'JSON' }),
    riskMatrix: t.expose('riskMatrix', { type: 'JSON' }),
  }),
});

export const BenefitRiskConclusionResultType = builder.objectRef<{
  cerVersionId: string;
  benefitSummary: unknown;
  riskSummary: unknown;
  mitigationSummary: unknown;
  conclusionText: string;
  favorableRatio: boolean;
}>('BenefitRiskConclusionResult');

builder.objectType(BenefitRiskConclusionResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    benefitSummary: t.expose('benefitSummary', { type: 'JSON' }),
    riskSummary: t.expose('riskSummary', { type: 'JSON' }),
    mitigationSummary: t.expose('mitigationSummary', { type: 'JSON' }),
    conclusionText: t.exposeString('conclusionText'),
    favorableRatio: t.exposeBoolean('favorableRatio'),
  }),
});

export const UpdateBenefitRiskResultType = builder.objectRef<{
  id: string;
  description: string;
  riskLevel?: string;
  updatedFields: string[];
}>('UpdateBenefitRiskResult');

builder.objectType(UpdateBenefitRiskResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    description: t.exposeString('description'),
    riskLevel: t.exposeString('riskLevel', { nullable: true }),
    updatedFields: t.exposeStringList('updatedFields'),
  }),
});

// --- Cross-Reference types (Story 5.9) ---

export const CrossReferencesResultType = builder.objectRef<{
  cerVersionId: string;
  bibliographyRefs: unknown;
  externalDocRefs: unknown;
  orphanedReferences: unknown;
  unusedBibliographyEntries: string[];
  totalReferences: number;
}>('CrossReferencesResult');

builder.objectType(CrossReferencesResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    bibliographyRefs: t.expose('bibliographyRefs', { type: 'JSON' }),
    externalDocRefs: t.expose('externalDocRefs', { type: 'JSON' }),
    orphanedReferences: t.expose('orphanedReferences', { type: 'JSON' }),
    unusedBibliographyEntries: t.exposeStringList('unusedBibliographyEntries'),
    totalReferences: t.exposeInt('totalReferences'),
  }),
});

export const BibliographyResultType = builder.objectRef<{
  cerVersionId: string;
  totalEntries: number;
  entries: unknown;
  citationStyle: string;
}>('BibliographyResult');

builder.objectType(BibliographyResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    totalEntries: t.exposeInt('totalEntries'),
    entries: t.expose('entries', { type: 'JSON' }),
    citationStyle: t.exposeString('citationStyle'),
  }),
});

// --- Evaluator types (Story 5.11) ---

export const EvaluatorObjectType = builder.objectRef<{
  id: string;
  cerVersionId: string;
  sectionId: string;
  userId: string;
  role: string;
}>('CerEvaluator');

builder.objectType(EvaluatorObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    cerVersionId: t.exposeString('cerVersionId'),
    sectionId: t.exposeString('sectionId'),
    userId: t.exposeString('userId'),
    role: t.exposeString('role'),
  }),
});

export const ESignResultType = builder.objectRef<{
  signatureId: string;
  userId: string;
  cerVersionId: string;
  documentHash: string;
  signedAt: string;
}>('ESignResult');

builder.objectType(ESignResultType, {
  fields: (t) => ({
    signatureId: t.exposeString('signatureId'),
    userId: t.exposeString('userId'),
    cerVersionId: t.exposeString('cerVersionId'),
    documentHash: t.exposeString('documentHash'),
    signedAt: t.exposeString('signedAt'),
  }),
});

// --- Version Management types (Story 5.12) ---

export const CreateVersionResultType = builder.objectRef<{
  cerVersionId: string;
  versionNumber: string;
  versionType: string;
  duplicatedSections: number;
}>('CreateCerVersionResult');

builder.objectType(CreateVersionResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    versionNumber: t.exposeString('versionNumber'),
    versionType: t.exposeString('versionType'),
    duplicatedSections: t.exposeInt('duplicatedSections'),
  }),
});

// --- Export types (Story 5.13) ---

export const ExportCerResultType = builder.objectRef<{
  jobId: string;
  cerVersionId: string;
  exportFormat: string;
  status: string;
}>('ExportCerResult');

builder.objectType(ExportCerResultType, {
  fields: (t) => ({
    jobId: t.exposeString('jobId'),
    cerVersionId: t.exposeString('cerVersionId'),
    exportFormat: t.exposeString('exportFormat'),
    status: t.exposeString('status'),
  }),
});

// --- Lock CER Result type (Story 5.13) ---

export const LockCerResultType = builder.objectRef<{
  cerVersionId: string;
  lockedAt: string;
  snapshotCount: number;
}>('LockCerResult');

builder.objectType(LockCerResultType, {
  fields: (t) => ({
    cerVersionId: t.exposeString('cerVersionId'),
    lockedAt: t.exposeString('lockedAt'),
    snapshotCount: t.exposeInt('snapshotCount'),
  }),
});

// --- GSPR Row Update Result type (Story 5.7) ---

export const UpdateGsprRowResultType = builder.objectRef<{
  id: string;
  gsprId: string;
  status: string;
  evidenceReferences: string[];
  notes: string | null;
}>('UpdateGsprRowResult');

builder.objectType(UpdateGsprRowResultType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    gsprId: t.exposeString('gsprId'),
    status: t.exposeString('status'),
    evidenceReferences: t.exposeStringList('evidenceReferences'),
    notes: t.exposeString('notes', { nullable: true }),
  }),
});
