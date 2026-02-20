import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { ScreeningPanel, GET_SCREENING_ARTICLES } from './ScreeningPanel';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildMocks(articles = mockArticles): MockedResponse[] {
    return [
      {
        request: {
          query: GET_SCREENING_ARTICLES,
          variables: { sessionId: 'session-1', filter: 'all' },
        },
        result: {
          data: { screeningArticles: articles },
        },
      },
    ];
  }

  it('renders screening panel', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    expect(await screen.findByTestId('screening-panel')).toBeInTheDocument();
  });

  it('renders filter tabs with counts', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    // Wait for articles to load first, then check tab count
    await screen.findByTestId('screening-table');
    expect(screen.getByTestId('screening-filter-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('(4)');
  });

  it('renders keyboard hints', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    expect(await screen.findByTestId('keyboard-hints')).toBeInTheDocument();
    expect(screen.getByTestId('keyboard-hints')).toHaveTextContent('I = Include');
  });

  it('renders articles in table', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    expect(await screen.findByTestId('screening-table')).toBeInTheDocument();
    expect(screen.getByTestId('screening-row-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('screening-row-art-2')).toBeInTheDocument();
  });

  it('renders AI score badge with green for high score', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    const badge = await screen.findByTestId('score-badge-art-1');
    expect(badge).toHaveTextContent('85');
    expect(badge.className).toContain('bg-emerald');
  });

  it('renders AI score badge with red for low score', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    const badge = await screen.findByTestId('score-badge-art-2');
    expect(badge).toHaveTextContent('25');
    expect(badge.className).toContain('bg-red');
  });

  it('renders AI score badge with orange for uncertain score', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    const badge = await screen.findByTestId('score-badge-art-4');
    expect(badge).toHaveTextContent('55');
    expect(badge.className).toContain('bg-orange');
  });

  it('selects article row on click', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    const row = await screen.findByTestId('screening-row-art-1');
    fireEvent.click(row);
    expect(row.className).toContain('blue-50');
  });

  it('shows loading state', () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, []);
    expect(screen.getByTestId('screening-loading')).toBeInTheDocument();
  });

  it('shows empty state when no articles', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks([]));
    expect(await screen.findByTestId('screening-empty')).toBeInTheDocument();
  });

  it('renders left border accent for included articles (green)', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    const row = await screen.findByTestId('screening-row-art-3');
    expect(row.className).toContain('border-l-emerald');
  });

  it('renders left border accent for excluded articles (red)', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    const row = await screen.findByTestId('screening-row-art-2');
    expect(row.className).toContain('border-l-red');
  });

  it('renders status labels', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    expect(await screen.findByTestId('status-label-art-1')).toHaveTextContent('Scored');
    expect(screen.getByTestId('status-label-art-2')).toHaveTextContent('Excluded');
    expect(screen.getByTestId('status-label-art-3')).toHaveTextContent('Included');
  });

  it('truncates abstract preview', async () => {
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, buildMocks());
    await screen.findByTestId('screening-table');
    // Abstract for art-1 is long, should be truncated to 50 chars + ellipsis
    const rows = screen.getAllByRole('row');
    // First data row (index 1, since 0 is header)
    const cells = rows[1]!.querySelectorAll('td');
    expect(cells[2]!.textContent!.length).toBeLessThanOrEqual(54); // 50 + "..."
  });

  it('shows error state', async () => {
    const errorMocks: MockedResponse[] = [
      {
        request: {
          query: GET_SCREENING_ARTICLES,
          variables: { sessionId: 'session-1', filter: 'all' },
        },
        error: new Error('Network error'),
      },
    ];
    renderWithApollo(<ScreeningPanel sessionId="session-1" />, errorMocks);
    expect(await screen.findByTestId('screening-error')).toBeInTheDocument();
  });
});
