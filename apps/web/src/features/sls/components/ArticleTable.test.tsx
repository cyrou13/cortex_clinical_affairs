import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockFetchMore = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

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
    sourceDatabase: 'pubmed',
    status: 'INCLUDED',
    relevanceScore: 85,
    aiCategory: 'likely_relevant',
    aiExclusionCode: null,
  },
  {
    id: 'art-2',
    title: 'Long-term outcomes after anterior cervical discectomy and fusion',
    authors: ['Brown C', 'Davis D'],
    doi: '10.1000/test-doi-2',
    pmid: '87654321',
    publicationDate: '2023-08-20',
    journal: 'Journal of Neurosurgery',
    sourceDatabase: 'cochrane',
    status: 'EXCLUDED',
    relevanceScore: 30,
    aiCategory: 'likely_irrelevant',
    aiExclusionCode: 'E1',
  },
  {
    id: 'art-3',
    title: 'Conservative vs surgical treatment of cervical myelopathy',
    authors: ['Wilson E'],
    doi: null,
    pmid: null,
    publicationDate: '2025-01-10',
    journal: 'BMC Musculoskeletal Disorders',
    sourceDatabase: 'embase',
    status: 'PENDING',
    relevanceScore: null,
    aiCategory: null,
    aiExclusionCode: null,
  },
  {
    id: 'art-4',
    title: 'Meta-analysis of cervical arthroplasty studies',
    authors: [],
    doi: '10.1000/test-doi-4',
    pmid: '11111111',
    publicationDate: null,
    journal: null,
    sourceDatabase: 'pubmed',
    status: 'SCORED',
    relevanceScore: 55,
    aiCategory: 'uncertain',
    aiExclusionCode: null,
  },
];

const mockArticlesNoScores = mockArticles.map((a) => ({
  ...a,
  relevanceScore: null,
  aiCategory: null,
  aiExclusionCode: null,
}));

