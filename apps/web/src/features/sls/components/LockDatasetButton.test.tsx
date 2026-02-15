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

import { LockDatasetButton } from './LockDatasetButton';

const preflightReady = {
  lockPreflightCheck: {
    pendingCount: 0,
    totalArticles: 500,
    includedCount: 200,
    excludedCount: 300,
    allGatesMet: true,
    sessionStatus: 'SCREENING',
  },
};

const preflightPending = {
  lockPreflightCheck: {
    pendingCount: 15,
    totalArticles: 500,
    includedCount: 185,
    excludedCount: 300,
    allGatesMet: false,
    sessionStatus: 'SCREENING',
  },
};

const preflightLocked = {
  lockPreflightCheck: {
    pendingCount: 0,
    totalArticles: 500,
    includedCount: 200,
    excludedCount: 300,
    allGatesMet: true,
    sessionStatus: 'LOCKED',
  },
};

describe('LockDatasetButton', () => {
  const mockMutate = vi.fn().mockResolvedValue({
    data: { lockSlsDataset: { sessionId: 's-1', lockedAt: '2026-02-14', includedCount: 200, excludedCount: 300, totalArticles: 500 } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);
  });

  it('renders lock button when conditions met', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    expect(screen.getByTestId('lock-dataset-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
  });

  it('disables button when articles pending', () => {
    mockUseQuery.mockReturnValue({ data: preflightPending, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    expect(screen.getByTestId('lock-dataset-btn')).toBeDisabled();
  });

  it('shows locked status when already locked', () => {
    mockUseQuery.mockReturnValue({ data: preflightLocked, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    expect(screen.getByTestId('lock-status-locked')).toBeInTheDocument();
    expect(screen.getByTestId('lock-status-locked')).toHaveTextContent('Dataset Locked');
  });

  it('opens confirmation dialog on click', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('lock-dataset-btn'));

    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();
  });

  it('dialog shows article counts', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('lock-dataset-btn'));

    expect(screen.getByTestId('recap-included')).toHaveTextContent('200');
    expect(screen.getByTestId('recap-excluded')).toHaveTextContent('300');
  });

  it('dialog confirm button disabled until checkbox checked', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('lock-dataset-btn'));

    expect(screen.getByTestId('lock-confirm-btn')).toBeDisabled();

    fireEvent.click(screen.getByTestId('lock-checkbox'));

    expect(screen.getByTestId('lock-confirm-btn')).not.toBeDisabled();
  });

  it('calls mutation on confirm', async () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    const onLocked = vi.fn();
    render(<LockDatasetButton sessionId="s-1" onLocked={onLocked} />);

    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('lock-confirm-btn'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ variables: { sessionId: 's-1' } });
    });
  });

  it('calls onLocked callback after successful lock', async () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    const onLocked = vi.fn();
    render(<LockDatasetButton sessionId="s-1" onLocked={onLocked} />);

    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('lock-confirm-btn'));

    await waitFor(() => {
      expect(onLocked).toHaveBeenCalledWith({ includedCount: 200, excludedCount: 300 });
    });
  });

  it('closes dialog on cancel', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockDatasetButton sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lock-cancel-btn'));
    expect(screen.queryByTestId('lock-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('shows disabled tooltip when gates not met', () => {
    mockUseQuery.mockReturnValue({
      data: {
        lockPreflightCheck: {
          ...preflightReady.lockPreflightCheck,
          allGatesMet: false,
        },
      },
      loading: false,
      error: null,
    });
    render(<LockDatasetButton sessionId="s-1" />);

    expect(screen.getByTestId('lock-dataset-btn')).toBeDisabled();
    expect(screen.getByTestId('lock-dataset-btn')).toHaveAttribute('title', 'Review gates not met');
  });
});
