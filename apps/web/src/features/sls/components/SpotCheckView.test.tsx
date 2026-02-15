import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { SpotCheckView } from './SpotCheckView';

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

describe('SpotCheckView', () => {
  const mockMutate = vi.fn().mockResolvedValue({ data: { spotCheckArticle: { action: 'agreed' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    expect(screen.getByTestId('spot-check-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    expect(screen.getByTestId('spot-check-error')).toBeInTheDocument();
  });

  it('renders empty state when no articles', () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: [] },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    expect(screen.getByTestId('spot-check-empty')).toBeInTheDocument();
  });

  it('renders first article for review', () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: mockArticles },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    expect(screen.getByTestId('spot-check-view')).toBeInTheDocument();
    expect(screen.getByTestId('spot-check-title')).toHaveTextContent('Article about cervical spine surgery');
    expect(screen.getByTestId('spot-check-progress')).toHaveTextContent('1 / 2 articles');
  });

  it('renders AI reasoning box', () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: mockArticles },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    expect(screen.getByTestId('spot-check-ai-reasoning')).toBeInTheDocument();
    expect(screen.getByTestId('spot-check-ai-reasoning')).toHaveTextContent(
      'Article discusses cervical spine surgical outcomes',
    );
  });

  it('renders agree and override buttons', () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: mockArticles },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    expect(screen.getByTestId('spot-check-agree-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spot-check-override-btn')).toBeInTheDocument();
  });

  it('advances to next article after agree', async () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: mockArticles },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    fireEvent.click(screen.getByTestId('spot-check-agree-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('spot-check-title')).toHaveTextContent('Pediatric dental care review');
      expect(screen.getByTestId('spot-check-progress')).toHaveTextContent('2 / 2 articles');
    });
  });

  it('shows completion summary after all articles reviewed', async () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: [mockArticles[0]] },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    fireEvent.click(screen.getByTestId('spot-check-agree-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('spot-check-complete')).toBeInTheDocument();
      expect(screen.getByTestId('spot-check-accuracy')).toHaveTextContent('AI Accuracy: 100%');
    });
  });

  it('calls mutation with correct agree payload', async () => {
    mockUseQuery.mockReturnValue({
      data: { spotCheckSample: mockArticles },
      loading: false,
      error: null,
    });
    render(<SpotCheckView sessionId="s-1" category="likely_relevant" sampleSize={10} />);

    fireEvent.click(screen.getByTestId('spot-check-agree-btn'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        variables: {
          input: expect.objectContaining({
            articleId: 'art-1',
            agrees: true,
          }),
        },
      });
    });
  });
});
