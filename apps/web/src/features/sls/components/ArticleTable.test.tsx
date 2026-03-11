import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_ARTICLES } from '../graphql/queries';

import { ArticleTable } from './ArticleTable';

const mockArticles = [
  {
    id: 'art-1',
    title: 'Efficacy of cervical disc replacement in degenerative disc disease',
    authors: ['Smith J', 'Johnson A', 'Williams B'],
    doi: '10.1000/test-doi-1',
    pmid: '12345678',
    publicationDate: '2024-03-15',
    journal: 'Spine Journal',
    sourceDatabase: 'PUBMED',
    status: 'INCLUDED',
    relevanceScore: 85,
    aiCategory: 'likely_relevant',
    aiExclusionCode: null,
    customFilterScore: null,
    pdfStatus: null,
  },
  {
    id: 'art-2',
    title: 'Long-term outcomes after anterior cervical discectomy and fusion',
    authors: ['Brown C', 'Davis D'],
    doi: '10.1000/test-doi-2',
    pmid: '87654321',
    publicationDate: '2023-08-20',
    journal: 'Journal of Neurosurgery',
    sourceDatabase: 'PMC',
    status: 'EXCLUDED',
    relevanceScore: 30,
    aiCategory: 'likely_irrelevant',
    aiExclusionCode: 'E1',
    customFilterScore: null,
    pdfStatus: null,
  },
  {
    id: 'art-3',
    title: 'Conservative vs surgical treatment of cervical myelopathy',
    authors: ['Wilson E'],
    doi: null,
    pmid: null,
    publicationDate: '2025-01-10',
    journal: 'BMC Musculoskeletal Disorders',
    sourceDatabase: 'GOOGLE_SCHOLAR',
    status: 'PENDING',
    relevanceScore: null,
    aiCategory: null,
    aiExclusionCode: null,
    customFilterScore: null,
    pdfStatus: null,
  },
  {
    id: 'art-4',
    title: 'Meta-analysis of cervical arthroplasty studies',
    authors: [],
    doi: '10.1000/test-doi-4',
    pmid: '11111111',
    publicationDate: null,
    journal: null,
    sourceDatabase: 'PUBMED',
    status: 'SCORED',
    relevanceScore: 55,
    aiCategory: 'uncertain',
    aiExclusionCode: null,
    customFilterScore: null,
    pdfStatus: null,
  },
];

const mockArticlesNoScores = mockArticles.map((a) => ({
  ...a,
  relevanceScore: null,
  aiCategory: null,
  aiExclusionCode: null,
}));

function makeArticleMock(
  sessionId: string,
  articles: typeof mockArticles,
  filter: Record<string, unknown> = {},
  total?: number,
): MockedResponse {
  return {
    request: {
      query: GET_ARTICLES,
      variables: {
        sessionId,
        filter: {
          search: filter.search ?? undefined,
          status: filter.status ?? undefined,
        },
        offset: 0,
        limit: 100,
      },
    },
    result: {
      data: {
        articles: {
          items: articles,
          total: total ?? articles.length,
          offset: 0,
          limit: 100,
        },
      },
    },
  };
}

function makeLoadingMock(sessionId: string): MockedResponse {
  return {
    request: {
      query: GET_ARTICLES,
      variables: {
        sessionId,
        filter: { search: undefined, status: undefined },
        offset: 0,
        limit: 100,
      },
    },
    result: {
      data: {
        articles: {
          items: [],
          total: 0,
          offset: 0,
          limit: 100,
        },
      },
    },
    delay: 100000, // Very long delay to simulate loading
  };
}

