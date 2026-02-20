import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from './shared/graphql/client';
import { AppLayout } from './shared/layouts/AppLayout';
import { CommandPalette } from './shared/components/CommandPalette';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { useRouter } from './router';
import './app.css';

export function App() {
  const page = useRouter();

  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AppLayout>
          <ErrorBoundary>{page}</ErrorBoundary>
        </AppLayout>
        <CommandPalette />
      </ApolloProvider>
    </ErrorBoundary>
  );
}
