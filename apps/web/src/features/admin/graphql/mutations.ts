import { gql } from '@apollo/client';

export const CREATE_LLM_CONFIG = gql`
  mutation CreateLlmConfig($input: CreateLlmConfigInput!) {
    createLlmConfig(input: $input) {
      id
      level
      provider
      model
    }
  }
`;

export const UPDATE_LLM_CONFIG = gql`
  mutation UpdateLlmConfig($id: String!, $input: UpdateLlmConfigInput!) {
    updateLlmConfig(id: $id, input: $input) {
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
      success
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
