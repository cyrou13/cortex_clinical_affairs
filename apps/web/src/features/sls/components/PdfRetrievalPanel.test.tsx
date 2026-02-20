import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import {
  PdfRetrievalPanel,
  GET_PDF_RETRIEVAL_STATS,
  LAUNCH_PDF_RETRIEVAL,
} from './PdfRetrievalPanel';

const mockStatsData = {
  totalIncluded: 641,
  pdfFound: 550,
  pdfNotFound: 80,
  mismatches: 11,
  verified: 0,
  retrieving: 0,
};

function buildStatsMock(stats = mockStatsData): MockedResponse {
  return {
    request: {
      query: GET_PDF_RETRIEVAL_STATS,
      variables: { sessionId: 's-1' },
    },
    result: {
      data: { pdfRetrievalStats: stats },
    },
  };
}

describe('PdfRetrievalPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel with launch button', async () => {
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [buildStatsMock()]);
    expect(await screen.findByTestId('pdf-retrieval-panel')).toBeInTheDocument();
    expect(screen.getByTestId('launch-retrieval-btn')).toBeInTheDocument();
  });

  it('displays retrieval statistics', async () => {
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [buildStatsMock()]);
    expect(await screen.findByTestId('stat-total')).toHaveTextContent('641');
    expect(screen.getByTestId('stat-found')).toHaveTextContent('550');
    expect(screen.getByTestId('stat-not-found')).toHaveTextContent('80');
    expect(screen.getByTestId('stat-mismatches')).toHaveTextContent('11');
  });

  it('shows progress bar', async () => {
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [buildStatsMock()]);
    expect(await screen.findByTestId('pdf-progress-bar')).toBeInTheDocument();
  });

  it('shows percentage retrieved', async () => {
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [buildStatsMock()]);
    expect(await screen.findByTestId('pdf-percent')).toHaveTextContent('86% PDFs retrieved');
  });

  it('calls mutation on launch', async () => {
    const launchMock: MockedResponse = {
      request: {
        query: LAUNCH_PDF_RETRIEVAL,
        variables: { sessionId: 's-1' },
      },
      result: {
        data: { launchPdfRetrieval: { taskId: 'task-1', articleCount: 80 } },
      },
    };
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [buildStatsMock(), launchMock]);

    const btn = await screen.findByTestId('launch-retrieval-btn');
    fireEvent.click(btn);

    // After mutation completes, the button should show "Retrieving..." because taskId is set
    await waitFor(() => {
      expect(screen.getByTestId('launch-retrieval-btn')).toHaveTextContent('Retrieving...');
    });
  });

  it('disables button when retrieving', async () => {
    const retrievingStats = { ...mockStatsData, retrieving: 50 };
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [buildStatsMock(retrievingStats)]);

    // Wait for stats to load first
    await screen.findByTestId('pdf-stats');
    const btn = screen.getByTestId('launch-retrieval-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Retrieving...');
  });

  it('renders without stats initially', async () => {
    // Provide a mock that returns null data for stats
    const nullStatsMock: MockedResponse = {
      request: {
        query: GET_PDF_RETRIEVAL_STATS,
        variables: { sessionId: 's-1' },
      },
      result: {
        data: { pdfRetrievalStats: null },
      },
    };
    renderWithApollo(<PdfRetrievalPanel sessionId="s-1" />, [nullStatsMock]);

    expect(await screen.findByTestId('pdf-retrieval-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-stats')).not.toBeInTheDocument();
  });
});
