import { gql } from '@apollo/client';

// --- Story 5.1 ---

export const GET_CER_VERSIONS = gql`
  query GetCerVersions($projectId: String!) {
    cerVersions(projectId: $projectId) {
      id
      projectId
      regulatoryContext
      versionType
      versionNumber
      status
      previousVersionId
      createdById
      createdAt
      updatedAt
      lockedAt
      lockedById
    }
  }
`;

export const GET_CER_VERSION = gql`
  query GetCerVersion($id: String!) {
    cerVersion(id: $id) {
      id
      projectId
      regulatoryContext
      versionType
      versionNumber
      status
      previousVersionId
      createdById
      createdAt
      updatedAt
      lockedAt
      lockedById
    }
  }
`;

export const GET_CER_UPSTREAM_LINKS = gql`
  query GetCerUpstreamLinks($cerVersionId: String!) {
    cerUpstreamLinks(cerVersionId: $cerVersionId) {
      id
      cerVersionId
      moduleType
      moduleId
      lockedAt
    }
  }
`;

// --- Story 5.2 ---

export const GET_CER_EXTERNAL_DOCS = gql`
  query GetCerExternalDocs($cerVersionId: String!) {
    cerExternalDocs(cerVersionId: $cerVersionId) {
      id
      cerVersionId
      title
      version
      date
      summary
      documentType
      createdById
      createdAt
    }
  }
`;

// --- Story 5.4/5.5 ---

export const GET_CER_SECTIONS = gql`
  query GetCerSections($cerVersionId: String!) {
    cerSections(cerVersionId: $cerVersionId) {
      id
      cerVersionId
      sectionNumber
      title
      status
      orderIndex
      wordCount
      humanEditPercentage
      versionMismatchWarning
      createdAt
      updatedAt
    }
  }
`;

export const GET_CER_SECTION = gql`
  query GetCerSection($id: String!) {
    cerSection(id: $id) {
      id
      cerVersionId
      sectionNumber
      title
      status
      orderIndex
      wordCount
      humanEditPercentage
      versionMismatchWarning
      createdAt
      updatedAt
    }
  }
`;

// --- Story 5.6 ---

export const GET_CER_TRACEABILITY = gql`
  query GetCerTraceability($cerVersionId: String!) {
    cerTraceability(cerVersionId: $cerVersionId) {
      cerVersionId
      totalClaims
      tracedClaims
      coveragePercentage
      untracedClaims
      canFinalize
    }
  }
`;

export const GET_CLAIM_TRACE = gql`
  query GetClaimTrace($claimTraceId: String!) {
    claimTrace(claimTraceId: $claimTraceId) {
      claimTraceId
      refNumber
      level1
      level2
      level3
      level4
      auditTrail
    }
  }
`;

export const GET_PROOF_PACKAGE = gql`
  query GetProofPackage($claimTraceId: String!) {
    proofPackage(claimTraceId: $claimTraceId) {
      claimTraceId
      claimText
      refNumber
      sectionTitle
      sectionNumber
      traceChain
      auditTrail
      generatedAt
    }
  }
`;

// --- Story 5.7 ---

export const GET_GSPR_MATRIX_ROWS = gql`
  query GetGsprMatrixRows($cerVersionId: String!) {
    gsprMatrixRows(cerVersionId: $cerVersionId) {
      id
      gsprId
      title
      status
      evidenceReferences
      notes
    }
  }
`;

// --- Story 5.8 ---

export const GET_BENEFIT_RISK_CONCLUSION = gql`
  query GetBenefitRiskConclusion($cerVersionId: String!) {
    benefitRiskConclusion(cerVersionId: $cerVersionId) {
      cerVersionId
      benefitSummary
      riskSummary
      mitigationSummary
      conclusionText
      favorableRatio
    }
  }
`;

// --- Story 5.9 ---

export const GET_CROSS_REFERENCES = gql`
  query GetCrossReferences($cerVersionId: String!) {
    crossReferences(cerVersionId: $cerVersionId) {
      cerVersionId
      bibliographyRefs
      externalDocRefs
      orphanedReferences
      unusedBibliographyEntries
      totalReferences
    }
  }
`;

// --- Story 5.11 ---

export const GET_CER_EVALUATORS = gql`
  query GetCerEvaluators($cerVersionId: String!, $sectionId: String!) {
    cerEvaluators(cerVersionId: $cerVersionId, sectionId: $sectionId) {
      id
      cerVersionId
      sectionId
      userId
      role
    }
  }
`;
