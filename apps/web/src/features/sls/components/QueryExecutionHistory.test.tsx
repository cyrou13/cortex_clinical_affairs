import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_QUERY_EXECUTIONS } from '../graphql/queries';

import { QueryExecutionHistory } from './QueryExecutionHistory';

const mockExecutions = [
  {
    id: 'exec-1',
    queryId: 'query-1',
    database: 'PUBMED',
    status: 'SUCCESS',
    articlesFound: 3200,
    articlesImported: 2800,
    reproducibilityStatement: 'Search conducted on PubMed on 2026-02-14 using the query string...',
    errorMessage: null,
    executedAt: '2026-02-14T10:00:00Z',
    completedAt: '2026-02-14T10:05:00Z',
  },
  {
    id: 'exec-2',
    queryId: 'query-1',
    database: 'GOOGLE_SCHOLAR',
    status: 'FAILED',
    articlesFound: null,
    articlesImported: null,
    reproducibilityStatement: null,
    errorMessage: 'Connection timeout after 30s',
    executedAt: '2026-02-14T10:00:00Z',
    completedAt: '2026-02-14T10:01:00Z',
  },
  {
    id: 'exec-3',
    queryId: 'query-1',
    database: 'CLINICAL_TRIALS',
    status: 'SUCCESS',
    articlesFound: 1500,
    articlesImported: 1200,
    reproducibilityStatement: null,
    errorMessage: null,
    executedAt: '2026-02-13T08:00:00Z',
    completedAt: '2026-02-13T08:03:00Z',
  },
];

function makeMock(queryId: string, executions: typeof mockExecutions): MockedResponse {
  return {
    request: {
      query: GET_QUERY_EXECUTIONS,
      variables: { queryId },
    },
    result: {
      data: { queryExecutions: executions },
    },
  };
}

function makeLoadingMock(queryId: string): MockedResponse {
  return {
    request: {
      query: GET_QUERY_EXECUTIONS,
      variables: { queryId },
    },
    result: {
      data: { queryExecutions: [] },
    },
    delay: 100000, // Very long delay to simulate loading state
  };
}

describe('QueryExecutionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders execution list', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    expect(await screen.findByText('Execution History')).toBeInTheDocument();
    expect(screen.getByTestId('execution-history')).toBeInTheDocument();
    expect(screen.getByTestId('execution-row-exec-1')).toBeInTheDocument();
    expect(screen.getByTestId('execution-row-exec-2')).toBeInTheDocument();
    expect(screen.getByTestId('execution-row-exec-3')).toBeInTheDocument();
  });

  it('shows status badges for each execution', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    await screen.findByText('Execution History');

    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBe(3);

    expect(screen.getAllByText('Success').length).toBe(2);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows database badges', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    await screen.findByText('Execution History');

    expect(screen.getByText('PubMed')).toBeInTheDocument();
    expect(screen.getByText('Google Scholar')).toBeInTheDocument();
    expect(screen.getByText('ClinicalTrials.gov')).toBeInTheDocument();
  });

  it('shows articles found and imported counts', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    await screen.findByText('Execution History');

    expect(screen.getByTestId('articles-found-exec-1')).toHaveTextContent('3,200 found');
    expect(screen.getByTestId('articles-imported-exec-1')).toHaveTextContent('2,800 imported');
  });

  it('shows empty state when no executions', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [makeMock('query-1', [])]);

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No executions yet')).toBeInTheDocument();
    expect(screen.getByText('Execute this query to see results here')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [makeLoadingMock('query-1')]);

    expect(screen.getByText('Loading execution history...')).toBeInTheDocument();
  });

  it('expands reproducibility statement on click', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    await screen.findByText('Execution History');

    // Initially collapsed
    expect(screen.queryByTestId('execution-details-exec-1')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByTestId('execution-toggle-exec-1'));

    expect(screen.getByTestId('execution-details-exec-1')).toBeInTheDocument();
    expect(screen.getByTestId('reproducibility-exec-1')).toHaveTextContent(
      'Search conducted on PubMed on 2026-02-14 using the query string...',
    );
  });

  it('shows error message for failed execution when expanded', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    await screen.findByText('Execution History');

    fireEvent.click(screen.getByTestId('execution-toggle-exec-2'));

    expect(screen.getByTestId('error-message-exec-2')).toHaveTextContent(
      'Connection timeout after 30s',
    );
  });

  it('does not show articles for failed executions without counts', async () => {
    renderWithApollo(<QueryExecutionHistory queryId="query-1" />, [
      makeMock('query-1', mockExecutions),
    ]);

    await screen.findByText('Execution History');

    expect(screen.queryByTestId('articles-found-exec-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('articles-imported-exec-2')).not.toBeInTheDocument();
  });
});
