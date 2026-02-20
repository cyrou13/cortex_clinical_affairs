import { gql } from '@apollo/client';

export const CREATE_SLS_SESSION = gql`
  mutation CreateSlsSession(
    $name: String!
    $type: String!
    $projectId: String!
    $scopeFields: JSON
  ) {
    createSlsSession(name: $name, type: $type, projectId: $projectId, scopeFields: $scopeFields) {
      id
      name
      type
      status
    }
  }
`;

export const UPDATE_SLS_SESSION = gql`
  mutation UpdateSlsSession($id: String!, $name: String, $scopeFields: JSON) {
    updateSlsSession(id: $id, name: $name, scopeFields: $scopeFields) {
      id
      name
      scopeFields
    }
  }
`;

export const CREATE_QUERY = gql`
  mutation CreateQuery(
    $sessionId: String!
    $name: String!
    $queryString: String!
    $dateFrom: String
    $dateTo: String
  ) {
    createQuery(
      sessionId: $sessionId
      name: $name
      queryString: $queryString
      dateFrom: $dateFrom
      dateTo: $dateTo
    ) {
      id
      name
      queryString
      version
      dateFrom
      dateTo
    }
  }
`;

export const UPDATE_QUERY = gql`
  mutation UpdateQuery($id: String!, $queryString: String!, $dateFrom: String, $dateTo: String) {
    updateQuery(id: $id, queryString: $queryString, dateFrom: $dateFrom, dateTo: $dateTo) {
      id
      queryString
      version
      dateFrom
      dateTo
    }
  }
`;

export const DUPLICATE_QUERY = gql`
  mutation DuplicateQuery($id: String!) {
    duplicateQuery(id: $id) {
      id
      name
      queryString
      version
    }
  }
`;

export const DELETE_QUERY = gql`
  mutation DeleteQuery($id: String!) {
    deleteQuery(id: $id)
  }
`;

export const EXECUTE_QUERY = gql`
  mutation ExecuteQuery($queryId: String!, $databases: [String!]!, $sessionId: String!) {
    executeQuery(queryId: $queryId, databases: $databases, sessionId: $sessionId) {
      taskId
      executionIds
    }
  }
`;

// TODO: Backend resolver for cancelExecution does not exist yet — will fail at runtime
export const CANCEL_EXECUTION = gql`
  mutation CancelExecution($executionId: String!) {
    cancelExecution(executionId: $executionId)
  }
`;

export const IMPORT_ARTICLES = gql`
  mutation ImportArticles(
    $sessionId: String!
    $queryId: String!
    $executionId: String!
    $articles: [JSON]!
  ) {
    importArticles(
      sessionId: $sessionId
      queryId: $queryId
      executionId: $executionId
      articles: $articles
    ) {
      importedCount
      duplicateCount
      stats {
        totalBefore
        totalAfter
        duplicatesByDoi
        duplicatesByPmid
        duplicatesByTitle
      }
    }
  }
`;

export const UPDATE_ARTICLE_STATUS = gql`
  mutation UpdateArticleStatus($id: String!, $status: String!, $reason: String) {
    updateArticleStatus(id: $id, status: $status, reason: $reason) {
      id
      status
    }
  }
`;

export const LAUNCH_AI_SCORING = gql`
  mutation LaunchAiScoring($sessionId: String!) {
    launchAiScoring(sessionId: $sessionId) {
      taskId
    }
  }
`;

export const CANCEL_AI_SCORING = gql`
  mutation CancelAiScoring($taskId: String!) {
    cancelAiScoring(taskId: $taskId)
  }
`;

export const ADD_EXCLUSION_CODE = gql`
  mutation AddExclusionCode(
    $sessionId: String!
    $code: String!
    $label: String!
    $shortCode: String!
    $description: String
  ) {
    addExclusionCode(
      sessionId: $sessionId
      code: $code
      label: $label
      shortCode: $shortCode
      description: $description
    ) {
      id
      code
      label
      shortCode
    }
  }
`;

export const RENAME_EXCLUSION_CODE = gql`
  mutation RenameExclusionCode($id: String!, $label: String!, $shortCode: String) {
    renameExclusionCode(id: $id, label: $label, shortCode: $shortCode) {
      id
      label
      shortCode
    }
  }
`;

export const HIDE_EXCLUSION_CODE = gql`
  mutation HideExclusionCode($id: String!) {
    hideExclusionCode(id: $id) {
      id
      isHidden
    }
  }
`;

export const REORDER_EXCLUSION_CODES = gql`
  mutation ReorderExclusionCodes($sessionId: String!, $orderedIds: [String!]!) {
    reorderExclusionCodes(sessionId: $sessionId, orderedIds: $orderedIds)
  }
`;

export const CONFIGURE_RELEVANCE_THRESHOLDS = gql`
  mutation ConfigureRelevanceThresholds(
    $sessionId: String!
    $likelyRelevantThreshold: Int!
    $uncertainLowerThreshold: Int!
  ) {
    configureRelevanceThresholds(
      sessionId: $sessionId
      likelyRelevantThreshold: $likelyRelevantThreshold
      uncertainLowerThreshold: $uncertainLowerThreshold
    ) {
      likelyRelevantThreshold
      uncertainLowerThreshold
    }
  }
`;

