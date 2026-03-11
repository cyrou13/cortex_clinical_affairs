import { gql } from '@apollo/client';

export const GET_LLM_CONFIGS = gql`
  query GetLlmConfigs($projectId: String) {
    llmConfigs(projectId: $projectId) {
      id
      level
      projectId
      taskType
      provider
      model
      isActive
      createdAt
    }
  }
`;

export const GET_RESOLVED_LLM_CONFIG = gql`
  query GetResolvedLlmConfig($projectId: String, $taskType: String!) {
    resolvedLlmConfig(projectId: $projectId, taskType: $taskType) {
      provider
      model
      level
      isActive
    }
  }
`;

export const GET_LLM_COST_SUMMARY = gql`
  query GetLlmCostSummary($projectId: String, $timeRange: String) {
    llmCostSummary(projectId: $projectId, timeRange: $timeRange) {
      totalCost
      byProvider {
        provider
        cost
        requests
      }
      byTaskType {
        taskType
        cost
        requests
      }
      byModel {
        model
        cost
        requests
      }
    }
  }
`;

export const GET_PROVIDER_HEALTH = gql`
  query GetProviderHealth {
    providerHealth {
      provider
      status
      lastCheckAt
    }
  }
`;

export const GET_APP_SETTINGS = gql`
  query GetAppSettings($category: String) {
    appSettings(category: $category) {
      id
      category
      key
      value
      encrypted
      updatedAt
    }
  }
`;
