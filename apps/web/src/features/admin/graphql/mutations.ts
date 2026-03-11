import { gql } from '@apollo/client';

export const CREATE_LLM_CONFIG = gql`
  mutation CreateLlmConfig(
    $level: String!
    $projectId: String
    $taskType: String
    $provider: String!
    $model: String!
  ) {
    createLlmConfig(
      level: $level
      projectId: $projectId
      taskType: $taskType
      provider: $provider
      model: $model
    ) {
      id
      level
      provider
      model
    }
  }
`;

export const UPDATE_LLM_CONFIG = gql`
  mutation UpdateLlmConfig($id: String!, $provider: String, $model: String, $isActive: Boolean) {
    updateLlmConfig(id: $id, provider: $provider, model: $model, isActive: $isActive) {
      id
      level
      provider
      model
      isActive
    }
  }
`;

export const DELETE_LLM_CONFIG = gql`
  mutation DeleteLlmConfig($id: String!) {
    deleteLlmConfig(id: $id) {
      id
    }
  }
`;

export const CHECK_PROVIDER_HEALTH = gql`
  mutation CheckProviderHealth {
    checkProviderHealth {
      provider
      status
      lastCheckAt
    }
  }
`;

export const UPSERT_APP_SETTINGS = gql`
  mutation UpsertAppSettings($settings: [AppSettingInput!]!) {
    upsertAppSettings(settings: $settings)
  }
`;
