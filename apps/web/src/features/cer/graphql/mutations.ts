import { gql } from '@apollo/client';

// --- Story 5.1 ---

export const CREATE_CER = gql`
  mutation CreateCer($projectId: String!, $regulatoryContext: String!, $versionType: String!, $currentVersion: String) {
    createCer(projectId: $projectId, regulatoryContext: $regulatoryContext, versionType: $versionType, currentVersion: $currentVersion) {
      cerVersionId
      versionNumber
      regulatoryContext
      upstreamLinksCount
    }
  }
`;

export const LINK_CER_UPSTREAM = gql`
  mutation LinkCerUpstream($cerVersionId: String!, $moduleType: String!, $moduleId: String!) {
    linkCerUpstream(cerVersionId: $cerVersionId, moduleType: $moduleType, moduleId: $moduleId) {
      linkId
      cerVersionId
      moduleType
      moduleId
      lockedAt
    }
  }
`;

// --- Story 5.2 ---

export const CREATE_CER_EXTERNAL_DOC = gql`
  mutation CreateCerExternalDoc($cerVersionId: String!, $title: String!, $version: String!, $date: String!, $summary: String!, $documentType: String!) {
    createCerExternalDoc(cerVersionId: $cerVersionId, title: $title, version: $version, date: $date, summary: $summary, documentType: $documentType) {
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

export const UPDATE_CER_EXTERNAL_DOC = gql`
  mutation UpdateCerExternalDoc($documentId: String!, $title: String, $version: String, $date: String, $summary: String, $documentType: String) {
    updateCerExternalDoc(documentId: $documentId, title: $title, version: $version, date: $date, summary: $summary, documentType: $documentType) {
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

export const DELETE_CER_EXTERNAL_DOC = gql`
  mutation DeleteCerExternalDoc($documentId: String!) {
    deleteCerExternalDoc(documentId: $documentId)
  }
`;

export const UPDATE_EXTERNAL_DOC_VERSION = gql`
  mutation UpdateExternalDocVersion($documentId: String!, $newVersion: String!, $newDate: String!, $newSummary: String) {
    updateExternalDocVersion(documentId: $documentId, newVersion: $newVersion, newDate: $newDate, newSummary: $newSummary) {
      documentId
      previousVersion
      newVersion
      archivedHistoryId
      impactedSectionCount
    }
  }
`;

// --- Story 5.3 ---

export const CREATE_NAMED_DEVICE_SEARCH = gql`
  mutation CreateNamedDeviceSearch($cerVersionId: String!, $deviceName: String!, $keywords: [String!]!, $databases: [String!]!) {
    createNamedDeviceSearch(cerVersionId: $cerVersionId, deviceName: $deviceName, keywords: $keywords, databases: $databases) {
      searchId
      deviceName
      databases
      status
    }
  }
`;

// --- Story 5.4 ---

export const ASSEMBLE_CER_SECTIONS = gql`
  mutation AssembleCerSections($cerVersionId: String!) {
    assembleCerSections(cerVersionId: $cerVersionId) {
      cerVersionId
      sectionCount
      sectionIds
      jobIds
    }
  }
`;

// --- Story 5.5 ---

export const REVIEW_CER_SECTION = gql`
  mutation ReviewCerSection($cerSectionId: String!, $content: JSON!, $targetStatus: String!) {
    reviewCerSection(cerSectionId: $cerSectionId, content: $content, targetStatus: $targetStatus) {
      cerSectionId
      status
      humanEditPercentage
      wordCount
    }
  }
`;

export const SAVE_CER_SECTION_CONTENT = gql`
  mutation SaveCerSectionContent($cerSectionId: String!, $content: JSON!) {
    saveCerSectionContent(cerSectionId: $cerSectionId, content: $content) {
      cerSectionId
      wordCount
      savedAt
    }
  }
`;

// --- Story 5.7 ---

export const GENERATE_GSPR = gql`
  mutation GenerateGspr($cerVersionId: String!, $deviceClass: String!) {
    generateGspr(cerVersionId: $cerVersionId, deviceClass: $deviceClass) {
      cerVersionId
      deviceClass
      totalRequirements
      rows
    }
  }
`;

export const GENERATE_COMPLIANCE_STATEMENT = gql`
  mutation GenerateComplianceStatement($cerVersionId: String!) {
    generateComplianceStatement(cerVersionId: $cerVersionId) {
      cerVersionId
      summary
      gaps
      conclusion
      statementText
    }
  }
`;

export const UPDATE_GSPR_ROW = gql`
  mutation UpdateGsprRow($gsprMatrixRowId: String!, $status: String, $evidenceReferences: [String!], $notes: String) {
    updateGsprRow(gsprMatrixRowId: $gsprMatrixRowId, status: $status, evidenceReferences: $evidenceReferences, notes: $notes) {
      id
      gsprId
      status
      evidenceReferences
      notes
    }
  }
`;

// --- Story 5.8 ---

export const DETERMINE_BENEFIT_RISK = gql`
  mutation DetermineBenefitRisk($cerVersionId: String!) {
    determineBenefitRisk(cerVersionId: $cerVersionId) {
      cerVersionId
      benefits
      risks
      mitigations
      riskMatrix
    }
  }
`;

export const UPDATE_BENEFIT = gql`
  mutation UpdateBenefit($benefitRiskItemId: String!, $description: String, $evidenceLinks: [String!]) {
    updateBenefit(benefitRiskItemId: $benefitRiskItemId, description: $description, evidenceLinks: $evidenceLinks) {
      id
      description
      riskLevel
      updatedFields
    }
  }
`;

export const UPDATE_RISK = gql`
  mutation UpdateRisk($benefitRiskItemId: String!, $description: String, $severity: String, $probability: String, $evidenceLinks: [String!]) {
    updateRisk(benefitRiskItemId: $benefitRiskItemId, description: $description, severity: $severity, probability: $probability, evidenceLinks: $evidenceLinks) {
      id
      description
      riskLevel
      updatedFields
    }
  }
`;

export const UPDATE_MITIGATION = gql`
  mutation UpdateMitigation($mitigationId: String!, $description: String, $residualRiskLevel: String) {
    updateMitigation(mitigationId: $mitigationId, description: $description, residualRiskLevel: $residualRiskLevel) {
      id
      description
      riskLevel
      updatedFields
    }
  }
`;

// --- Story 5.9 ---

export const MANAGE_BIBLIOGRAPHY = gql`
  mutation ManageBibliography($cerVersionId: String!, $citationStyle: String!) {
    manageBibliography(cerVersionId: $cerVersionId, citationStyle: $citationStyle) {
      cerVersionId
      totalEntries
      entries
      citationStyle
    }
  }
`;

// --- Story 5.11 ---

export const ASSIGN_EVALUATOR = gql`
  mutation AssignEvaluator($cerVersionId: String!, $sectionId: String!, $userId: String!, $role: String!) {
    assignEvaluator(cerVersionId: $cerVersionId, sectionId: $sectionId, userId: $userId, role: $role) {
      id
      cerVersionId
      sectionId
      userId
      role
    }
  }
`;

export const REMOVE_EVALUATOR = gql`
  mutation RemoveEvaluator($evaluatorId: String!) {
    removeEvaluator(evaluatorId: $evaluatorId)
  }
`;

export const E_SIGN_CER = gql`
  mutation ESignCer($cerVersionId: String!, $action: String!) {
    eSignCer(cerVersionId: $cerVersionId, action: $action) {
      signatureId
      userId
      cerVersionId
      documentHash
      signedAt
    }
  }
`;

// --- Story 5.12 ---

export const CREATE_CER_VERSION = gql`
  mutation CreateCerVersion($projectId: String!, $previousVersionId: String, $versionType: String!) {
    createCerVersion(projectId: $projectId, previousVersionId: $previousVersionId, versionType: $versionType) {
      cerVersionId
      versionNumber
      versionType
      duplicatedSections
    }
  }
`;

// --- Story 5.13 ---

export const EXPORT_CER = gql`
  mutation ExportCer($cerVersionId: String!, $exportFormat: String!) {
    exportCer(cerVersionId: $cerVersionId, exportFormat: $exportFormat) {
      jobId
      cerVersionId
      exportFormat
      status
    }
  }
`;

export const LOCK_CER = gql`
  mutation LockCer($cerVersionId: String!) {
    lockCer(cerVersionId: $cerVersionId) {
      cerVersionId
      lockedAt
      snapshotCount
    }
  }
`;
