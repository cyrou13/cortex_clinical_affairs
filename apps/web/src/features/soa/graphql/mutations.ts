import { gql } from '@apollo/client';

// --- Story 3.1 ---

export const CREATE_SOA_ANALYSIS = gql`
  mutation CreateSoaAnalysis(
    $projectId: String!
    $name: String!
    $type: String!
    $description: String
    $slsSessionIds: [String!]!
  ) {
    createSoaAnalysis(
      projectId: $projectId
      name: $name
      type: $type
      description: $description
      slsSessionIds: $slsSessionIds
    ) {
      soaAnalysisId
      name
      type
      sectionCount
    }
  }
`;

export const LINK_SLS_SESSIONS = gql`
  mutation LinkSlsSessions($soaAnalysisId: String!, $slsSessionIds: [String!]!) {
    linkSlsSessions(soaAnalysisId: $soaAnalysisId, slsSessionIds: $slsSessionIds) {
      linkedCount
      skippedCount
    }
  }
`;

export const CHECK_DEVICE_SOA_DEPENDENCY = gql`
  mutation CheckDeviceSoaDependency($projectId: String!, $soaType: String!) {
    checkDeviceSoaDependency(projectId: $projectId, soaType: $soaType) {
      canProceed
      warnings
    }
  }
`;

// --- Story 3.2 ---

export const CREATE_EXTRACTION_GRID = gql`
  mutation CreateExtractionGrid(
    $soaAnalysisId: String!
    $name: String!
    $thematicSectionId: String
    $templateId: String
  ) {
    createExtractionGrid(
      soaAnalysisId: $soaAnalysisId
      name: $name
      thematicSectionId: $thematicSectionId
      templateId: $templateId
    ) {
      gridId
      columnCount
    }
  }
`;

export const ADD_GRID_COLUMN = gql`
  mutation AddGridColumn(
    $gridId: String!
    $name: String!
    $displayName: String!
    $dataType: String!
    $isRequired: Boolean
  ) {
    addGridColumn(
      gridId: $gridId
      name: $name
      displayName: $displayName
      dataType: $dataType
      isRequired: $isRequired
    )
  }
`;

export const POPULATE_GRID_ROWS = gql`
  mutation PopulateGridRows($gridId: String!) {
    populateGridRows(gridId: $gridId) {
      gridId
      articleCount
      cellCount
    }
  }
`;

export const UPDATE_GRID_CELL = gql`
  mutation UpdateGridCell(
    $gridId: String!
    $articleId: String!
    $columnId: String!
    $value: String
  ) {
    updateGridCell(gridId: $gridId, articleId: $articleId, columnId: $columnId, value: $value) {
      cellId
      value
      validationStatus
    }
  }
`;

// --- Story 3.3 ---

export const EXTRACT_GRID_DATA = gql`
  mutation ExtractGridData($gridId: String!, $articleIds: [String!]) {
    extractGridData(gridId: $gridId, articleIds: $articleIds) {
      taskId
      articleCount
      columnCount
    }
  }
`;

// --- Story 3.4 ---

export const VALIDATE_CELL = gql`
  mutation ValidateCell($gridId: String!, $articleId: String!, $columnId: String!) {
    validateCell(gridId: $gridId, articleId: $articleId, columnId: $columnId) {
      cellId
      status
      value
    }
  }
`;

export const CORRECT_CELL = gql`
  mutation CorrectCell(
    $gridId: String!
    $articleId: String!
    $columnId: String!
    $newValue: String!
  ) {
    correctCell(gridId: $gridId, articleId: $articleId, columnId: $columnId, newValue: $newValue) {
      cellId
      status
      value
    }
  }
`;

export const FLAG_CELL = gql`
  mutation FlagCell($gridId: String!, $articleId: String!, $columnId: String!, $reason: String!) {
    flagCell(gridId: $gridId, articleId: $articleId, columnId: $columnId, reason: $reason) {
      cellId
      status
      reason
    }
  }
`;

// --- Story 3.6 ---

