import { gql } from '@apollo/client';

// --- Story 4.1 ---

export const GET_VALIDATION_STUDIES = gql`
  query GetValidationStudies($projectId: String!) {
    validationStudies(projectId: $projectId) {
      id
      projectId
      name
      type
      status
      description
      soaAnalysisId
      createdById
      createdAt
      updatedAt
      lockedAt
      lockedById
    }
  }
`;

export const GET_VALIDATION_STUDY = gql`
  query GetValidationStudy($id: String!) {
    validationStudy(id: $id) {
      id
      projectId
      name
      type
      status
      description
      soaAnalysisId
      createdById
      createdAt
      updatedAt
      lockedAt
      lockedById
    }
  }
`;

export const GET_ACCEPTANCE_CRITERIA = gql`
  query GetAcceptanceCriteria($validationStudyId: String!) {
    acceptanceCriteria(validationStudyId: $validationStudyId) {
      id
      validationStudyId
      soaBenchmarkId
      name
      threshold
      unit
      metricType
    }
  }
`;

// --- Story 4.2 ---

export const GET_PROTOCOL = gql`
  query GetProtocol($validationStudyId: String!) {
    protocol(validationStudyId: $validationStudyId) {
      id
      validationStudyId
      version
      status
      summary
      endpoints
      sampleSizeJustification
      statisticalStrategy
      createdById
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROTOCOL_AMENDMENTS = gql`
  query GetProtocolAmendments($protocolId: String!) {
    protocolAmendments(protocolId: $protocolId) {
      id
      protocolId
      fromVersion
      toVersion
      reason
      createdById
      createdAt
    }
  }
`;

// --- Story 4.3 ---

export const GET_DATA_IMPORTS = gql`
  query GetDataImports($validationStudyId: String!) {
    dataImports(validationStudyId: $validationStudyId) {
      id
      validationStudyId
      fileName
      version
      isActive
      rowCount
      columnCount
      headers
      uploadedById
      createdAt
    }
  }
`;

export const GET_IMPORT_DIFF = gql`
  query GetImportDiff($validationStudyId: String!, $versionA: Int!, $versionB: Int!) {
    computeImportDiff(validationStudyId: $validationStudyId, versionA: $versionA, versionB: $versionB) {
      additions
      deletions
      modifications
      details
    }
  }
`;

// --- Story 4.8 ---

export const GET_GSPR_MAPPINGS = gql`
  query GetGsprMappings($validationStudyId: String!) {
    gsprMappings(validationStudyId: $validationStudyId) {
      id
      validationStudyId
      gsprId
      status
      justification
      evidenceReferences
    }
  }
`;
