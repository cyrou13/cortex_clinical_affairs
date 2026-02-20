import { gql } from '@apollo/client';

// --- Story 6.1 ---

export const CREATE_PMS_PLAN = gql`
  mutation CreatePmsPlan(
    $projectId: String!
    $cerVersionId: String!
    $updateFrequency: String!
    $dataCollectionMethods: [String!]!
  ) {
    createPmsPlan(
      projectId: $projectId
      cerVersionId: $cerVersionId
      updateFrequency: $updateFrequency
      dataCollectionMethods: $dataCollectionMethods
    ) {
      pmsPlanId
      projectId
      cerVersionId
      status
    }
  }
`;

export const UPDATE_PMS_PLAN = gql`
  mutation UpdatePmsPlan(
    $pmsPlanId: String!
    $updateFrequency: String
    $dataCollectionMethods: [String!]
  ) {
    updatePmsPlan(
      pmsPlanId: $pmsPlanId
      updateFrequency: $updateFrequency
      dataCollectionMethods: $dataCollectionMethods
    ) {
      pmsPlanId
      updateFrequency
      dataCollectionMethods
      status
    }
  }
`;

export const APPROVE_PMS_PLAN = gql`
  mutation ApprovePmsPlan($pmsPlanId: String!) {
    approvePmsPlan(pmsPlanId: $pmsPlanId) {
      pmsPlanId
      status
      approvedAt
    }
  }
`;

export const ACTIVATE_PMS_PLAN = gql`
  mutation ActivatePmsPlan($pmsPlanId: String!) {
    activatePmsPlan(pmsPlanId: $pmsPlanId) {
      pmsPlanId
      status
      activatedAt
    }
  }
`;

export const CONFIGURE_VIGILANCE_DATABASES = gql`
  mutation ConfigureVigilanceDatabases($pmsPlanId: String!, $databases: JSON!) {
    configureVigilanceDatabases(pmsPlanId: $pmsPlanId, databases: $databases) {
      id
      pmsPlanId
      databaseName
      enabled
      searchKeywords
    }
  }
`;

export const ADD_RESPONSIBILITY = gql`
  mutation AddResponsibility(
    $pmsPlanId: String!
    $activityType: String!
    $userId: String!
    $role: String!
    $description: String
  ) {
    addResponsibility(
      pmsPlanId: $pmsPlanId
      activityType: $activityType
      userId: $userId
      role: $role
      description: $description
    ) {
      id
      pmsPlanId
      activityType
      userId
      role
      description
    }
  }
`;

export const REMOVE_RESPONSIBILITY = gql`
  mutation RemoveResponsibility($responsibilityId: String!) {
    removeResponsibility(responsibilityId: $responsibilityId)
  }
`;

// --- Story 6.2 ---

export const POPULATE_GAP_REGISTRY = gql`
  mutation PopulateGapRegistry($pmsPlanId: String!) {
    populateGapRegistry(pmsPlanId: $pmsPlanId) {
      pmsPlanId
      populated
      duplicates
      totalGaps
    }
  }
`;

export const UPDATE_GAP_ENTRY = gql`
  mutation UpdateGapEntry(
    $gapEntryId: String!
    $description: String
    $severity: String
    $recommendedActivity: String
    $status: String
    $resolutionNotes: String
  ) {
    updateGapEntry(
      gapEntryId: $gapEntryId
      description: $description
      severity: $severity
      recommendedActivity: $recommendedActivity
      status: $status
      resolutionNotes: $resolutionNotes
    ) {
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
      resolutionNotes
      createdAt
      updatedAt
    }
  }
`;

export const ADD_GAP_ENTRY = gql`
  mutation AddGapEntry(
    $pmsPlanId: String!
    $description: String!
    $severity: String!
    $recommendedActivity: String!
  ) {
    addGapEntry(
      pmsPlanId: $pmsPlanId
      description: $description
      severity: $severity
      recommendedActivity: $recommendedActivity
    ) {
      id
      pmsPlanId
      sourceModule
      sourceId
      description
      severity
      recommendedActivity
      status
      manuallyCreated
      createdAt
    }
  }
`;

