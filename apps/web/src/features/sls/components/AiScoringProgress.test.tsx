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

import { AiScoringProgress } from './AiScoringProgress';

describe('AiScoringProgress', () => {
  const defaultProps = {
    taskId: 'task-1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  let cancelMutationFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    cancelMutationFn = vi.fn().mockResolvedValue({ data: { cancelAiScoring: true } });
    mockUseMutation.mockReturnValue([cancelMutationFn, { loading: false }]);
  });

  it('shows loading state when initializing', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('ai-scoring-progress')).toBeInTheDocument();
    expect(screen.getByText('Initializing AI scoring...')).toBeInTheDocument();
  });

  it('shows progress bar and article count during scoring', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 2800,
          total: 4500,
          estimatedSecondsRemaining: 180,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('ai-scoring-progress')).toBeInTheDocument();
    expect(screen.getByText('AI Screening in Progress')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-count')).toHaveTextContent(
      '2,800 / 4,500 articles scored',
    );
    expect(screen.getByTestId('scoring-progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-percentage')).toHaveTextContent('62%');
  });

  it('shows ETA estimation', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 2800,
          total: 4500,
          estimatedSecondsRemaining: 180,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('scoring-eta')).toHaveTextContent(
      'Estimated: 3 min remaining',
    );
  });

  it('shows cancel button during active scoring', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 1000,
          total: 4500,
          estimatedSecondsRemaining: 300,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    const cancelButton = screen.getByTestId('cancel-scoring-button');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel Scoring');
  });

  it('calls cancel mutation when cancel is clicked', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 1000,
          total: 4500,
          estimatedSecondsRemaining: 300,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel-scoring-button'));

    expect(cancelMutationFn).toHaveBeenCalledWith({
      variables: { taskId: 'task-1' },
    });
  });

  it('shows completion state when scoring is done', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'COMPLETED',
          scored: 4500,
          total: 4500,
          estimatedSecondsRemaining: null,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('scoring-complete')).toBeInTheDocument();
    expect(screen.getByText('AI Scoring Complete')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-summary')).toHaveTextContent(
      '4,500 / 4,500 articles scored',
    );
  });

  it('calls onComplete when scoring finishes', async () => {
    const onComplete = vi.fn();

    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'COMPLETED',
          scored: 4500,
          total: 4500,
          estimatedSecondsRemaining: null,
        },
      },
      loading: false,
    });

    render(
      <AiScoringProgress
        {...defaultProps}
        onComplete={onComplete}
      />,
    );

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('shows cancelled state', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'CANCELLED',
          scored: 2000,
          total: 4500,
          estimatedSecondsRemaining: null,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('scoring-cancelled')).toBeInTheDocument();
    expect(screen.getByText('AI Scoring Cancelled')).toBeInTheDocument();
  });

  it('shows failed state', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'FAILED',
          scored: 0,
          total: 4500,
          estimatedSecondsRemaining: null,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('scoring-failed')).toBeInTheDocument();
    expect(screen.getByText('AI Scoring Failed')).toBeInTheDocument();
  });

  it('shows progress bar with correct width', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 2250,
          total: 4500,
          estimatedSecondsRemaining: 120,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    const bar = screen.getByTestId('scoring-progress-bar');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('shows ETA in seconds for short durations', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 4400,
          total: 4500,
          estimatedSecondsRemaining: 30,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('scoring-eta')).toHaveTextContent(
      'Estimated: 30 sec remaining',
    );
  });

  it('does not show ETA when estimated seconds is null', () => {
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 100,
          total: 4500,
          estimatedSecondsRemaining: null,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.queryByTestId('scoring-eta')).not.toBeInTheDocument();
  });

  it('disables cancel button while cancelling', () => {
    mockUseMutation.mockReturnValue([cancelMutationFn, { loading: true }]);
    mockUseQuery.mockReturnValue({
      data: {
        aiScoringProgress: {
          taskId: 'task-1',
          status: 'RUNNING',
          scored: 1000,
          total: 4500,
          estimatedSecondsRemaining: 300,
        },
      },
      loading: false,
    });

    render(<AiScoringProgress {...defaultProps} />);

    expect(screen.getByTestId('cancel-scoring-button')).toBeDisabled();
  });
});
