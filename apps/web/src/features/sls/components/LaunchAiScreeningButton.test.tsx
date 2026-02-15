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

import { LaunchAiScreeningButton } from './LaunchAiScreeningButton';

describe('LaunchAiScreeningButton', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    pendingCount: 4500,
    isLocked: false,
  };

  let launchMutationFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    launchMutationFn = vi.fn().mockResolvedValue({
      data: { launchAiScoring: { taskId: 'task-1' } },
    });
    // First call for launchAiScoring, second for cancelAiScoring (inside AiScoringProgress)
    mockUseMutation.mockReturnValue([launchMutationFn, { loading: false }]);
    // Mock useQuery for AiScoringProgress (if it's rendered)
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
    });
  });

  it('renders the launch button with Brain icon text', () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Launch AI Screening');
  });

  it('is disabled when session is locked', () => {
    render(<LaunchAiScreeningButton {...defaultProps} isLocked={true} />);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toBeDisabled();
  });

  it('is disabled when there are no pending articles', () => {
    render(<LaunchAiScreeningButton {...defaultProps} pendingCount={0} />);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toBeDisabled();
  });

  it('opens confirmation dialog on click', () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('ai-screening-confirmation')).toBeInTheDocument();
    expect(screen.getByText('Confirm AI Screening')).toBeInTheDocument();
  });

  it('shows article count in confirmation dialog', () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-article-count')).toHaveTextContent(
      '4,500',
    );
  });

  it('shows estimated time in confirmation dialog', () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-estimated-time')).toHaveTextContent(
      'Estimated time:',
    );
  });

  it('closes confirmation dialog when cancel is clicked', () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));
    expect(screen.getByTestId('ai-screening-confirmation')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-launch-button'));
    expect(
      screen.queryByTestId('ai-screening-confirmation'),
    ).not.toBeInTheDocument();
  });

  it('calls launch mutation on confirm', async () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));
    fireEvent.click(screen.getByTestId('confirm-launch-button'));

    await waitFor(() => {
      expect(launchMutationFn).toHaveBeenCalledWith({
        variables: { sessionId: 'sess-1' },
      });
    });
  });

  it('shows progress component after successful launch', async () => {
    render(<LaunchAiScreeningButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));
    fireEvent.click(screen.getByTestId('confirm-launch-button'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-scoring-progress')).toBeInTheDocument();
    });
  });

  it('does not open confirmation dialog when disabled', () => {
    render(<LaunchAiScreeningButton {...defaultProps} isLocked={true} />);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(
      screen.queryByTestId('ai-screening-confirmation'),
    ).not.toBeInTheDocument();
  });

  it('shows Launching... text during mutation loading', () => {
    mockUseMutation.mockReturnValue([launchMutationFn, { loading: true }]);

    render(<LaunchAiScreeningButton {...defaultProps} />);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toHaveTextContent('Launching...');
    expect(button).toBeDisabled();
  });

  it('renders estimated time in minutes for large counts', () => {
    render(
      <LaunchAiScreeningButton {...defaultProps} pendingCount={300} />,
    );

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-estimated-time')).toHaveTextContent(
      '~5 minutes',
    );
  });

  it('renders estimated time in seconds for small counts', () => {
    render(
      <LaunchAiScreeningButton {...defaultProps} pendingCount={30} />,
    );

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-estimated-time')).toHaveTextContent(
      '~30 seconds',
    );
  });
});
