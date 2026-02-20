import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_ARTICLE } from '../graphql/queries';

import { ArticleDetailPanel } from './ArticleDetailPanel';

const mockArticle = {
  id: 'art-1',
  title: 'Efficacy of cervical disc replacement in degenerative disc disease: a systematic review',
  abstract:
    'Background: Cervical disc replacement has emerged as an alternative to anterior cervical discectomy and fusion. This systematic review evaluates the efficacy and safety of cervical disc arthroplasty. Methods: A comprehensive search was conducted across PubMed, Cochrane, and Embase databases.',
  authors: ['Smith J', 'Johnson A', 'Williams B', 'Brown C'],
  doi: '10.1000/test-doi-1',
  pmid: '12345678',
  publicationDate: '2024-03-15',
  journal: 'Spine Journal',
  sourceDatabase: 'PUBMED',
  status: 'INCLUDED',
  relevanceScore: 85,
  aiReasoning:
    'This study directly evaluates cervical disc replacement which is relevant to the device under evaluation.',
  aiCategory: 'likely_relevant',
  aiExclusionCode: null,
  scoredAt: '2026-02-14T11:00:00Z',
  createdAt: '2026-02-14T10:00:00Z',
};

function makeArticleMock(article: typeof mockArticle): MockedResponse {
  return {
    request: {
      query: GET_ARTICLE,
      variables: { id: article.id },
    },
    result: {
      data: { article },
    },
  };
}

function makeArticleVariantMock(overrides: Partial<typeof mockArticle>): MockedResponse {
  const article = { ...mockArticle, ...overrides };
  return {
    request: {
      query: GET_ARTICLE,
      variables: { id: article.id },
    },
    result: {
      data: { article },
    },
  };
}

function makeLoadingMock(): MockedResponse {
  return {
    request: {
      query: GET_ARTICLE,
      variables: { id: 'art-1' },
    },
    result: {
      data: { article: mockArticle },
    },
    delay: 100000,
  };
}

function makeErrorMock(): MockedResponse {
  return {
    request: {
      query: GET_ARTICLE,
      variables: { id: 'art-1' },
    },
    error: new Error('Network error'),
  };
}