// --- Story 6.3 ---

export const CREATE_PMS_CYCLE = gql`
  mutation CreatePmsCycle(
    $pmsPlanId: String!
    $cerVersionId: String!
    $name: String!
    $startDate: String!
    $endDate: String!
  ) {
    createPmsCycle(
      pmsPlanId: $pmsPlanId
      cerVersionId: $cerVersionId
      name: $name
      startDate: $startDate
      endDate: $endDate
    ) {
      pmsCycleId
      pmsPlanId
      name
      status
      activityCount
    }
  }
`;

export const ACTIVATE_PMS_CYCLE = gql`
  mutation ActivatePmsCycle($cycleId: String!) {
    activatePmsCycle(cycleId: $cycleId) {
      pmsCycleId
      status
    }
  }
`;

export const COMPLETE_PMS_CYCLE = gql`
  mutation CompletePmsCycle($cycleId: String!) {
    completePmsCycle(cycleId: $cycleId) {
      pmsCycleId
      status
    }
  }
`;

// --- Story 6.4 ---

export const START_PMCF_ACTIVITY = gql`
  mutation StartPmcfActivity($activityId: String!) {
    startPmcfActivity(activityId: $activityId) {
      activityId
      activityType
      status
    }
  }
`;

export const COMPLETE_PMCF_ACTIVITY = gql`
  mutation CompletePmcfActivity(
    $activityId: String!
    $findingsSummary: String!
    $conclusions: String!
    $dataCollected: JSON
  ) {
    completePmcfActivity(
      activityId: $activityId
      findingsSummary: $findingsSummary
      conclusions: $conclusions
      dataCollected: $dataCollected
    ) {
      activityId
      activityType
      status
    }
  }
`;

export const UPDATE_PMCF_ACTIVITY = gql`
  mutation UpdatePmcfActivity(
    $activityId: String!
    $title: String
    $description: String
    $findingsSummary: String
    $conclusions: String
    $dataCollected: JSON
  ) {
    updatePmcfActivity(
      activityId: $activityId
      title: $title
      description: $description
      findingsSummary: $findingsSummary
      conclusions: $conclusions
      dataCollected: $dataCollected
    ) {
      activityId
      title
      status
      updatedFields
    }
  }
`;

export const REASSIGN_PMCF_ACTIVITY = gql`
  mutation ReassignPmcfActivity($activityId: String!, $newAssigneeId: String!) {
    reassignPmcfActivity(activityId: $activityId, newAssigneeId: $newAssigneeId) {
      activityId
      previousAssigneeId
      newAssigneeId
    }
  }
`;

// --- Story 6.5 ---

export const CREATE_COMPLAINT = gql`
  mutation CreateComplaint(
    $pmsCycleId: String!
    $date: String!
    $reportDate: String!
    $description: String!
    $deviceIdentifier: String!
    $severity: String!
    $classification: String!
    $lotNumber: String
    $serialNumber: String
    $classificationDescription: String
    $isIncident: Boolean
    $regulatoryReportRequired: Boolean
    $harmSeverity: String
  ) {
    createComplaint(
      pmsCycleId: $pmsCycleId
      date: $date
      reportDate: $reportDate
      description: $description
      deviceIdentifier: $deviceIdentifier
      severity: $severity
      classification: $classification
      lotNumber: $lotNumber
      serialNumber: $serialNumber
      classificationDescription: $classificationDescription
      isIncident: $isIncident
      regulatoryReportRequired: $regulatoryReportRequired
      harmSeverity: $harmSeverity
    ) {
      id
      pmsCycleId
      date
      description
      deviceIdentifier
      severity
      classification
      status
      source
      isIncident
    }
  }
`;

export const UPDATE_COMPLAINT = gql`
  mutation UpdateComplaint(
    $complaintId: String!
    $description: String
    $severity: String
    $classification: String
    $status: String
    $resolution: String
    $correctiveAction: String
  ) {
    updateComplaint(
      complaintId: $complaintId
      description: $description
      severity: $severity
      classification: $classification
      status: $status
      resolution: $resolution
      correctiveAction: $correctiveAction
    ) {
      id
      status
      updatedFields
    }
  }
`;