describe('ArticleTable', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    onArticleSelect: vi.fn(),
    filter: {},
    onFilterChange: vi.fn(),
  };

  const defaultMock = makeArticleMock('sess-1', mockArticles);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with column headers', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    expect(await screen.findByTestId('article-table')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-title')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-authors')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-year')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-sourceDatabase')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-status')).toBeInTheDocument();
  });

  it('renders article rows with correct data', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    expect(await screen.findByTestId('article-row-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('article-row-art-2')).toBeInTheDocument();
    expect(screen.getByTestId('article-row-art-3')).toBeInTheDocument();
    expect(screen.getByText(/Efficacy of cervical disc replacement/)).toBeInTheDocument();
  });

  it('truncates authors to first 2 with et al.', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    const row = await screen.findByTestId('article-row-art-1');
    expect(row).toHaveTextContent('Smith J, Johnson A et al.');
  });

  it('shows full author list when 2 or fewer', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    const row = await screen.findByTestId('article-row-art-2');
    expect(row).toHaveTextContent('Brown C, Davis D');
  });

  it('shows "Unknown" when no authors', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    const row = await screen.findByTestId('article-row-art-4');
    expect(row).toHaveTextContent('Unknown');
  });

  it('shows year from publication date', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    const row1 = await screen.findByTestId('article-row-art-1');
    expect(row1).toHaveTextContent('2024');

    const row2 = screen.getByTestId('article-row-art-2');
    expect(row2).toHaveTextContent('2023');
  });

  it('shows dash when publication date is null', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    const row4 = await screen.findByTestId('article-row-art-4');
    expect(row4).toHaveTextContent('-');
  });

  it('renders source database badge with correct label', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('source-badge-art-1')).toHaveTextContent('PubMed');
    expect(screen.getByTestId('source-badge-art-2')).toHaveTextContent('PubMed Central');
    expect(screen.getByTestId('source-badge-art-3')).toHaveTextContent('Google Scholar');
  });

  it('renders status badges with correct labels', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('status-badge-art-1')).toHaveTextContent('Included');
    expect(screen.getByTestId('status-badge-art-2')).toHaveTextContent('Excluded');
    expect(screen.getByTestId('status-badge-art-3')).toHaveTextContent('Pending');
    expect(screen.getByTestId('status-badge-art-4')).toHaveTextContent('Scored');
  });

  it('renders status accent bars with correct colors', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    const accent1 = screen.getByTestId('status-accent-art-1');
    expect(accent1.className).toContain('bg-emerald-500');

    const accent2 = screen.getByTestId('status-accent-art-2');
    expect(accent2.className).toContain('bg-red-500');

    const accent3 = screen.getByTestId('status-accent-art-3');
    expect(accent3.className).toContain('bg-gray-400');

    const accent4 = screen.getByTestId('status-accent-art-4');
    expect(accent4.className).toContain('bg-orange-500');
  });

  it('calls onArticleSelect when a row is clicked', async () => {
    const onArticleSelect = vi.fn();
    renderWithApollo(<ArticleTable {...defaultProps} onArticleSelect={onArticleSelect} />, [
      defaultMock,
    ]);

    fireEvent.click(await screen.findByTestId('article-row-art-2'));
    expect(onArticleSelect).toHaveBeenCalledWith('art-2');
  });

  it('calls onArticleSelect on Enter key press', async () => {
    const onArticleSelect = vi.fn();
    renderWithApollo(<ArticleTable {...defaultProps} onArticleSelect={onArticleSelect} />, [
      defaultMock,
    ]);

    fireEvent.keyDown(await screen.findByTestId('article-row-art-1'), { key: 'Enter' });
    expect(onArticleSelect).toHaveBeenCalledWith('art-1');
  });

  it('toggles sort when column header is clicked', async () => {
    const onFilterChange = vi.fn();
    renderWithApollo(<ArticleTable {...defaultProps} onFilterChange={onFilterChange} />, [
      defaultMock,
    ]);

    await screen.findByTestId('article-row-art-1');

    fireEvent.click(screen.getByTestId('column-header-title'));

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'title', sortOrder: 'ASC' }),
    );
  });

  it('toggles sort order from ASC to DESC when same column clicked again', async () => {
    const onFilterChange = vi.fn();
    renderWithApollo(
      <ArticleTable
        {...defaultProps}
        filter={{ sortBy: 'title', sortOrder: 'ASC' }}
        onFilterChange={onFilterChange}
      />,
      [defaultMock],
    );

    await screen.findByTestId('article-row-art-1');

    fireEvent.click(screen.getByTestId('column-header-title'));

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'title', sortOrder: 'DESC' }),
    );
  });

  it('shows sort indicator for active sort column', async () => {
    renderWithApollo(
      <ArticleTable {...defaultProps} filter={{ sortBy: 'title', sortOrder: 'ASC' }} />,
      [defaultMock],
    );

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('sort-asc-title')).toBeInTheDocument();
  });

  it('shows descending sort indicator', async () => {
    renderWithApollo(
      <ArticleTable {...defaultProps} filter={{ sortBy: 'year', sortOrder: 'DESC' }} />,
      [defaultMock],
    );

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('sort-desc-year')).toBeInTheDocument();
  });

  it('renders search input in filter row', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('filter-row')).toBeInTheDocument();
    expect(screen.getByTestId('article-search-input')).toBeInTheDocument();
  });

  it('calls onFilterChange with search text on Enter key', async () => {
    const onFilterChange = vi.fn();
    renderWithApollo(<ArticleTable {...defaultProps} onFilterChange={onFilterChange} />, [
      defaultMock,
    ]);

    await screen.findByTestId('article-row-art-1');

    const input = screen.getByTestId('article-search-input');
    fireEvent.change(input, { target: { value: 'cervical' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'cervical' }));
  });

  it('selects an individual article checkbox', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    const checkbox = screen.getByTestId('select-article-art-1');
    fireEvent.click(checkbox);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('1 article selected');
  });

  it('selects all articles via select-all checkbox', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    const selectAll = screen.getByTestId('select-all-checkbox');
    fireEvent.click(selectAll);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('4 articles selected');
  });

  it('deselects all when select-all is clicked while all selected', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    const selectAll = screen.getByTestId('select-all-checkbox');
    // Select all
    fireEvent.click(selectAll);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('4 articles selected');

    // Deselect all
    fireEvent.click(selectAll);
    expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument();
  });

  it('shows loading state when no articles and loading', () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [makeLoadingMock('sess-1')]);

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('shows empty state when no articles found', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [makeArticleMock('sess-1', [])]);

    expect(await screen.findByTestId('empty-articles')).toBeInTheDocument();
    expect(screen.getByText('No articles found.')).toBeInTheDocument();
  });

  it('shows article count in table footer', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('table-footer')).toHaveTextContent('Showing 4 of 4 articles');
  });

  it('has role="table" on the table element', async () => {
    renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('has aria-sort attributes on column headers', async () => {
    renderWithApollo(
      <ArticleTable {...defaultProps} filter={{ sortBy: 'title', sortOrder: 'ASC' }} />,
      [defaultMock],
    );

    await screen.findByTestId('article-row-art-1');

    expect(screen.getByTestId('column-header-title')).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByTestId('column-header-authors')).toHaveAttribute('aria-sort', 'none');
  });

  describe('AI scoring columns', () => {
    it('shows AI Score, AI Category, and Exclusion Code column headers when articles have scores', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-1');

      expect(screen.getByTestId('column-header-aiScore')).toBeInTheDocument();
      expect(screen.getByTestId('column-header-aiCategory')).toBeInTheDocument();
      expect(screen.getByTestId('column-header-aiExclusionCode')).toBeInTheDocument();
    });

    it('hides AI columns when no articles have scores', async () => {
      const noScoresMock = makeArticleMock('sess-1', mockArticlesNoScores);

      renderWithApollo(<ArticleTable {...defaultProps} />, [noScoresMock]);

      await screen.findByTestId('article-row-art-1');

      expect(screen.queryByTestId('column-header-aiScore')).not.toBeInTheDocument();
      expect(screen.queryByTestId('column-header-aiCategory')).not.toBeInTheDocument();
      expect(screen.queryByTestId('column-header-aiExclusionCode')).not.toBeInTheDocument();
    });

    it('renders AI score badge with green color for score >= 75', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-1');

      const badge = screen.getByTestId('ai-score-badge-art-1');
      expect(badge).toHaveTextContent('85');
      expect(badge.className).toContain('bg-emerald-100');
    });

    it('renders AI score badge with orange color for score 40-74', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-4');

      const badge = screen.getByTestId('ai-score-badge-art-4');
      expect(badge).toHaveTextContent('55');
      expect(badge.className).toContain('bg-orange-100');
    });

    it('renders AI score badge with red color for score < 40', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-2');

      const badge = screen.getByTestId('ai-score-badge-art-2');
      expect(badge).toHaveTextContent('30');
      expect(badge.className).toContain('bg-red-100');
    });

    it('renders AI category badge with correct labels', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-1');

      expect(screen.getByTestId('ai-category-badge-art-1')).toHaveTextContent('Likely Relevant');
      expect(screen.getByTestId('ai-category-badge-art-2')).toHaveTextContent('Likely Irrelevant');
      expect(screen.getByTestId('ai-category-badge-art-4')).toHaveTextContent('Uncertain');
    });

    it('renders AI exclusion code when present', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-2');

      expect(screen.getByTestId('ai-exclusion-code-art-2')).toHaveTextContent('E1');
    });

    it('renders empty exclusion code cell when null', async () => {
      renderWithApollo(<ArticleTable {...defaultProps} />, [defaultMock]);

      await screen.findByTestId('article-row-art-1');

      expect(screen.getByTestId('ai-exclusion-code-art-1')).toHaveTextContent('');
    });
  });
});