describe('ArticleDetailPanel', () => {
  const defaultProps = {
    articleId: 'art-1' as string | null,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when articleId is null', () => {
    const skipMock: MockedResponse = {
      request: {
        query: GET_ARTICLE,
        variables: { id: null },
      },
      result: {
        data: { article: null },
      },
    };

    const { container } = renderWithApollo(
      <ArticleDetailPanel articleId={null} onClose={vi.fn()} />,
      [skipMock],
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the panel with article details', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('article-detail-panel')).toBeInTheDocument();
    expect(screen.getByText('Article Details')).toBeInTheDocument();
  });

  it('renders article title', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('article-title')).toHaveTextContent(
      'Efficacy of cervical disc replacement in degenerative disc disease: a systematic review',
    );
  });

  it('renders full abstract', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    const abstract = await screen.findByTestId('article-abstract');
    expect(abstract).toBeInTheDocument();
    expect(abstract).toHaveTextContent(/Cervical disc replacement has emerged/);
  });

  it('renders all authors', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('article-authors')).toHaveTextContent(
      'Smith J, Johnson A, Williams B, Brown C',
    );
  });

  it('renders DOI link pointing to doi.org', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    const doiLink = await screen.findByTestId('doi-link');
    expect(doiLink).toBeInTheDocument();
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1000/test-doi-1');
    expect(doiLink).toHaveAttribute('target', '_blank');
    expect(doiLink).toHaveTextContent('10.1000/test-doi-1');
  });

  it('renders PMID link pointing to PubMed', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    const pmidLink = await screen.findByTestId('pmid-link');
    expect(pmidLink).toBeInTheDocument();
    expect(pmidLink).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/12345678');
    expect(pmidLink).toHaveAttribute('target', '_blank');
    expect(pmidLink).toHaveTextContent('12345678');
  });

  it('does not render DOI link when doi is null', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
      makeArticleVariantMock({ doi: null }),
    ]);

    await screen.findByTestId('article-title');

    expect(screen.queryByTestId('doi-link')).not.toBeInTheDocument();
  });

  it('does not render PMID link when pmid is null', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
      makeArticleVariantMock({ pmid: null }),
    ]);

    await screen.findByTestId('article-title');

    expect(screen.queryByTestId('pmid-link')).not.toBeInTheDocument();
  });

  it('renders status badge', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    const badge = await screen.findByTestId('article-status-badge');
    expect(badge).toHaveTextContent('Included');
    expect(badge.className).toContain('bg-emerald-100');
  });

  it('renders relevance score when present', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('relevance-score')).toHaveTextContent('Score: 85');
  });

  it('does not render relevance score when null', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
      makeArticleVariantMock({ relevanceScore: null }),
    ]);

    await screen.findByTestId('article-title');

    expect(screen.queryByTestId('relevance-score')).not.toBeInTheDocument();
  });

  it('renders journal name', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('article-journal')).toHaveTextContent('Spine Journal');
  });

  it('renders source database label', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('article-source')).toHaveTextContent('PubMed');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderWithApollo(<ArticleDetailPanel articleId="art-1" onClose={onClose} />, [
      makeArticleMock(mockArticle),
    ]);

    fireEvent.click(await screen.findByTestId('close-article-detail'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeLoadingMock()]);

    expect(screen.getByTestId('article-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading article details...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeErrorMock()]);

    expect(await screen.findByTestId('article-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load article details.')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-label on the panel', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    const panel = await screen.findByTestId('article-detail-panel');
    expect(panel).toHaveAttribute('role', 'dialog');
    expect(panel).toHaveAttribute('aria-label', 'Article Details');
  });

  it('renders publication date', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

    expect(await screen.findByTestId('publication-date')).toBeInTheDocument();
  });

  it('shows "No authors listed" when authors array is empty', async () => {
    renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
      makeArticleVariantMock({ authors: [] }),
    ]);

    expect(await screen.findByTestId('article-authors')).toHaveTextContent('No authors listed');
  });

  describe('AI reasoning display', () => {
    it('renders AI reasoning box with blue styling', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

      const reasoningBox = await screen.findByTestId('ai-reasoning-box');
      expect(reasoningBox).toBeInTheDocument();
      expect(reasoningBox).toHaveTextContent(
        'This study directly evaluates cervical disc replacement',
      );
      expect(reasoningBox.className).toContain('bg-blue-50');
      expect(reasoningBox.className).toContain('border-blue-400');
    });

    it('renders AI category badge', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

      const badge = await screen.findByTestId('ai-category-badge');
      expect(badge).toHaveTextContent('Likely Relevant');
    });

    it('does not render AI reasoning section when aiReasoning is null', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
        makeArticleVariantMock({ aiReasoning: null }),
      ]);

      await screen.findByTestId('article-title');

      expect(screen.queryByTestId('ai-reasoning-section')).not.toBeInTheDocument();
    });

    it('does not render AI category badge when aiCategory is null', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
        makeArticleVariantMock({ aiCategory: null }),
      ]);

      await screen.findByTestId('article-title');

      expect(screen.queryByTestId('ai-category-badge')).not.toBeInTheDocument();
    });

    it('renders AI exclusion code when present', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
        makeArticleVariantMock({
          relevanceScore: 25,
          aiCategory: 'likely_irrelevant',
          aiExclusionCode: 'E3',
          aiReasoning: 'Animal study, not relevant.',
        }),
      ]);

      const exclusionCode = await screen.findByTestId('ai-exclusion-code');
      expect(exclusionCode).toHaveTextContent('E3');
    });

    it('does not render exclusion code when null', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

      await screen.findByTestId('article-title');

      expect(screen.queryByTestId('ai-exclusion-code')).not.toBeInTheDocument();
    });

    it('renders score badge with green color for high scores', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [makeArticleMock(mockArticle)]);

      const scoreBadge = await screen.findByTestId('relevance-score');
      expect(scoreBadge.className).toContain('bg-emerald-100');
    });

    it('renders score badge with red color for low scores', async () => {
      renderWithApollo(<ArticleDetailPanel {...defaultProps} />, [
        makeArticleVariantMock({ relevanceScore: 20 }),
      ]);

      const scoreBadge = await screen.findByTestId('relevance-score');
      expect(scoreBadge.className).toContain('bg-red-100');
    });
  });
});
