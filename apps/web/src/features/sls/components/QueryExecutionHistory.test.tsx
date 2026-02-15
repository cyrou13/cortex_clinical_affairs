import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { QueryExecutionHistory } from './QueryExecutionHistory';

const mockExecutions = [
  {
    id: 'exec-1',
    queryId: 'query-1',
    database: 'pubmed',
    status: 'SUCCESS',
    articlesFound: 3200,
    articlesImported: 2800,
    reproducibilityStatement:
      'Search conducted on PubMed on 2026-02-14 using the query string...',
    errorMessage: null,
    executedAt: '2026-02-14T10:00:00Z',
    completedAt: '2026-02-14T10:05:00Z',
  },
  {
    id: 'exec-2',
    queryId: 'query-1',
    database: 'cochrane',
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
    database: 'embase',
    status: 'SUCCESS',
    articlesFound: 1500,
    articlesImported: 1200,
    reproducibilityStatement: null,
    errorMessage: null,
    executedAt: '2026-02-13T08:00:00Z',
    completedAt: '2026-02-13T08:03:00Z',
  },
];

describe('QueryExecutionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders execution list', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    expect(screen.getByTestId('execution-history')).toBeInTheDocument();
    expect(screen.getByText('Execution History')).toBeInTheDocument();
    expect(screen.getByTestId('execution-row-exec-1')).toBeInTheDocument();
    expect(screen.getByTestId('execution-row-exec-2')).toBeInTheDocument();
    expect(screen.getByTestId('execution-row-exec-3')).toBeInTheDocument();
  });

  it('shows status badges for each execution', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBe(3);

    expect(screen.getAllByText('Success').length).toBe(2);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows database badges', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    expect(screen.getByText('PubMed')).toBeInTheDocument();
    expect(screen.getByText('Cochrane')).toBeInTheDocument();
    expect(screen.getByText('Embase')).toBeInTheDocument();
  });

  it('shows articles found and imported counts', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    expect(screen.getByTestId('articles-found-exec-1')).toHaveTextContent(
      '3,200 found',
    );
    expect(screen.getByTestId('articles-imported-exec-1')).toHaveTextContent(
      '2,800 imported',
    );
  });

  it('shows empty state when no executions', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: [] },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No executions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Execute this query to see results here'),
    ).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    expect(
      screen.getByText('Loading execution history...'),
    ).toBeInTheDocument();
  });

  it('expands reproducibility statement on click', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    // Initially collapsed
    expect(
      screen.queryByTestId('execution-details-exec-1'),
    ).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByTestId('execution-toggle-exec-1'));

    expect(
      screen.getByTestId('execution-details-exec-1'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('reproducibility-exec-1')).toHaveTextContent(
      'Search conducted on PubMed on 2026-02-14 using the query string...',
    );
  });

  it('shows error message for failed execution when expanded', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    fireEvent.click(screen.getByTestId('execution-toggle-exec-2'));

    expect(screen.getByTestId('error-message-exec-2')).toHaveTextContent(
      'Connection timeout after 30s',
    );
  });

  it('does not show articles for failed executions without counts', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: mockExecutions },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-1" />);

    expect(
      screen.queryByTestId('articles-found-exec-2'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('articles-imported-exec-2'),
    ).not.toBeInTheDocument();
  });

  it('passes queryId to the GraphQL query', () => {
    mockUseQuery.mockReturnValue({
      data: { queryExecutions: [] },
      loading: false,
    });

    render(<QueryExecutionHistory queryId="query-42" />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { queryId: 'query-42' },
      }),
    );
  });
});
