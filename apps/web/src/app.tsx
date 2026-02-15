import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from './shared/graphql/client';
import { AppLayout } from './shared/layouts/AppLayout';
import { CommandPalette } from './shared/components/CommandPalette';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import './app.css';

export function App() {
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AppLayout>
          <ErrorBoundary>
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
                Welcome to Cortex Clinical Affairs
              </h1>
              <p className="text-[var(--cortex-text-secondary)]">
                Select a project or module from the sidebar to begin.
              </p>
            </div>
          </ErrorBoundary>
        </AppLayout>
        <CommandPalette />
      </ApolloProvider>
    </ErrorBoundary>
  );
}
