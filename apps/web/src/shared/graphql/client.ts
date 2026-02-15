import { ApolloClient, InMemoryCache, HttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      ...(headers as Record<string, string>),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// TODO: Migrate token storage from localStorage to httpOnly cookies for XSS protection
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${wsProtocol}//${window.location.host}/graphql`,
    connectionParams: () => {
      const token = localStorage.getItem('access_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([authLink, httpLink]),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          projects: {
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
