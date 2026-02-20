import { gql } from '@apollo/client';

export const GET_SLS_SESSIONS = gql`
  query GetSlsSessions($projectId: String!) {
    slsSessions(projectId: $projectId) {
      id
      name
      type
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_SLS_SESSION = gql`
  query GetSlsSession($id: String!) {
    slsSession(id: $id) {
      id
      name
      type
      status
      scopeFields
      createdById
      createdAt
      updatedAt
    }
  }
`;

export const GET_SLS_QUERIES = gql`
  query GetSlsQueries($sessionId: String!) {
    slsQueries(sessionId: $sessionId) {
      id
      name
      queryString
      version
      isActive
      parentQueryId
      dateFrom
      dateTo
      createdAt
      updatedAt
    }
  }
`;

export const GET_QUERY_VERSIONS = gql`
  query GetQueryVersions($queryId: String!) {
    queryVersions(queryId: $queryId) {
      id
      version
      queryString
      diff
      createdAt
      createdById
    }
  }
`;

export const GET_QUERY_EXECUTIONS = gql`
  query GetQueryExecutions($queryId: String!) {
    queryExecutions(queryId: $queryId) {
      id
      queryId
      database
      status
      articlesFound
      articlesImported
      reproducibilityStatement
      errorMessage
      executedAt
      completedAt
    }
  }
`;

export const GET_ARTICLES = gql`
  query GetArticles($sessionId: String!, $filter: ArticleFilterInput, $offset: Int, $limit: Int) {
    articles(sessionId: $sessionId, filter: $filter, offset: $offset, limit: $limit) {
      items {
        id
        title
        authors
        doi
        pmid
        publicationDate
        journal
        sourceDatabase
        status
        pdfStatus
        relevanceScore
        aiCategory
        aiExclusionCode
      }
      total
      offset
      limit
    }
  }
`;

export const GET_ARTICLE = gql`
  query GetArticle($id: String!) {
    article(id: $id) {
      id
      title
      abstract
      authors
      doi
      pmid
      publicationDate
      journal
      sourceDatabase
      status
      relevanceScore
      aiReasoning
      aiCategory
      aiExclusionCode
      scoredAt
      createdAt
    }
  }
`;

export const GET_ARTICLE_COUNT_BY_STATUS = gql`
  query GetArticleCountByStatus($sessionId: String!) {
    articleCountByStatus(sessionId: $sessionId) {
      status
      count
    }
  }
`;

export const GET_AI_SCORING_PROGRESS = gql`
  query GetAiScoringProgress($taskId: String!) {
    aiScoringProgress(taskId: $taskId) {
      taskId
      status
      scored
      total
      estimatedSecondsRemaining
    }
  }
`;

export const GET_ACTIVE_SCORING_TASK = gql`
  query GetActiveScoringTask($sessionId: String!) {
    activeScoringTask(sessionId: $sessionId) {
      taskId
      status
      scored
      total
      estimatedSecondsRemaining
    }
  }
`;

export const GET_AI_SCORING_STATS = gql`
  query GetAiScoringStats($sessionId: String!) {
    aiScoringStats(sessionId: $sessionId) {
      likelyRelevantCount
      uncertainCount
      likelyIrrelevantCount
      totalScored
      acceptanceRate
    }
  }
`;

export const GET_EXCLUSION_CODES = gql`
  query GetExclusionCodes($sessionId: String!) {
    exclusionCodes(sessionId: $sessionId) {
      id
      code
      label
      shortCode
      description
      isHidden
      displayOrder
    }
  }
`;

export const GET_CUSTOM_AI_FILTERS = gql`
  query GetCustomAiFilters($sessionId: String!) {
    customAiFilters(sessionId: $sessionId) {
      id
      name
      criterion
      isActive
      createdAt
    }
  }
`;

export const GET_RELEVANCE_THRESHOLDS = gql`
  query GetRelevanceThresholds($sessionId: String!) {
    relevanceThresholds(sessionId: $sessionId) {
      likelyRelevantThreshold
      uncertainLowerThreshold
    }
  }
`;

export const GET_SCREENING_DECISIONS = gql`
  query GetScreeningDecisions($articleId: String!) {
    screeningDecisions(articleId: $articleId) {
      id
      articleId
      userId
      decision
      exclusionCodeId
      reason
      isAiOverride
      previousStatus
      newStatus
      timestamp
    }
  }
`;

export const GET_REVIEW_GATE_STATUS = gql`
  query GetReviewGateStatus($sessionId: String!) {
    reviewGateStatus(sessionId: $sessionId) {
      allArticlesReviewed {
        met
        reviewed
        total
      }
      likelyRelevantSpotChecked {
        met
        checked
        required
        total
      }
      likelyIrrelevantSpotChecked {
        met
        checked
        required
        total
      }
      allGatesMet
    }
  }
`;

export const GET_SPOT_CHECK_SAMPLE = gql`
  query GetSpotCheckSample($sessionId: String!, $category: String!, $count: Int) {
    spotCheckSample(sessionId: $sessionId, category: $category, count: $count) {
      id
      title
      abstract
      relevanceScore
      aiCategory
      aiReasoning
      aiExclusionCode
      status
    }
  }
`;

export const GET_SCREENING_AUDIT_LOG = gql`
  query GetScreeningAuditLog(
    $sessionId: String!
    $userId: String
    $decision: String
    $offset: Int
    $limit: Int
  ) {
    screeningAuditLog(
      sessionId: $sessionId
      userId: $userId
      decision: $decision
      offset: $offset
      limit: $limit
    ) {
      id
      articleId
      userId
      decision
      exclusionCodeId
      reason
      isAiOverride
      previousStatus
      newStatus
      timestamp
    }
  }
`;

export const GET_LOCK_PREFLIGHT = gql`
  query GetLockPreflight($sessionId: String!) {
    lockPreflightCheck(sessionId: $sessionId) {
      pendingCount
      allGatesMet
      includedCount
      excludedCount
      totalArticles
    }
  }
`;

export const GET_PRISMA_STATISTICS = gql`
  query GetPrismaStatistics($sessionId: String!) {
    prismaStatistics(sessionId: $sessionId)
  }
`;

export const GET_PDF_RETRIEVAL_STATS = gql`
  query GetPdfRetrievalStats($sessionId: String!) {
    pdfRetrievalStats(sessionId: $sessionId) {
      totalIncluded
      pdfFound
      pdfNotFound
      mismatches
      verified
      retrieving
    }
  }
`;

export const GET_MINED_REFERENCES = gql`
  query GetMinedReferences(
    $sessionId: String!
    $approvalStatus: String
    $validationStatus: String
    $excludeDuplicates: Boolean
  ) {
    minedReferences(
      sessionId: $sessionId
      approvalStatus: $approvalStatus
      validationStatus: $validationStatus
      excludeDuplicates: $excludeDuplicates
    ) {
      id
      sessionId
      title
      authors
      year
      journal
      doi
      pmid
      validationStatus
      isDuplicate
      approvalStatus
      approvedById
      approvedAt
      createdAt
    }
  }
`;