export const CREATE_CUSTOM_AI_FILTER = gql`
  mutation CreateCustomAiFilter($sessionId: String!, $name: String!, $criterion: String!) {
    createCustomAiFilter(sessionId: $sessionId, name: $name, criterion: $criterion) {
      id
      name
      criterion
    }
  }
`;

export const UPDATE_CUSTOM_AI_FILTER = gql`
  mutation UpdateCustomAiFilter(
    $id: String!
    $name: String
    $criterion: String
    $isActive: Boolean
  ) {
    updateCustomAiFilter(id: $id, name: $name, criterion: $criterion, isActive: $isActive) {
      id
      name
      criterion
      isActive
    }
  }
`;

export const DELETE_CUSTOM_AI_FILTER = gql`
  mutation DeleteCustomAiFilter($id: String!) {
    deleteCustomAiFilter(id: $id)
  }
`;

export const LAUNCH_CUSTOM_FILTER_SCORING = gql`
  mutation LaunchCustomFilterScoring($sessionId: String!, $filterId: String!) {
    launchCustomFilterScoring(sessionId: $sessionId, filterId: $filterId) {
      taskId
    }
  }
`;

export const SCREEN_ARTICLE = gql`
  mutation ScreenArticle(
    $articleId: String!
    $decision: String!
    $exclusionCodeId: String
    $reason: String!
  ) {
    screenArticle(
      articleId: $articleId
      decision: $decision
      exclusionCodeId: $exclusionCodeId
      reason: $reason
    ) {
      id
      status
      relevanceScore
      aiCategory
      aiExclusionCode
    }
  }
`;

export const BULK_SCREEN_ARTICLES = gql`
  mutation BulkScreenArticles(
    $sessionId: String!
    $articleIds: [String!]!
    $decision: String!
    $exclusionCodeId: String
    $reason: String!
  ) {
    bulkScreenArticles(
      sessionId: $sessionId
      articleIds: $articleIds
      decision: $decision
      exclusionCodeId: $exclusionCodeId
      reason: $reason
    ) {
      successCount
      totalRequested
    }
  }
`;

export const SPOT_CHECK_ARTICLE = gql`
  mutation SpotCheckArticle(
    $articleId: String!
    $agrees: Boolean!
    $correctedDecision: String
    $exclusionCodeId: String
    $reason: String!
  ) {
    spotCheckArticle(
      articleId: $articleId
      agrees: $agrees
      correctedDecision: $correctedDecision
      exclusionCodeId: $exclusionCodeId
      reason: $reason
    ) {
      action
      articleId
      newStatus
    }
  }
`;

export const LOCK_SLS_DATASET = gql`
  mutation LockSlsDataset($sessionId: String!) {
    lockSlsDataset(sessionId: $sessionId) {
      sessionId
      lockedAt
      includedCount
      excludedCount
      totalArticles
      prismaStatistics
    }
  }
`;

export const LAUNCH_PDF_RETRIEVAL = gql`
  mutation LaunchPdfRetrieval($sessionId: String!) {
    launchPdfRetrieval(sessionId: $sessionId) {
      taskId
      articleCount
    }
  }
`;

export const RESOLVE_PDF_MISMATCH = gql`
  mutation ResolvePdfMismatch($articleId: String!, $resolution: String!) {
    resolvePdfMismatch(articleId: $articleId, resolution: $resolution) {
      articleId
      newStatus
    }
  }
`;

export const ADD_MANUAL_ARTICLE = gql`
  mutation AddManualArticle(
    $sessionId: String!
    $title: String!
    $authors: JSON!
    $year: Int
    $journal: String
    $doi: String
    $pmid: String
    $pdfStorageKey: String!
  ) {
    addManualArticle(
      sessionId: $sessionId
      title: $title
      authors: $authors
      year: $year
      journal: $journal
      doi: $doi
      pmid: $pmid
      pdfStorageKey: $pdfStorageKey
    ) {
      articleId
      title
      status
    }
  }
`;

export const LAUNCH_REFERENCE_MINING = gql`
  mutation LaunchReferenceMining($sessionId: String!, $articleIds: [String!]!) {
    launchReferenceMining(sessionId: $sessionId, articleIds: $articleIds) {
      taskId
      articleCount
    }
  }
`;

export const APPROVE_MINED_REFERENCE = gql`
  mutation ApproveMinedReference($referenceId: String!) {
    approveMinedReference(referenceId: $referenceId) {
      referenceId
      articleId
      status
    }
  }
`;

export const REJECT_MINED_REFERENCE = gql`
  mutation RejectMinedReference($referenceId: String!, $reason: String!) {
    rejectMinedReference(referenceId: $referenceId, reason: $reason) {
      referenceId
      status
    }
  }
`;

export const BULK_APPROVE_MINED_REFERENCES = gql`
  mutation BulkApproveMinedReferences($referenceIds: [String!]!) {
    bulkApproveMinedReferences(referenceIds: $referenceIds) {
      approvedCount
      totalRequested
    }
  }
`;

export const GENERATE_QUERY_FROM_TEXT = gql`
  mutation GenerateQueryFromText($sessionId: String!, $description: String!) {
    generateQueryFromText(sessionId: $sessionId, description: $description) {
      queryString
      suggestedDateFrom
      suggestedDateTo
    }
  }
`;

export const DELETE_SLS_SESSION = gql`
  mutation DeleteSlsSession($sessionId: String!) {
    deleteSlsSession(sessionId: $sessionId)
  }
`;
