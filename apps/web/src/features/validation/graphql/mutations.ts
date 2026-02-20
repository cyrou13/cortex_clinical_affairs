import { gql } from '@apollo/client';

// --- Story 4.1 ---

export const CREATE_VALIDATION_STUDY = gql`
  mutation CreateValidationStudy(
    $projectId: String!
    $name: String!
    $type: String!
    $description: String
    $soaAnalysisId: String
  ) {
    createValidationStudy(
      projectId: $projectId
      name: $name
      type: $type
      description: $description
      soaAnalysisId: $soaAnalysisId
    ) {
      validationStudyId
      name
      type
      soaAnalysisId
      benchmarkCount
    }
  }
`;

export const LINK_SOA_BENCHMARKS = gql`
  mutation LinkSoaBenchmarks($validationStudyId: String!, $soaAnalysisId: String!) {
    linkSoaBenchmarks(validationStudyId: $validationStudyId, soaAnalysisId: $soaAnalysisId) {
      importedCount
      benchmarks
    }
  }
`;

// --- Story 4.2 ---

export const DEFINE_PROTOCOL = gql`
  mutation DefineProtocol(
    $validationStudyId: String!
    $summary: String
    $endpoints: String
    $sampleSizeJustification: String
    $statisticalStrategy: String
  ) {
    defineProtocol(
      validationStudyId: $validationStudyId
      summary: $summary
      endpoints: $endpoints
      sampleSizeJustification: $sampleSizeJustification
      statisticalStrategy: $statisticalStrategy
    ) {
      protocolId
      version
      status
      isNew
    }
  }
`;

export const AMEND_PROTOCOL = gql`
  mutation AmendProtocol(
    $protocolId: String!
    $reason: String!
    $summary: String
    $endpoints: String
    $sampleSizeJustification: String
    $statisticalStrategy: String
  ) {
    amendProtocol(
      protocolId: $protocolId
      reason: $reason
      summary: $summary
      endpoints: $endpoints
      sampleSizeJustification: $sampleSizeJustification
      statisticalStrategy: $statisticalStrategy
    ) {
      protocolId
      fromVersion
      toVersion
      amendmentId
      status
    }
  }
`;

// --- Story 4.3 ---

export const IMPORT_XLS = gql`
  mutation ImportXls(
    $validationStudyId: String!
    $fileName: String!
    $headers: [String!]!
    $rawRows: JSON!
  ) {
    importXls(
      validationStudyId: $validationStudyId
      fileName: $fileName
      headers: $headers
      rawRows: $rawRows
    ) {
      dataImportId
      version
      rowCount
      columnCount
      warnings
    }
  }
`;

export const SET_ACTIVE_IMPORT_VERSION = gql`
  mutation SetActiveImportVersion($validationStudyId: String!, $version: Int!) {
    setActiveImportVersion(validationStudyId: $validationStudyId, version: $version) {
      dataImportId
      version
      previousActiveVersion
    }
  }
`;

export const ROLLBACK_IMPORT_VERSION = gql`
  mutation RollbackImportVersion($validationStudyId: String!, $targetVersion: Int!) {
    rollbackImportVersion(validationStudyId: $validationStudyId, targetVersion: $targetVersion) {
      dataImportId
      version
      rolledBackFrom
    }
  }
`;

// --- Story 4.4 ---

export const MAP_RESULTS = gql`
  mutation MapResults($validationStudyId: String!) {
    mapResults(validationStudyId: $validationStudyId) {
      validationStudyId
      endpointResults {
        acceptanceCriterionId
        criterionName
        computedValue
        threshold
        unit
        result
        statistics
      }
      overallMet
      overallNotMet
      totalCriteria
    }
  }
`;

// --- Story 4.8 ---

export const MAP_GSPR = gql`
  mutation MapGspr(
    $validationStudyId: String!
    $gsprId: String!
    $status: String!
    $justification: String
    $evidenceReferences: [String!]
  ) {
    mapGspr(
      validationStudyId: $validationStudyId
      gsprId: $gsprId
      status: $status
      justification: $justification
      evidenceReferences: $evidenceReferences
    ) {
      id
      validationStudyId
      gsprId
      status
      justification
      evidenceReferences
    }
  }
`;

export const DELETE_GSPR_MAPPING = gql`
  mutation DeleteGsprMapping($validationStudyId: String!, $gsprId: String!) {
    deleteGsprMapping(validationStudyId: $validationStudyId, gsprId: $gsprId)
  }
`;

export const LOCK_VALIDATION_STUDY = gql`
  mutation LockValidationStudy($validationStudyId: String!) {
    lockValidationStudy(validationStudyId: $validationStudyId) {
      validationStudyId
      lockedAt
      snapshotId
    }
  }
`;

export const DELETE_VALIDATION_STUDY = gql`
  mutation DeleteValidationStudy($validationStudyId: String!) {
    deleteValidationStudy(validationStudyId: $validationStudyId)
  }
`;