export const ASSESS_QUALITY = gql`
  mutation AssessQuality(
    $soaAnalysisId: String!
    $articleId: String!
    $assessmentType: String!
    $assessmentData: JSON!
    $dataContributionLevel: String!
  ) {
    assessQuality(
      soaAnalysisId: $soaAnalysisId
      articleId: $articleId
      assessmentType: $assessmentType
      assessmentData: $assessmentData
      dataContributionLevel: $dataContributionLevel
    ) {
      qualityAssessmentId
      assessmentType
      dataContributionLevel
    }
  }
`;

export const BATCH_ASSESS_QUALITY = gql`
  mutation BatchAssessQuality($gridId: String!, $soaAnalysisId: String!) {
    batchAssessQuality(gridId: $gridId, soaAnalysisId: $soaAnalysisId) {
      taskId
      articleCount
    }
  }
`;

// --- Story 3.7 ---

export const UPDATE_SECTION_CONTENT = gql`
  mutation UpdateSectionContent($sectionId: String!, $narrativeContent: String!) {
    updateSectionContent(sectionId: $sectionId, narrativeContent: $narrativeContent) {
      sectionId
      status
      updatedAt
    }
  }
`;

export const FINALIZE_SECTION = gql`
  mutation FinalizeSection($sectionId: String!) {
    finalizeSection(sectionId: $sectionId) {
      sectionId
      status
      finalizedAt
    }
  }
`;

// --- Story 3.8 ---

export const DRAFT_NARRATIVE = gql`
  mutation DraftNarrative($sectionId: String!, $soaAnalysisId: String!) {
    draftNarrative(sectionId: $sectionId, soaAnalysisId: $soaAnalysisId) {
      taskId
    }
  }
`;

// --- Story 3.9 ---

export const ADD_SIMILAR_DEVICE = gql`
  mutation AddSimilarDevice(
    $soaAnalysisId: String!
    $deviceName: String!
    $manufacturer: String!
    $indication: String!
    $regulatoryStatus: String!
    $metadata: JSON
  ) {
    addSimilarDevice(
      soaAnalysisId: $soaAnalysisId
      deviceName: $deviceName
      manufacturer: $manufacturer
      indication: $indication
      regulatoryStatus: $regulatoryStatus
      metadata: $metadata
    ) {
      id
      soaAnalysisId
      deviceName
      manufacturer
      indication
      regulatoryStatus
      createdAt
    }
  }
`;

export const ADD_BENCHMARK = gql`
  mutation AddBenchmark(
    $soaAnalysisId: String!
    $similarDeviceId: String!
    $metricName: String!
    $metricValue: String!
    $unit: String!
    $sourceArticleId: String
    $sourceDescription: String
  ) {
    addBenchmark(
      soaAnalysisId: $soaAnalysisId
      similarDeviceId: $similarDeviceId
      metricName: $metricName
      metricValue: $metricValue
      unit: $unit
      sourceArticleId: $sourceArticleId
      sourceDescription: $sourceDescription
    ) {
      id
      similarDeviceId
      metricName
      metricValue
      unit
      createdAt
    }
  }
`;

export const DISCOVER_SIMILAR_DEVICES = gql`
  mutation DiscoverSimilarDevices($soaAnalysisId: String!, $gridId: String!) {
    discoverSimilarDevices(soaAnalysisId: $soaAnalysisId, gridId: $gridId) {
      discoveredCount
      totalBenchmarks
    }
  }
`;

export const UPDATE_DEVICE_STATUS = gql`
  mutation UpdateDeviceStatus($deviceId: String!, $status: String!) {
    updateDeviceStatus(deviceId: $deviceId, status: $status) {
      id
      status
    }
  }
`;

// --- Story 3.10 ---

export const GENERATE_CLAIMS = gql`
  mutation GenerateClaims($soaAnalysisId: String!, $gridId: String!) {
    generateClaims(soaAnalysisId: $soaAnalysisId, gridId: $gridId) {
      taskId
      sectionCount
    }
  }
`;

