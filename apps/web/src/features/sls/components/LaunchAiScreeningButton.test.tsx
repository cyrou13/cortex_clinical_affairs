import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { LAUNCH_AI_SCORING } from '../graphql/mutations';
import { GET_AI_SCORING_PROGRESS } from '../graphql/queries';
import { LaunchAiScreeningButton } from './LaunchAiScreeningButton';

function buildLaunchMock(): MockedResponse {
  return {
    request: {
      query: LAUNCH_AI_SCORING,
      variables: { sessionId: 'sess-1' },
    },
    result: {
      data: { launchAiScoring: { taskId: 'task-1' } },
    },
  };
}

function buildProgressMock(overrides?: {
  status?: string;
  scored?: number;
  total?: number;
  estimatedSecondsRemaining?: number | null;
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
          status: overrides?.status ?? 'RUNNING',
          scored: overrides?.scored ?? 0,
          total: overrides?.total ?? 4500,
          estimatedSecondsRemaining: overrides?.estimatedSecondsRemaining ?? null,
        },
      },
    },
  };
}

describe('LaunchAiScreeningButton', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    pendingCount: 4500,
    isLocked: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the launch button with Brain icon text', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, []);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Launch AI Screening');
  });

  it('is disabled when session is locked', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} isLocked={true} />, []);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toBeDisabled();
  });

  it('is disabled when there are no pending articles', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} pendingCount={0} />, []);

    const button = screen.getByTestId('launch-ai-screening-button');
    expect(button).toBeDisabled();
  });

  it('opens confirmation dialog on click', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('ai-screening-confirmation')).toBeInTheDocument();
    expect(screen.getByText('Confirm AI Screening')).toBeInTheDocument();
  });

  it('shows article count in confirmation dialog', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-article-count')).toHaveTextContent('4,500');
  });

  it('shows estimated time in confirmation dialog', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-estimated-time')).toHaveTextContent('Estimated time:');
  });

  it('closes confirmation dialog when cancel is clicked', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));
    expect(screen.getByTestId('ai-screening-confirmation')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-launch-button'));
    expect(screen.queryByTestId('ai-screening-confirmation')).not.toBeInTheDocument();
  });

  it('calls launch mutation on confirm', async () => {
    const launchMock = buildLaunchMock();
    // Also need a progress mock since AiScoringProgress will render after launch
    const progressMock = buildProgressMock();
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, [launchMock, progressMock]);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));
    fireEvent.click(screen.getByTestId('confirm-launch-button'));

    // After launching, the AiScoringProgress component should appear
    await screen.findByTestId('ai-scoring-progress');
  });

  it('shows progress component after successful launch', async () => {
    const launchMock = buildLaunchMock();
    const progressMock = buildProgressMock();
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} />, [launchMock, progressMock]);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));
    fireEvent.click(screen.getByTestId('confirm-launch-button'));

    await screen.findByTestId('ai-scoring-progress');
  });

  it('does not open confirmation dialog when disabled', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} isLocked={true} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.queryByTestId('ai-screening-confirmation')).not.toBeInTheDocument();
  });

  it('renders estimated time in minutes for large counts', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} pendingCount={300} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-estimated-time')).toHaveTextContent('~5 minutes');
  });

  it('renders estimated time in seconds for small counts', () => {
    renderWithApollo(<LaunchAiScreeningButton {...defaultProps} pendingCount={30} />, []);

    fireEvent.click(screen.getByTestId('launch-ai-screening-button'));

    expect(screen.getByTestId('confirmation-estimated-time')).toHaveTextContent('~30 seconds');
  });
});
