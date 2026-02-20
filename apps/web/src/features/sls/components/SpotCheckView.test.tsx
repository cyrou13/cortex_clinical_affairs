import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { SpotCheckView, GET_SPOT_CHECK_SAMPLE, SPOT_CHECK_ARTICLE } from './SpotCheckView';

const mockArticles = [
  {
    id: 'art-1',
    title: 'Article about cervical spine surgery',
    abstract: 'This study examines outcomes of cervical spine surgery.',
    relevanceScore: 85,
    aiCategory: 'likely_relevant',
    aiReasoning: 'Article discusses cervical spine surgical outcomes',
    aiExclusionCode: null,
    status: 'SCORED',
  },
  {
    id: 'art-2',
    title: 'Pediatric dental care review',
    abstract: 'A review of pediatric dental procedures.',
    relevanceScore: 15,
    aiCategory: 'likely_irrelevant',
    aiReasoning: 'Dental study, not spinal',
    aiExclusionCode: 'E1',
    status: 'SCORED',
  },
];

function buildQueryMock(articles = mockArticles): MockedResponse {
  return {
    request: {
      query: GET_SPOT_CHECK_SAMPLE,
      variables: { sessionId: 's-1', category: 'likely_relevant', count: 10 },
    },
    result: {
      data: { spotCheckSample: articles },
    },
  };
}

function buildAgreeMock(articleId: string): MockedResponse {
  return {
    request: {
      query: SPOT_CHECK_ARTICLE,
      variables: {
        articleId,
        agrees: true,
        reason: 'Agrees with AI decision',
      },
    },
    result: {
      data: {
        spotCheckArticle: { action: 'agreed', articleId },
      },
    },
  };
}

describe('SpotCheckView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderWithApollo(
      <SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />,
      [],
    );
    expect(screen.getByTestId('spot-check-loading')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: GET_SPOT_CHECK_SAMPLE,
        variables: { sessionId: 's-1', category: 'likely_relevant', count: 10 },
      },
      error: new Error('fail'),
    };
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      errorMock,
    ]);
    expect(await screen.findByTestId('spot-check-error')).toBeInTheDocument();
  });

  it('renders empty state when no articles', async () => {
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock([]),
    ]);
    expect(await screen.findByTestId('spot-check-empty')).toBeInTheDocument();
  });

  it('renders first article for review', async () => {
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock(),
    ]);
    expect(await screen.findByTestId('spot-check-view')).toBeInTheDocument();
    expect(screen.getByTestId('spot-check-title')).toHaveTextContent(
      'Article about cervical spine surgery',
    );
    expect(screen.getByTestId('spot-check-progress')).toHaveTextContent('1 / 2 articles');
  });

  it('renders AI reasoning box', async () => {
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock(),
    ]);
    const reasoning = await screen.findByTestId('spot-check-ai-reasoning');
    expect(reasoning).toBeInTheDocument();
    expect(reasoning).toHaveTextContent('Article discusses cervical spine surgical outcomes');
  });

  it('renders agree and override buttons', async () => {
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock(),
    ]);
    expect(await screen.findByTestId('spot-check-agree-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spot-check-override-btn')).toBeInTheDocument();
  });

  it('advances to next article after agree', async () => {
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock(),
      buildAgreeMock('art-1'),
    ]);
    const agreeBtn = await screen.findByTestId('spot-check-agree-btn');
    fireEvent.click(agreeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('spot-check-title')).toHaveTextContent(
        'Pediatric dental care review',
      );
      expect(screen.getByTestId('spot-check-progress')).toHaveTextContent('2 / 2 articles');
    });
  });

  it('shows completion summary after all articles reviewed', async () => {
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock([mockArticles[0]!]),
      buildAgreeMock('art-1'),
    ]);
    const agreeBtn = await screen.findByTestId('spot-check-agree-btn');
    fireEvent.click(agreeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('spot-check-complete')).toBeInTheDocument();
      expect(screen.getByTestId('spot-check-accuracy')).toHaveTextContent('AI Accuracy: 100%');
    });
  });

  it('calls mutation with correct agree payload', async () => {
    // Verify the mutation fires correctly by checking the UI advances (meaning mutation returned successfully)
    renderWithApollo(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />, [
      buildQueryMock(),
      buildAgreeMock('art-1'),
    ]);
    const agreeBtn = await screen.findByTestId('spot-check-agree-btn');
    fireEvent.click(agreeBtn);

    // If the mutation mock variables didn't match, the click would error.
    // The fact that it advances to the next article proves the mutation was called correctly.
    await waitFor(() => {
      expect(screen.getByTestId('spot-check-title')).toHaveTextContent(
        'Pediatric dental care review',
      );
    });
  });
});
