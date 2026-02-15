import { gql } from '@apollo/client';

export const GET_SOA_ANALYSES = gql`
  query GetSoaAnalyses($projectId: String!) {
    soaAnalyses(projectId: $projectId) {
      id
      projectId
      name
      type
      status
      description
      createdById
      createdAt
      updatedAt
      lockedAt
    }
  }
`;

export const GET_SOA_ANALYSIS = gql`
  query GetSoaAnalysis($id: String!) {
    soaAnalysis(id: $id) {
      id
      projectId
      name
      type
      status
      description
      createdById
      createdAt
      updatedAt
      lockedAt
      lockedById
    }
  }
`;

export const GET_SOA_SECTIONS = gql`
  query GetSoaSections($soaAnalysisId: String!) {
    soaSections(soaAnalysisId: $soaAnalysisId) {
      id
      soaAnalysisId
      sectionKey
      title
      status
      orderIndex
      createdAt
      updatedAt
    }
  }
`;

export const GET_SOA_LINKED_SESSIONS = gql`
  query GetSoaLinkedSessions($soaAnalysisId: String!) {
    soaLinkedSessions(soaAnalysisId: $soaAnalysisId) {
      id
      soaAnalysisId
      slsSessionId
      createdAt
    }
  }
`;

export const GET_SOA_PROGRESS = gql`
  query GetSoaProgress($soaAnalysisId: String!) {
    soaProgress(soaAnalysisId: $soaAnalysisId) {
      totalSections
      draftCount
      inProgressCount
      finalizedCount
    }
  }
`;

export const GET_EXTRACTION_GRIDS = gql`
  query GetExtractionGrids($soaAnalysisId: String!) {
    extractionGrids(soaAnalysisId: $soaAnalysisId) {
      id
      soaAnalysisId
      thematicSectionId
      name
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRID_COLUMNS = gql`
  query GetGridColumns($gridId: String!) {
    gridColumns(gridId: $gridId) {
      id
      extractionGridId
      name
      displayName
      dataType
      orderIndex
      isRequired
    }
  }
`;

export const GET_GRID_CELLS = gql`
  query GetGridCells($gridId: String!, $articleId: String) {
    gridCells(gridId: $gridId, articleId: $articleId) {
      id
      extractionGridId
      articleId
      gridColumnId
      value
      aiExtractedValue
      confidenceLevel
      sourceQuote
      sourcePageNumber
      pdfLocationData
      validationStatus
      validatedById
      validatedAt
    }
  }
`;

export const GET_ARTICLE_EXTRACTION_STATUS = gql`
  query GetArticleExtractionStatus($gridId: String!, $articleId: String!) {
    articleExtractionStatus(gridId: $gridId, articleId: $articleId) {
      articleId
      status
      totalCells
      validatedCells
      flaggedCells
    }
  }
`;

export const GET_GRID_EXTRACTION_PROGRESS = gql`
  query GetGridExtractionProgress($gridId: String!) {
    gridExtractionProgress(gridId: $gridId) {
      gridId
      totalArticles
      counts
      overallPercentage
    }
  }
`;

export const GET_QUALITY_ASSESSMENTS = gql`
  query GetQualityAssessments($soaAnalysisId: String!, $articleId: String) {
    qualityAssessments(soaAnalysisId: $soaAnalysisId, articleId: $articleId) {
      id
      soaAnalysisId
      articleId
      assessmentType
      assessmentData
      dataContributionLevel
      assessedById
      assessedAt
    }
  }
`;

export const GET_SIMILAR_DEVICES = gql`
  query GetSimilarDevices($soaAnalysisId: String!) {
    similarDevices(soaAnalysisId: $soaAnalysisId) {
      id
      soaAnalysisId
      deviceName
      manufacturer
      indication
      regulatoryStatus
      metadata
      createdAt
    }
  }
`;

export const GET_DEVICE_BENCHMARKS = gql`
  query GetDeviceBenchmarks($similarDeviceId: String!) {
    deviceBenchmarks(similarDeviceId: $similarDeviceId) {
      id
      similarDeviceId
      metricName
      metricValue
      unit
      sourceArticleId
      sourceDescription
      createdAt
    }
  }
`;

export const GET_CLAIMS = gql`
  query GetClaims($soaAnalysisId: String!) {
    claims(soaAnalysisId: $soaAnalysisId) {
      id
      soaAnalysisId
      statementText
      thematicSectionId
      createdAt
      updatedAt
    }
  }
`;

export const GET_CLAIM_ARTICLE_LINKS = gql`
  query GetClaimArticleLinks($claimId: String!) {
    claimArticleLinks(claimId: $claimId) {
      id
      claimId
      articleId
      sourceQuote
      createdAt
    }
  }
`;
