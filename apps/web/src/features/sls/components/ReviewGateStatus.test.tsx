import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { ReviewGateStatus, GET_REVIEW_GATE_STATUS } from './ReviewGateStatus';

const mockGateStatusAllMet = {
  allArticlesReviewed: { met: true, reviewed: 100, total: 100 },
  likelyRelevantSpotChecked: { met: true, checked: 10, required: 10, total: 80 },
  likelyIrrelevantSpotChecked: { met: true, checked: 5, required: 5, total: 20 },
  allGatesMet: true,
};

const mockGateStatusNotMet = {
  allArticlesReviewed: { met: false, reviewed: 80, total: 100 },
  likelyRelevantSpotChecked: { met: true, checked: 10, required: 10, total: 80 },
  likelyIrrelevantSpotChecked: { met: false, checked: 1, required: 5, total: 20 },
  allGatesMet: false,
};

function buildMock(status = mockGateStatusAllMet): MockedResponse {
  return {
    request: {
      query: GET_REVIEW_GATE_STATUS,
      variables: { sessionId: 's-1' },
    },
    result: {
      data: { reviewGateStatus: status },
    },
  };
}

describe('ReviewGateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, []);
    expect(screen.getByTestId('gate-loading')).toBeInTheDocument();
  });

  it('renders all gates when all met', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock()]);
    expect(await screen.findByTestId('review-gate-status')).toBeInTheDocument();
    expect(screen.getByTestId('gate-0')).toBeInTheDocument();
    expect(screen.getByTestId('gate-1')).toBeInTheDocument();
    expect(screen.getByTestId('gate-2')).toBeInTheDocument();
  });

  it('shows green check for met gates', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock()]);
    expect(await screen.findByTestId('gate-0-check')).toBeInTheDocument();
  });

  it('shows red X for unmet gates', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock(mockGateStatusNotMet)]);
    expect(await screen.findByTestId('gate-0-x')).toBeInTheDocument();
  });

  it('shows "ready to lock" when all gates met', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock()]);
    expect(await screen.findByTestId('gates-summary')).toHaveTextContent('All gates met');
  });

  it('shows "some gates not met" when gates incomplete', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock(mockGateStatusNotMet)]);
    expect(await screen.findByTestId('gates-summary')).toHaveTextContent('Some gates not met');
  });

  it('displays article count for all-reviewed gate', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock(mockGateStatusNotMet)]);
    expect(await screen.findByTestId('gate-0')).toHaveTextContent('80 / 100');
  });

  it('displays spot-check count', async () => {
    renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [buildMock(mockGateStatusNotMet)]);
    expect(await screen.findByTestId('gate-2')).toHaveTextContent('1 / 5 required');
  });

  it('renders nothing on error', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: GET_REVIEW_GATE_STATUS,
        variables: { sessionId: 's-1' },
      },
      error: new Error('fail'),
    };
    const { container } = renderWithApollo(<ReviewGateStatus sessionId="s-1" />, [errorMock]);

    // Wait for error to be processed (loading state disappears and returns null)
    await waitFor(() => {
      expect(screen.queryByTestId('gate-loading')).not.toBeInTheDocument();
    });
    expect(container.innerHTML).toBe('');
  });
});
