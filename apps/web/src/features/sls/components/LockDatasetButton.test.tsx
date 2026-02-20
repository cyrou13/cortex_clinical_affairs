import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { LockDatasetButton, LOCK_PREFLIGHT, LOCK_DATASET } from './LockDatasetButton';

const preflightReady = {
  pendingCount: 0,
  totalArticles: 500,
  includedCount: 200,
  excludedCount: 300,
  allGatesMet: true,
  sessionStatus: 'SCREENING',
};

const preflightPending = {
  pendingCount: 15,
  totalArticles: 500,
  includedCount: 185,
  excludedCount: 300,
  allGatesMet: false,
  sessionStatus: 'SCREENING',
};

const preflightLocked = {
  pendingCount: 0,
  totalArticles: 500,
  includedCount: 200,
  excludedCount: 300,
  allGatesMet: true,
  sessionStatus: 'LOCKED',
};

function buildPreflightMock(preflight = preflightReady): MockedResponse {
  return {
    request: {
      query: LOCK_PREFLIGHT,
      variables: { sessionId: 's-1' },
    },
    result: {
      data: { lockPreflightCheck: preflight },
    },
  };
}

function buildLockMock(): MockedResponse {
  return {
    request: {
      query: LOCK_DATASET,
      variables: { sessionId: 's-1' },
    },
    result: {
      data: {
        lockSlsDataset: {
          sessionId: 's-1',
          lockedAt: '2026-02-14',
          includedCount: 200,
          excludedCount: 300,
          totalArticles: 500,
        },
      },
    },
  };
}

describe('LockDatasetButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lock button when conditions met', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock()]);
    // Wait for the button to become enabled (data loaded)
    await waitFor(() => {
      const btn = screen.getByTestId('lock-dataset-btn');
      expect(btn).not.toBeDisabled();
    });
  });

  it('disables button when articles pending', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock(preflightPending)]);
    // Wait for data to load, then check disabled state
    await waitFor(() => {
      const btn = screen.getByTestId('lock-dataset-btn');
      expect(btn).toHaveAttribute('title', '15 articles still pending');
    });
    expect(screen.getByTestId('lock-dataset-btn')).toBeDisabled();
  });

  it('shows locked status when already locked', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock(preflightLocked)]);
    const status = await screen.findByTestId('lock-status-locked');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent('Dataset Locked');
  });

  it('opens confirmation dialog on click', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock()]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();
  });

  it('dialog shows article counts', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock()]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    expect(screen.getByTestId('recap-included')).toHaveTextContent('200');
    expect(screen.getByTestId('recap-excluded')).toHaveTextContent('300');
  });

  it('dialog confirm button disabled until checkbox checked', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock()]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    expect(screen.getByTestId('lock-confirm-btn')).toBeDisabled();
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    expect(screen.getByTestId('lock-confirm-btn')).not.toBeDisabled();
  });

  it('calls mutation on confirm', async () => {
    const onLocked = vi.fn();
    renderWithApollo(<LockDatasetButton sessionId="s-1" onLocked={onLocked} />, [
      buildPreflightMock(),
      buildLockMock(),
    ]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('lock-confirm-btn'));

    await waitFor(() => {
      expect(onLocked).toHaveBeenCalledWith({ includedCount: 200, excludedCount: 300 });
    });
  });

  it('calls onLocked callback after successful lock', async () => {
    const onLocked = vi.fn();
    renderWithApollo(<LockDatasetButton sessionId="s-1" onLocked={onLocked} />, [
      buildPreflightMock(),
      buildLockMock(),
    ]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('lock-confirm-btn'));

    await waitFor(() => {
      expect(onLocked).toHaveBeenCalledWith({ includedCount: 200, excludedCount: 300 });
    });
  });

  it('closes dialog on cancel', async () => {
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock()]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lock-dataset-btn'));
    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lock-cancel-btn'));
    expect(screen.queryByTestId('lock-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('shows disabled tooltip when gates not met', async () => {
    const gatesNotMet = {
      ...preflightReady,
      allGatesMet: false,
    };
    renderWithApollo(<LockDatasetButton sessionId="s-1" />, [buildPreflightMock(gatesNotMet)]);
    await waitFor(() => {
      expect(screen.getByTestId('lock-dataset-btn')).toHaveAttribute(
        'title',
        'Review gates not met',
      );
    });
    expect(screen.getByTestId('lock-dataset-btn')).toBeDisabled();
  });
});
