import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_AI_SCORING_PROGRESS } from '../graphql/queries';
import { CANCEL_AI_SCORING } from '../graphql/mutations';
import { AiScoringProgress } from './AiScoringProgress';

function buildProgressMock(overrides: {
  status: string;
  scored: number;
  total: number;
  estimatedSecondsRemaining: number | null;
}): MockedResponse {
  return {
    request: {
      query: GET_AI_SCORING_PROGRESS,
      variables: { taskId: 'task-1' },
    },
    result: {
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: overrides.status,
          scored: overrides.scored,
          total: overrides.total,
          estimatedSecondsRemaining: overrides.estimatedSecondsRemaining,
        },
      },
    },
  };
}

function buildCancelMock(): MockedResponse {
  return {
    request: {
      query: CANCEL_AI_SCORING,
      variables: { taskId: 'task-1' },
    },
    result: {
      data: { cancelAiScoring: true },
    },
  };
}

describe('AiScoringProgress', () => {
  const defaultProps = {
    taskId: 'task-1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when initializing', () => {
    // No mocks = query never resolves = loading state
    renderWithApollo(<AiScoringProgress {...defaultProps} />, []);

    expect(screen.getByTestId('ai-scoring-progress')).toBeInTheDocument();
    expect(screen.getByText('Initializing AI scoring...')).toBeInTheDocument();
  });

  it('shows progress bar and article count during scoring', async () => {
    const mock = buildProgressMock({
      status: 'RUNNING',
      scored: 2800,
      total: 4500,
      estimatedSecondsRemaining: 180,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByText('AI Screening in Progress');
    expect(screen.getByTestId('ai-scoring-progress')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-count')).toHaveTextContent('2,800 / 4,500 articles scored');
    expect(screen.getByTestId('scoring-progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-percentage')).toHaveTextContent('62%');
  });

  it('shows ETA estimation', async () => {
    const mock = buildProgressMock({
      status: 'RUNNING',
      scored: 2800,
      total: 4500,
      estimatedSecondsRemaining: 180,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByTestId('scoring-eta');
    expect(screen.getByTestId('scoring-eta')).toHaveTextContent('Estimated: 3 min remaining');
  });

  it('shows cancel button during active scoring', async () => {
    const mock = buildProgressMock({
      status: 'RUNNING',
      scored: 1000,
      total: 4500,
      estimatedSecondsRemaining: 300,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    const cancelButton = await screen.findByTestId('cancel-scoring-button');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel Scoring');
  });

  it('calls cancel mutation when cancel is clicked', async () => {
    const progressMock = buildProgressMock({
      status: 'RUNNING',
      scored: 1000,
      total: 4500,
      estimatedSecondsRemaining: 300,
    });
    const cancelMock = buildCancelMock();

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [progressMock, cancelMock]);

    const cancelButton = await screen.findByTestId('cancel-scoring-button');
    fireEvent.click(cancelButton);

    // onCancel should be called after mutation completes
    await waitFor(() => {
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  it('shows completion state when scoring is done', async () => {
    const mock = buildProgressMock({
      status: 'COMPLETED',
      scored: 4500,
      total: 4500,
      estimatedSecondsRemaining: null,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByTestId('scoring-complete');
    expect(screen.getByText('AI Scoring Complete')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-summary')).toHaveTextContent(
      '4,500 / 4,500 articles scored',
    );
  });

  it('calls onComplete when scoring finishes', async () => {
    const onComplete = vi.fn();
    const mock = buildProgressMock({
      status: 'COMPLETED',
      scored: 4500,
      total: 4500,
      estimatedSecondsRemaining: null,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} onComplete={onComplete} />, [mock]);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('shows cancelled state', async () => {
    const mock = buildProgressMock({
      status: 'CANCELLED',
      scored: 2000,
      total: 4500,
      estimatedSecondsRemaining: null,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByTestId('scoring-cancelled');
    expect(screen.getByText('AI Scoring Cancelled')).toBeInTheDocument();
  });

  it('shows failed state', async () => {
    const mock = buildProgressMock({
      status: 'FAILED',
      scored: 0,
      total: 4500,
      estimatedSecondsRemaining: null,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByTestId('scoring-failed');
    expect(screen.getByText('AI Scoring Failed')).toBeInTheDocument();
  });

  it('shows progress bar with correct width', async () => {
    const mock = buildProgressMock({
      status: 'RUNNING',
      scored: 2250,
      total: 4500,
      estimatedSecondsRemaining: 120,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    const bar = await screen.findByTestId('scoring-progress-bar');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('shows ETA in seconds for short durations', async () => {
    const mock = buildProgressMock({
      status: 'RUNNING',
      scored: 4400,
      total: 4500,
      estimatedSecondsRemaining: 30,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByTestId('scoring-eta');
    expect(screen.getByTestId('scoring-eta')).toHaveTextContent('Estimated: 30 sec remaining');
  });

  it('does not show ETA when estimated seconds is null', async () => {
    const mock = buildProgressMock({
      status: 'RUNNING',
      scored: 100,
      total: 4500,
      estimatedSecondsRemaining: null,
    });

    renderWithApollo(<AiScoringProgress {...defaultProps} />, [mock]);

    await screen.findByText('AI Screening in Progress');
    expect(screen.queryByTestId('scoring-eta')).not.toBeInTheDocument();
  });
});
