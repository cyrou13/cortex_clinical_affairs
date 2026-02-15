import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      avatarUrl
      role
      isActive
      mfaEnabled
      createdAt
    }
  }
`;

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export function useCurrentUser() {
  const { data, loading, error, refetch } = useQuery<{ me: CurrentUser | null }>(ME_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    user: data?.me ?? null,
    loading,
    error,
    refetch,
  };
}