describe('ArticleTable', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    onArticleSelect: vi.fn(),
    filter: {},
    onFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchMore.mockResolvedValue({});
    mockUseQuery.mockReturnValue({
      data: {
        articles: {
          items: mockArticles,
          total: mockArticles.length,
          offset: 0,
          limit: 100,
        },
      },
      loading: false,
      fetchMore: mockFetchMore,
    });
  });

  it('renders the table with column headers', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('article-table')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-title')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-authors')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-year')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-sourceDatabase')).toBeInTheDocument();
    expect(screen.getByTestId('column-header-status')).toBeInTheDocument();
  });

  it('renders article rows with correct data', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('article-row-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('article-row-art-2')).toBeInTheDocument();
    expect(screen.getByTestId('article-row-art-3')).toBeInTheDocument();
    expect(screen.getByText(/Efficacy of cervical disc replacement/)).toBeInTheDocument();
  });

  it('truncates authors to first 2 with et al.', () => {
    render(<ArticleTable {...defaultProps} />);

    // art-1 has 3 authors - should show "Smith J, Johnson A et al."
    const row = screen.getByTestId('article-row-art-1');
    expect(row).toHaveTextContent('Smith J, Johnson A et al.');
  });

  it('shows full author list when 2 or fewer', () => {
    render(<ArticleTable {...defaultProps} />);

    // art-2 has 2 authors
    const row = screen.getByTestId('article-row-art-2');
    expect(row).toHaveTextContent('Brown C, Davis D');
  });

  it('shows "Unknown" when no authors', () => {
    render(<ArticleTable {...defaultProps} />);

    // art-4 has empty authors array
    const row = screen.getByTestId('article-row-art-4');
    expect(row).toHaveTextContent('Unknown');
  });

  it('shows year from publication date', () => {
    render(<ArticleTable {...defaultProps} />);

    const row1 = screen.getByTestId('article-row-art-1');
    expect(row1).toHaveTextContent('2024');

    const row2 = screen.getByTestId('article-row-art-2');
    expect(row2).toHaveTextContent('2023');
  });

  it('shows dash when publication date is null', () => {
    render(<ArticleTable {...defaultProps} />);

    const row4 = screen.getByTestId('article-row-art-4');
    expect(row4).toHaveTextContent('-');
  });

  it('renders source database badge with correct label', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('source-badge-art-1')).toHaveTextContent('PubMed');
    expect(screen.getByTestId('source-badge-art-2')).toHaveTextContent('Cochrane');
    expect(screen.getByTestId('source-badge-art-3')).toHaveTextContent('Embase');
  });

  it('renders status badges with correct labels', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('status-badge-art-1')).toHaveTextContent('Included');
    expect(screen.getByTestId('status-badge-art-2')).toHaveTextContent('Excluded');
    expect(screen.getByTestId('status-badge-art-3')).toHaveTextContent('Pending');
    expect(screen.getByTestId('status-badge-art-4')).toHaveTextContent('Scored');
  });

  it('renders status accent bars with correct colors', () => {
    render(<ArticleTable {...defaultProps} />);

    const accent1 = screen.getByTestId('status-accent-art-1');
    expect(accent1.className).toContain('bg-emerald-500');

    const accent2 = screen.getByTestId('status-accent-art-2');
    expect(accent2.className).toContain('bg-red-500');

    const accent3 = screen.getByTestId('status-accent-art-3');
    expect(accent3.className).toContain('bg-gray-400');

    const accent4 = screen.getByTestId('status-accent-art-4');
    expect(accent4.className).toContain('bg-orange-500');
  });

  it('calls onArticleSelect when a row is clicked', () => {
    const onArticleSelect = vi.fn();
    render(<ArticleTable {...defaultProps} onArticleSelect={onArticleSelect} />);

    fireEvent.click(screen.getByTestId('article-row-art-2'));
    expect(onArticleSelect).toHaveBeenCalledWith('art-2');
  });

  it('calls onArticleSelect on Enter key press', () => {
    const onArticleSelect = vi.fn();
    render(<ArticleTable {...defaultProps} onArticleSelect={onArticleSelect} />);

    fireEvent.keyDown(screen.getByTestId('article-row-art-1'), { key: 'Enter' });
    expect(onArticleSelect).toHaveBeenCalledWith('art-1');
  });

  it('toggles sort when column header is clicked', () => {
    const onFilterChange = vi.fn();
    render(<ArticleTable {...defaultProps} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByTestId('column-header-title'));

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'title', sortOrder: 'ASC' }),
    );
  });

  it('toggles sort order from ASC to DESC when same column clicked again', () => {
    const onFilterChange = vi.fn();
    render(
      <ArticleTable
        {...defaultProps}
        filter={{ sortBy: 'title', sortOrder: 'ASC' }}
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.click(screen.getByTestId('column-header-title'));

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'title', sortOrder: 'DESC' }),
    );
  });

  it('shows sort indicator for active sort column', () => {
    render(
      <ArticleTable
        {...defaultProps}
        filter={{ sortBy: 'title', sortOrder: 'ASC' }}
      />,
    );

    expect(screen.getByTestId('sort-asc-title')).toBeInTheDocument();
  });

  it('shows descending sort indicator', () => {
    render(
      <ArticleTable
        {...defaultProps}
        filter={{ sortBy: 'year', sortOrder: 'DESC' }}
      />,
    );

    expect(screen.getByTestId('sort-desc-year')).toBeInTheDocument();
  });

  it('renders search input in filter row', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('filter-row')).toBeInTheDocument();
    expect(screen.getByTestId('article-search-input')).toBeInTheDocument();
  });

  it('calls onFilterChange with search text on Enter key', () => {
    const onFilterChange = vi.fn();
    render(<ArticleTable {...defaultProps} onFilterChange={onFilterChange} />);

    const input = screen.getByTestId('article-search-input');
    fireEvent.change(input, { target: { value: 'cervical' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'cervical' }),
    );
  });

  it('selects an individual article checkbox', () => {
    render(<ArticleTable {...defaultProps} />);

    const checkbox = screen.getByTestId('select-article-art-1');
    fireEvent.click(checkbox);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('1 article selected');
  });

  it('selects all articles via select-all checkbox', () => {
    render(<ArticleTable {...defaultProps} />);

    const selectAll = screen.getByTestId('select-all-checkbox');
    fireEvent.click(selectAll);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('4 articles selected');
  });

  it('deselects all when select-all is clicked while all selected', () => {
    render(<ArticleTable {...defaultProps} />);

    const selectAll = screen.getByTestId('select-all-checkbox');
    // Select all
    fireEvent.click(selectAll);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('4 articles selected');

    // Deselect all
    fireEvent.click(selectAll);
    expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument();
  });

  it('shows loading state when no articles and loading', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      fetchMore: mockFetchMore,
    });

    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('shows empty state when no articles found', () => {
    mockUseQuery.mockReturnValue({
      data: { articles: { items: [], total: 0, offset: 0, limit: 100 } },
      loading: false,
      fetchMore: mockFetchMore,
    });

    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('empty-articles')).toBeInTheDocument();
    expect(screen.getByText('No articles found.')).toBeInTheDocument();
  });

  it('shows article count in table footer', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('table-footer')).toHaveTextContent(
      'Showing 4 of 4 articles',
    );
  });

  it('has role="table" on the table element', () => {
    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('has aria-sort attributes on column headers', () => {
    render(
      <ArticleTable
        {...defaultProps}
        filter={{ sortBy: 'title', sortOrder: 'ASC' }}
      />,
    );

    expect(screen.getByTestId('column-header-title')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(screen.getByTestId('column-header-authors')).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('shows "Loading more articles..." when loading and articles exist', () => {
    mockUseQuery.mockReturnValue({
      data: {
        articles: {
          items: mockArticles,
          total: 200,
          offset: 0,
          limit: 100,
        },
      },
      loading: true,
      fetchMore: mockFetchMore,
    });

    render(<ArticleTable {...defaultProps} />);

    expect(screen.getByTestId('loading-more')).toBeInTheDocument();
  });

  it('passes sessionId and filter variables to useQuery', () => {
    render(
      <ArticleTable
        {...defaultProps}
        sessionId="sess-42"
        filter={{ search: 'test', status: 'INCLUDED' }}
      />,
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          sessionId: 'sess-42',
          filter: { search: 'test', status: 'INCLUDED' },
          offset: 0,
          limit: 100,
        },
      }),
    );
  });

  describe('AI scoring columns', () => {
    it('shows AI Score, AI Category, and Exclusion Code column headers when articles have scores', () => {
      render(<ArticleTable {...defaultProps} />);

      expect(screen.getByTestId('column-header-aiScore')).toBeInTheDocument();
      expect(screen.getByTestId('column-header-aiCategory')).toBeInTheDocument();
      expect(screen.getByTestId('column-header-aiExclusionCode')).toBeInTheDocument();
    });

    it('hides AI columns when no articles have scores', () => {
      mockUseQuery.mockReturnValue({
        data: {
          articles: {
            items: mockArticlesNoScores,
            total: mockArticlesNoScores.length,
            offset: 0,
            limit: 100,
          },
        },
        loading: false,
        fetchMore: mockFetchMore,
      });

      render(<ArticleTable {...defaultProps} />);

      expect(screen.queryByTestId('column-header-aiScore')).not.toBeInTheDocument();
      expect(screen.queryByTestId('column-header-aiCategory')).not.toBeInTheDocument();
      expect(screen.queryByTestId('column-header-aiExclusionCode')).not.toBeInTheDocument();
    });

    it('renders AI score badge with green color for score >= 75', () => {
      render(<ArticleTable {...defaultProps} />);

      const badge = screen.getByTestId('ai-score-badge-art-1');
      expect(badge).toHaveTextContent('85');
      expect(badge.className).toContain('bg-emerald-100');
    });

    it('renders AI score badge with orange color for score 40-74', () => {
      render(<ArticleTable {...defaultProps} />);

      const badge = screen.getByTestId('ai-score-badge-art-4');
      expect(badge).toHaveTextContent('55');
      expect(badge.className).toContain('bg-orange-100');
    });

    it('renders AI score badge with red color for score < 40', () => {
      render(<ArticleTable {...defaultProps} />);

      const badge = screen.getByTestId('ai-score-badge-art-2');
      expect(badge).toHaveTextContent('30');
      expect(badge.className).toContain('bg-red-100');
    });

    it('renders AI category badge with correct labels', () => {
      render(<ArticleTable {...defaultProps} />);

      expect(screen.getByTestId('ai-category-badge-art-1')).toHaveTextContent('Likely Relevant');
      expect(screen.getByTestId('ai-category-badge-art-2')).toHaveTextContent('Likely Irrelevant');
      expect(screen.getByTestId('ai-category-badge-art-4')).toHaveTextContent('Uncertain');
    });

    it('renders AI exclusion code when present', () => {
      render(<ArticleTable {...defaultProps} />);

      expect(screen.getByTestId('ai-exclusion-code-art-2')).toHaveTextContent('E1');
    });

    it('renders empty exclusion code cell when null', () => {
      render(<ArticleTable {...defaultProps} />);

      expect(screen.getByTestId('ai-exclusion-code-art-1')).toHaveTextContent('');
    });
  });
});
