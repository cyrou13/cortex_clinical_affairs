import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_ARTICLE_COUNT_BY_STATUS, GET_ARTICLES } from '../graphql/queries';
import { ArticlePoolDashboard } from './ArticlePoolDashboard';

const mockStatusCounts = [
  { status: 'PENDING', count: 150 },
  { status: 'SCORED', count: 80 },
  { status: 'INCLUDED', count: 45 },
  { status: 'EXCLUDED', count: 25 },
  { status: 'DUPLICATE', count: 30 },
];

function buildMocks(statusCounts = mockStatusCounts): MockedResponse[] {
  return [
    {
      request: {
        query: GET_ARTICLE_COUNT_BY_STATUS,
        variables: { sessionId: 'sess-1' },
      },
      result: {
        data: { articleCountByStatus: statusCounts },
      },
    },
    {
      request: {
        query: GET_ARTICLES,
        variables: { sessionId: 'sess-1', filter: {}, offset: 0, limit: 100 },
      },
      result: {
        data: { articles: { items: [], total: 0, offset: 0, limit: 100 } },
      },
    },
  ];
}

describe('ArticlePoolDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the article pool dashboard', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('article-pool-dashboard');
  });

  it('renders all metric cards with correct values', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('metric-total');

    expect(screen.getByTestId('metric-total')).toHaveTextContent('330');
    expect(screen.getByTestId('metric-duplicates')).toHaveTextContent('30');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('150');
    expect(screen.getByTestId('metric-scored')).toHaveTextContent('80');
    expect(screen.getByTestId('metric-included')).toHaveTextContent('45');
    expect(screen.getByTestId('metric-excluded')).toHaveTextContent('25');
  });

  it('renders metrics labels', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('metric-total');

    expect(screen.getByTestId('metric-total')).toHaveTextContent('Total Articles');
    expect(screen.getByTestId('metric-duplicates')).toHaveTextContent('Duplicates Removed');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('Pending');
    expect(screen.getByTestId('metric-scored')).toHaveTextContent('Scored');
    expect(screen.getByTestId('metric-included')).toHaveTextContent('Included');
    expect(screen.getByTestId('metric-excluded')).toHaveTextContent('Excluded');
  });

  it('renders filter tabs', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('filter-tabs');

    expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pending')).toBeInTheDocument();
    expect(screen.getByTestId('tab-scored')).toBeInTheDocument();
    expect(screen.getByTestId('tab-included')).toBeInTheDocument();
    expect(screen.getByTestId('tab-excluded')).toBeInTheDocument();
  });

  it('renders filter tab count badges', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('tab-count-all');

    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('330');
    expect(screen.getByTestId('tab-count-pending')).toHaveTextContent('150');
    expect(screen.getByTestId('tab-count-scored')).toHaveTextContent('80');
    expect(screen.getByTestId('tab-count-included')).toHaveTextContent('45');
    expect(screen.getByTestId('tab-count-excluded')).toHaveTextContent('25');
  });

  it('highlights the "All" tab by default', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('tab-all');

    const allTab = screen.getByTestId('tab-all');
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(allTab.className).toContain('border-[var(--cortex-blue-500)]');
  });

  it('switches active tab on click', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('tab-pending');

    const pendingTab = screen.getByTestId('tab-pending');
    fireEvent.click(pendingTab);

    expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-all')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the article table', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByTestId('article-table');
  });

  it('shows loading state', () => {
    // No mocks = queries never resolve = loading state
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, []);

    expect(screen.getByTestId('article-pool-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading article pool...')).toBeInTheDocument();
  });

  it('renders zero counts gracefully when no data', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks([]));
    await screen.findByTestId('metric-total');

    expect(screen.getByTestId('metric-total')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-duplicates')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('0');
  });

  it('has role="tablist" on filter tabs container', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByRole('tablist');

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('has role="tab" on each filter tab', async () => {
    renderWithApollo(<ArticlePoolDashboard sessionId="sess-1" />, buildMocks());
    await screen.findByRole('tablist');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
  });
});
