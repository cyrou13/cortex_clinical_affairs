import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ScreeningPanel } from './ScreeningPanel';

const mockArticles = [
  {
    id: 'art-1',
    title: 'Efficacy of cervical disc replacement in degenerative disc disease',
    abstract: 'Background: Cervical disc replacement has emerged as an alternative...',
    status: 'SCORED',
    relevanceScore: 85,
    aiCategory: 'likely_relevant',
    aiExclusionCode: null,
    aiReasoning: 'Article discusses cervical disc replacement outcomes',
  },
  {
    id: 'art-2',
    title: 'Pediatric spinal surgery outcomes: a meta-analysis',
    abstract: 'Methods: We searched PubMed for pediatric studies...',
    status: 'EXCLUDED',
    relevanceScore: 25,
    aiCategory: 'likely_irrelevant',
    aiExclusionCode: 'E1',
    aiReasoning: 'Pediatric population outside scope',
  },
  {
    id: 'art-3',
    title: 'Cervical myelopathy treatment approaches',
    abstract: 'Results: Conservative vs surgical approaches were compared...',
    status: 'INCLUDED',
    relevanceScore: 92,
    aiCategory: 'likely_relevant',
    aiExclusionCode: null,
    aiReasoning: null,
  },
  {
    id: 'art-4',
    title: 'Uncertain relevance article about spinal fusion',
    abstract: 'This article examines various fusion techniques...',
    status: 'SCORED',
    relevanceScore: 55,
    aiCategory: 'uncertain',
    aiExclusionCode: null,
    aiReasoning: 'Partially relevant to scope',
  },
];

describe('ScreeningPanel', () => {
  const mockMutate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);
  });

  function renderWithData(articles = mockArticles) {
    mockUseQuery.mockReturnValue({
      data: { screeningArticles: articles },
      loading: false,
      error: null,
    });
    return render(<ScreeningPanel sessionId="session-1" />);
  }

  it('renders screening panel', () => {
    renderWithData();
    expect(screen.getByTestId('screening-panel')).toBeInTheDocument();
  });

  it('renders filter tabs with counts', () => {
    renderWithData();
    expect(screen.getByTestId('screening-filter-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('(4)');
  });

  it('renders keyboard hints', () => {
    renderWithData();
    expect(screen.getByTestId('keyboard-hints')).toBeInTheDocument();
    expect(screen.getByTestId('keyboard-hints')).toHaveTextContent('I = Include');
  });

  it('renders articles in table', () => {
    renderWithData();
    expect(screen.getByTestId('screening-table')).toBeInTheDocument();
    expect(screen.getByTestId('screening-row-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('screening-row-art-2')).toBeInTheDocument();
  });

  it('renders AI score badge with green for high score', () => {
    renderWithData();
    const badge = screen.getByTestId('score-badge-art-1');
    expect(badge).toHaveTextContent('85');
    expect(badge.className).toContain('bg-emerald');
  });

  it('renders AI score badge with red for low score', () => {
    renderWithData();
    const badge = screen.getByTestId('score-badge-art-2');
    expect(badge).toHaveTextContent('25');
    expect(badge.className).toContain('bg-red');
  });

  it('renders AI score badge with orange for uncertain score', () => {
    renderWithData();
    const badge = screen.getByTestId('score-badge-art-4');
    expect(badge).toHaveTextContent('55');
    expect(badge.className).toContain('bg-orange');
  });

  it('selects article row on click', () => {
    renderWithData();
    fireEvent.click(screen.getByTestId('screening-row-art-1'));
    expect(screen.getByTestId('screening-row-art-1').className).toContain('blue-50');
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ScreeningPanel sessionId="session-1" />);
    expect(screen.getByTestId('screening-loading')).toBeInTheDocument();
  });

  it('shows empty state when no articles', () => {
    renderWithData([]);
    expect(screen.getByTestId('screening-empty')).toBeInTheDocument();
  });

  it('renders left border accent for included articles (green)', () => {
    renderWithData();
    const row = screen.getByTestId('screening-row-art-3');
    expect(row.className).toContain('border-l-emerald');
  });

  it('renders left border accent for excluded articles (red)', () => {
    renderWithData();
    const row = screen.getByTestId('screening-row-art-2');
    expect(row.className).toContain('border-l-red');
  });

  it('renders status labels', () => {
    renderWithData();
    expect(screen.getByTestId('status-label-art-1')).toHaveTextContent('Scored');
    expect(screen.getByTestId('status-label-art-2')).toHaveTextContent('Excluded');
    expect(screen.getByTestId('status-label-art-3')).toHaveTextContent('Included');
  });

  it('truncates abstract preview', () => {
    renderWithData();
    // Abstract for art-1 is long, should be truncated to 50 chars + ellipsis
    const rows = screen.getAllByRole('row');
    // First data row (index 1, since 0 is header)
    const cells = rows[1]!.querySelectorAll('td');
    expect(cells[2]!.textContent!.length).toBeLessThanOrEqual(54); // 50 + "..."
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Network error'),
    });
    render(<ScreeningPanel sessionId="session-1" />);
    expect(screen.getByTestId('screening-error')).toBeInTheDocument();
  });
});
