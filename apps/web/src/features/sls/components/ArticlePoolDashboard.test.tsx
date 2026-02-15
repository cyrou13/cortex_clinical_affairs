import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ArticlePoolDashboard } from './ArticlePoolDashboard';

const mockStatusCounts = [
  { status: 'PENDING', count: 150 },
  { status: 'SCORED', count: 80 },
  { status: 'INCLUDED', count: 45 },
  { status: 'EXCLUDED', count: 25 },
  { status: 'DUPLICATE', count: 30 },
];

describe('ArticlePoolDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(statusCounts = mockStatusCounts) {
    // First call: GET_ARTICLE_COUNT_BY_STATUS
    // Second call: GET_ARTICLES (from ArticleTable child)
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          data: { articleCountByStatus: statusCounts },
          loading: false,
        };
      }
      // ArticleTable's query
      return {
        data: { articles: { items: [], total: 0, offset: 0, limit: 100 } },
        loading: false,
        fetchMore: vi.fn(),
      };
    });
  }

  it('renders the article pool dashboard', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('article-pool-dashboard')).toBeInTheDocument();
  });

  it('renders all metric cards with correct values', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('metric-total')).toHaveTextContent('330');
    expect(screen.getByTestId('metric-duplicates')).toHaveTextContent('30');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('150');
    expect(screen.getByTestId('metric-scored')).toHaveTextContent('80');
    expect(screen.getByTestId('metric-included')).toHaveTextContent('45');
    expect(screen.getByTestId('metric-excluded')).toHaveTextContent('25');
  });

  it('renders metrics labels', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('metric-total')).toHaveTextContent('Total Articles');
    expect(screen.getByTestId('metric-duplicates')).toHaveTextContent('Duplicates Removed');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('Pending');
    expect(screen.getByTestId('metric-scored')).toHaveTextContent('Scored');
    expect(screen.getByTestId('metric-included')).toHaveTextContent('Included');
    expect(screen.getByTestId('metric-excluded')).toHaveTextContent('Excluded');
  });

  it('renders filter tabs', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('filter-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pending')).toBeInTheDocument();
    expect(screen.getByTestId('tab-scored')).toBeInTheDocument();
    expect(screen.getByTestId('tab-included')).toBeInTheDocument();
    expect(screen.getByTestId('tab-excluded')).toBeInTheDocument();
  });

  it('renders filter tab count badges', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('330');
    expect(screen.getByTestId('tab-count-pending')).toHaveTextContent('150');
    expect(screen.getByTestId('tab-count-scored')).toHaveTextContent('80');
    expect(screen.getByTestId('tab-count-included')).toHaveTextContent('45');
    expect(screen.getByTestId('tab-count-excluded')).toHaveTextContent('25');
  });

  it('highlights the "All" tab by default', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    const allTab = screen.getByTestId('tab-all');
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(allTab.className).toContain('border-[var(--cortex-blue-500)]');
  });

  it('switches active tab on click', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    const pendingTab = screen.getByTestId('tab-pending');
    fireEvent.click(pendingTab);

    expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-all')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the article table', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('article-table')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
    });

    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('article-pool-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading article pool...')).toBeInTheDocument();
  });

  it('renders zero counts gracefully when no data', () => {
    setupMocks([]);
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('metric-total')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-duplicates')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('0');
  });

  it('has role="tablist" on filter tabs container', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('has role="tab" on each filter tab', () => {
    setupMocks();
    render(<ArticlePoolDashboard sessionId="sess-1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
  });
});