export const UPDATE_CLAIM_STATUS = gql`
  mutation UpdateClaimStatus($claimId: String!, $status: String!) {
    updateClaimStatus(claimId: $claimId, status: $status) {
      id
      status
    }
  }
`;

export const CREATE_CLAIM = gql`
  mutation CreateClaim(
    $soaAnalysisId: String!
    $statementText: String!
    $thematicSectionId: String
  ) {
    createClaim(
      soaAnalysisId: $soaAnalysisId
      statementText: $statementText
      thematicSectionId: $thematicSectionId
    ) {
      id
      soaAnalysisId
      statementText
      thematicSectionId
      createdAt
    }
  }
`;

export const LINK_CLAIM_TO_ARTICLE = gql`
  mutation LinkClaimToArticle($claimId: String!, $articleId: String!, $sourceQuote: String) {
    linkClaimToArticle(claimId: $claimId, articleId: $articleId, sourceQuote: $sourceQuote) {
      id
      claimId
      articleId
      sourceQuote
      createdAt
    }
  }
`;

// --- Story 3.11 ---

export const LOCK_SOA_ANALYSIS = gql`
  mutation LockSoaAnalysis($soaAnalysisId: String!) {
    lockSoaAnalysis(soaAnalysisId: $soaAnalysisId) {
      soaAnalysisId
      lockedAt
      sectionCount
    }
  }
`;

// --- Grid Template mutations ---

export const CREATE_GRID_TEMPLATE = gql`
  mutation CreateGridTemplate(
    $name: String!
    $soaType: String!
    $description: String
    $columns: JSON!
  ) {
    createGridTemplate(
      name: $name
      soaType: $soaType
      description: $description
      columns: $columns
    ) {
      templateId
      columnCount
    }
  }
`;

export const DUPLICATE_GRID_TEMPLATE = gql`
  mutation DuplicateGridTemplate($sourceTemplateId: String!, $newName: String!, $soaType: String) {
    duplicateGridTemplate(
      sourceTemplateId: $sourceTemplateId
      newName: $newName
      soaType: $soaType
    ) {
      templateId
      columnCount
    }
  }
`;

export const UPDATE_GRID_TEMPLATE = gql`
  mutation UpdateGridTemplate(
    $templateId: String!
    $name: String
    $description: String
    $columns: JSON
  ) {
    updateGridTemplate(
      templateId: $templateId
      name: $name
      description: $description
      columns: $columns
    )
  }
`;

export const DELETE_GRID_TEMPLATE = gql`
  mutation DeleteGridTemplate($templateId: String!) {
    deleteGridTemplate(templateId: $templateId) {
      templateId
      deleted
    }
  }
`;

export const DELETE_SOA_ANALYSIS = gql`
  mutation DeleteSoaAnalysis($soaAnalysisId: String!) {
    deleteSoaAnalysis(soaAnalysisId: $soaAnalysisId)
  }
`;

// --- SOA Import ---

export const IMPORT_SOA_DOCUMENT = gql`
  mutation ImportSoaDocument(
    $projectId: String!
    $fileName: String!
    $fileContent: String!
    $fileFormat: String!
  ) {
    importSoaDocument(
      projectId: $projectId
      fileName: $fileName
      fileContent: $fileContent
      fileFormat: $fileFormat
    ) {
      importId
      taskId
    }
  }
`;

export const CONFIRM_SOA_IMPORT = gql`
  mutation ConfirmSoaImport($importId: String!, $editedData: JSON) {
    confirmSoaImport(importId: $importId, editedData: $editedData) {
      soaAnalysisId
      articleCount
      sessionIds
    }
  }
`;

export const CANCEL_SOA_IMPORT = gql`
  mutation CancelSoaImport($importId: String!) {
    cancelSoaImport(importId: $importId)
  }
`;

export const UPDATE_SOA_IMPORT_DATA = gql`
  mutation UpdateSoaImportData($importId: String!, $editedData: JSON!) {
    updateSoaImportData(importId: $importId, editedData: $editedData)
  }
`;