export const IMPORT_COMPLAINTS = gql`
  mutation ImportComplaints($pmsCycleId: String!, $complaints: JSON!, $source: String!) {
    importComplaints(pmsCycleId: $pmsCycleId, complaints: $complaints, source: $source) {
      pmsCycleId
      imported
      skipped
      errors
    }
  }
`;

// --- Story 6.6 ---

export const COMPUTE_TREND_ANALYSIS = gql`
  mutation ComputeTrendAnalysis($pmsCycleId: String!) {
    computeTrendAnalysis(pmsCycleId: $pmsCycleId) {
      trendAnalysisId
      pmsCycleId
      complaintTrends
      severityDistribution
      classificationDistribution
      significantChanges
      status
    }
  }
`;

export const FINALIZE_TREND_ANALYSIS = gql`
  mutation FinalizeTrendAnalysis($trendAnalysisId: String!, $conclusions: String!) {
    finalizeTrendAnalysis(trendAnalysisId: $trendAnalysisId, conclusions: $conclusions) {
      trendAnalysisId
      status
      conclusions
    }
  }
`;

export const CREATE_INSTALLED_BASE_ENTRY = gql`
  mutation CreateInstalledBaseEntry(
    $pmsCycleId: String!
    $periodStart: String!
    $periodEnd: String!
    $totalUnitsShipped: Int!
    $activeDevices: Int!
    $regionBreakdown: JSON
  ) {
    createInstalledBaseEntry(
      pmsCycleId: $pmsCycleId
      periodStart: $periodStart
      periodEnd: $periodEnd
      totalUnitsShipped: $totalUnitsShipped
      activeDevices: $activeDevices
      regionBreakdown: $regionBreakdown
    ) {
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

export const DELETE_INSTALLED_BASE_ENTRY = gql`
  mutation DeleteInstalledBaseEntry($entryId: String!) {
    deleteInstalledBaseEntry(entryId: $entryId)
  }
`;

// --- Story 6.7 ---

export const GENERATE_PMCF_REPORT = gql`
  mutation GeneratePmcfReport($pmsCycleId: String!) {
    generatePmcfReport(pmsCycleId: $pmsCycleId) {
      taskId
      pmsCycleId
      status
    }
  }
`;

// --- Story 6.8 ---

export const GENERATE_PSUR = gql`
  mutation GeneratePsur($pmsCycleId: String!) {
    generatePsur(pmsCycleId: $pmsCycleId) {
      taskId
      pmsCycleId
      status
    }
  }
`;

// --- Story 6.9 ---

export const CREATE_CER_UPDATE_DECISION = gql`
  mutation CreateCerUpdateDecision(
    $pmsCycleId: String!
    $benefitRiskReAssessment: String!
    $conclusion: String!
    $justification: String!
    $materialChangesIdentified: Boolean!
    $materialChangesDescription: String
  ) {
    createCerUpdateDecision(
      pmsCycleId: $pmsCycleId
      benefitRiskReAssessment: $benefitRiskReAssessment
      conclusion: $conclusion
      justification: $justification
      materialChangesIdentified: $materialChangesIdentified
      materialChangesDescription: $materialChangesDescription
    ) {
      id
      pmsCycleId
      conclusion
      status
      justification
      materialChangesIdentified
    }
  }
`;

export const FINALIZE_CER_UPDATE_DECISION = gql`
  mutation FinalizeCerUpdateDecision($decisionId: String!) {
    finalizeCerUpdateDecision(decisionId: $decisionId) {
      id
      pmsCycleId
      conclusion
      status
      decidedAt
    }
  }
`;

export const DELETE_PMS_PLAN = gql`
  mutation DeletePmsPlan($pmsPlanId: String!) {
    deletePmsPlan(pmsPlanId: $pmsPlanId)
  }
`;
