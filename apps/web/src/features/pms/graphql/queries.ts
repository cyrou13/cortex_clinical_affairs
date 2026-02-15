import { gql } from '@apollo/client';

// --- Story 6.1 ---

export const GET_PMS_PLANS = gql`
  query GetPmsPlans($projectId: String!) {
    pmsPlans(projectId: $projectId) {
      id
      projectId
      cerVersionId
      updateFrequency
      dataCollectionMethods
      status
      createdById
      createdAt
      updatedAt
      approvedAt
      approvedById
      activatedAt
    }
  }
`;

export const GET_PMS_PLAN = gql`
  query GetPmsPlan($id: String!) {
    pmsPlan(id: $id) {
      id
      projectId
      cerVersionId
      updateFrequency
      dataCollectionMethods
      status
      createdById
      createdAt
      updatedAt
      approvedAt
      approvedById
      activatedAt
    }
  }
`;

export const GET_VIGILANCE_DATABASES = gql`
  query GetVigilanceDatabases($pmsPlanId: String!) {
    vigilanceDatabases(pmsPlanId: $pmsPlanId) {
      id
      pmsPlanId
      databaseName
      enabled
      searchKeywords
    }
  }
`;

export const GET_PMS_RESPONSIBILITIES = gql`
  query GetPmsResponsibilities($pmsPlanId: String!) {
    pmsResponsibilities(pmsPlanId: $pmsPlanId) {
      id
      pmsPlanId
      activityType
      userId
      role
      description
    }
  }
`;

// --- Story 6.2 ---

export const GET_GAP_REGISTRY_ENTRIES = gql`
  query GetGapRegistryEntries($pmsPlanId: String!, $status: String, $severity: String) {
    gapRegistryEntries(pmsPlanId: $pmsPlanId, status: $status, severity: $severity) {
      id
      pmsPlanId
      sourceModule
      sourceId
      description
      severity
      recommendedActivity
      status
      manuallyCreated
      resolvedAt
      resolvedBy
      resolutionNotes
      createdAt
      updatedAt
    }
  }
`;

// --- Story 6.3 ---

export const GET_PMS_CYCLES = gql`
  query GetPmsCycles($pmsPlanId: String!) {
    pmsCycles(pmsPlanId: $pmsPlanId) {
      id
      pmsPlanId
      cerVersionId
      name
      startDate
      endDate
      status
      completedAt
      createdById
      createdAt
      updatedAt
    }
  }
`;

export const GET_PMS_CYCLE = gql`
  query GetPmsCycle($id: String!) {
    pmsCycle(id: $id) {
      id
      pmsPlanId
      cerVersionId
      name
      startDate
      endDate
      status
      completedAt
      createdById
      createdAt
      updatedAt
    }
  }
`;

// --- Story 6.4 ---

export const GET_PMCF_ACTIVITIES = gql`
  query GetPmcfActivities($cycleId: String!, $status: String) {
    pmcfActivities(cycleId: $cycleId, status: $status) {
      id
      pmsCycleId
      activityType
      assigneeId
      title
      description
      status
      startedAt
      completedAt
      findingsSummary
      dataCollected
      conclusions
      createdAt
      updatedAt
    }
  }
`;

export const GET_PMCF_ACTIVITY = gql`
  query GetPmcfActivity($id: String!) {
    pmcfActivity(id: $id) {
      id
      pmsCycleId
      activityType
      assigneeId
      title
      description
      status
      startedAt
      completedAt
      findingsSummary
      dataCollected
      conclusions
      createdAt
      updatedAt
    }
  }
`;

// --- Story 6.5 ---

export const GET_COMPLAINTS = gql`
  query GetComplaints($cycleId: String!, $severity: String, $status: String) {
    complaints(cycleId: $cycleId, severity: $severity, status: $status) {
      id
      pmsCycleId
      date
      reportDate
      description
      deviceIdentifier
      lotNumber
      serialNumber
      severity
      classification
      classificationDescription
      status
      resolution
      resolutionDate
      source
      externalId
      isIncident
      regulatoryReportRequired
      harmSeverity
      correctiveAction
      createdAt
      updatedAt
    }
  }
`;

export const GET_COMPLAINT = gql`
  query GetComplaint($id: String!) {
    complaint(id: $id) {
      id
      pmsCycleId
      date
      reportDate
      description
      deviceIdentifier
      lotNumber
      serialNumber
      severity
      classification
      classificationDescription
      status
      resolution
      resolutionDate
      source
      externalId
      isIncident
      regulatoryReportRequired
      harmSeverity
      correctiveAction
      createdAt
      updatedAt
    }
  }
`;

// --- Story 6.6 ---

export const GET_TREND_ANALYSES = gql`
  query GetTrendAnalyses($cycleId: String!) {
    trendAnalyses(cycleId: $cycleId) {
      id
      pmsCycleId
      analysisDate
      createdById
      complaintTrends
      severityDistribution
      classificationDistribution
      significantChanges
      conclusions
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_INSTALLED_BASE_ENTRIES = gql`
  query GetInstalledBaseEntries($cycleId: String!) {
    installedBaseEntries(cycleId: $cycleId) {
      id
      pmsCycleId
      periodStart
      periodEnd
      totalUnitsShipped
      activeDevices
      regionBreakdown
    }
  }
`;

// --- Story 6.9 ---

export const GET_CER_UPDATE_DECISION = gql`
  query GetCerUpdateDecision($cycleId: String!) {
    cerUpdateDecision(cycleId: $cycleId) {
      id
      pmsCycleId
      benefitRiskReAssessment
      conclusion
      justification
      materialChangesIdentified
      materialChangesDescription
      status
      decidedBy
      decidedAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_CER_UPDATE_DECISIONS = gql`
  query GetCerUpdateDecisions($projectId: String!) {
    cerUpdateDecisions(projectId: $projectId) {
      id
      pmsCycleId
      benefitRiskReAssessment
      conclusion
      justification
      materialChangesIdentified
      materialChangesDescription
      status
      decidedBy
      decidedAt
      createdAt
      updatedAt
    }
  }
`;
