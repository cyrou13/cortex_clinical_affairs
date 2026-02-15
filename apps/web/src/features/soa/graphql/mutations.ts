import { gql } from '@apollo/client';

// --- Story 3.1 ---

export const CREATE_SOA_ANALYSIS = gql`
  mutation CreateSoaAnalysis($projectId: String!, $name: String!, $type: String!, $description: String, $slsSessionIds: [String!]!) {
    createSoaAnalysis(projectId: $projectId, name: $name, type: $type, description: $description, slsSessionIds: $slsSessionIds) {
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
  mutation CreateExtractionGrid($soaAnalysisId: String!, $name: String!, $thematicSectionId: String, $templateId: String) {
    createExtractionGrid(soaAnalysisId: $soaAnalysisId, name: $name, thematicSectionId: $thematicSectionId, templateId: $templateId) {
      gridId
      columnCount
    }
  }
`;

export const ADD_GRID_COLUMN = gql`
  mutation AddGridColumn($gridId: String!, $name: String!, $displayName: String!, $dataType: String!, $isRequired: Boolean) {
    addGridColumn(gridId: $gridId, name: $name, displayName: $displayName, dataType: $dataType, isRequired: $isRequired)
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
  mutation UpdateGridCell($gridId: String!, $articleId: String!, $columnId: String!, $value: String) {
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
  mutation CorrectCell($gridId: String!, $articleId: String!, $columnId: String!, $newValue: String!) {
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
  mutation AssessQuality($soaAnalysisId: String!, $articleId: String!, $assessmentType: String!, $assessmentData: JSON!, $dataContributionLevel: String!) {
    assessQuality(soaAnalysisId: $soaAnalysisId, articleId: $articleId, assessmentType: $assessmentType, assessmentData: $assessmentData, dataContributionLevel: $dataContributionLevel) {
      qualityAssessmentId
      assessmentType
      dataContributionLevel
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
  mutation AddSimilarDevice($soaAnalysisId: String!, $deviceName: String!, $manufacturer: String!, $indication: String!, $regulatoryStatus: String!, $metadata: JSON) {
    addSimilarDevice(soaAnalysisId: $soaAnalysisId, deviceName: $deviceName, manufacturer: $manufacturer, indication: $indication, regulatoryStatus: $regulatoryStatus, metadata: $metadata) {
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
  mutation AddBenchmark($soaAnalysisId: String!, $similarDeviceId: String!, $metricName: String!, $metricValue: String!, $unit: String!, $sourceArticleId: String, $sourceDescription: String) {
    addBenchmark(soaAnalysisId: $soaAnalysisId, similarDeviceId: $similarDeviceId, metricName: $metricName, metricValue: $metricValue, unit: $unit, sourceArticleId: $sourceArticleId, sourceDescription: $sourceDescription) {
      id
      similarDeviceId
      metricName
      metricValue
      unit
      createdAt
    }
  }
`;

// --- Story 3.10 ---

export const CREATE_CLAIM = gql`
  mutation CreateClaim($soaAnalysisId: String!, $statementText: String!, $thematicSectionId: String) {
    createClaim(soaAnalysisId: $soaAnalysisId, statementText: $statementText, thematicSectionId: $thematicSectionId) {
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
