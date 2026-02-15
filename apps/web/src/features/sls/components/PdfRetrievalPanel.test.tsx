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

import { PdfRetrievalPanel } from './PdfRetrievalPanel';

const mockStats = {
  pdfRetrievalStats: {
    total: 641,
    found: 550,
    notFound: 80,
    mismatches: 11,
    retrieving: 0,
  },
};

describe('PdfRetrievalPanel', () => {
  const mockMutate = vi.fn().mockResolvedValue({
    data: { launchPdfRetrieval: { taskId: 'task-1', articleCount: 80 } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);
  });

  it('renders panel with launch button', () => {
    mockUseQuery.mockReturnValue({ data: mockStats, loading: false, error: null });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    expect(screen.getByTestId('pdf-retrieval-panel')).toBeInTheDocument();
    expect(screen.getByTestId('launch-retrieval-btn')).toBeInTheDocument();
  });

  it('displays retrieval statistics', () => {
    mockUseQuery.mockReturnValue({ data: mockStats, loading: false, error: null });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    expect(screen.getByTestId('stat-total')).toHaveTextContent('641');
    expect(screen.getByTestId('stat-found')).toHaveTextContent('550');
    expect(screen.getByTestId('stat-not-found')).toHaveTextContent('80');
    expect(screen.getByTestId('stat-mismatches')).toHaveTextContent('11');
  });

  it('shows progress bar', () => {
    mockUseQuery.mockReturnValue({ data: mockStats, loading: false, error: null });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    expect(screen.getByTestId('pdf-progress-bar')).toBeInTheDocument();
  });

  it('shows percentage retrieved', () => {
    mockUseQuery.mockReturnValue({ data: mockStats, loading: false, error: null });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    expect(screen.getByTestId('pdf-percent')).toHaveTextContent('86% PDFs retrieved');
  });

  it('calls mutation on launch', async () => {
    mockUseQuery.mockReturnValue({ data: mockStats, loading: false, error: null });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('launch-retrieval-btn'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ variables: { sessionId: 's-1' } });
    });
  });

  it('disables button when retrieving', () => {
    mockUseQuery.mockReturnValue({
      data: {
        pdfRetrievalStats: { ...mockStats.pdfRetrievalStats, retrieving: 50 },
      },
      loading: false,
      error: null,
    });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    expect(screen.getByTestId('launch-retrieval-btn')).toBeDisabled();
    expect(screen.getByTestId('launch-retrieval-btn')).toHaveTextContent('Retrieving...');
  });

  it('renders without stats initially', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: null });
    render(<PdfRetrievalPanel sessionId="s-1" />);

    expect(screen.getByTestId('pdf-retrieval-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-stats')).not.toBeInTheDocument();
  });
});
