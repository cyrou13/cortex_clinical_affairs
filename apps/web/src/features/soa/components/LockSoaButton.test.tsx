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

import { LockSoaButton } from './LockSoaButton';

const preflightReady = {
  soaLockPreflight: {
    totalSections: 8,
    finalizedSections: 8,
    allSectionsFinalized: true,
    soaStatus: 'IN_PROGRESS',
  },
};

const preflightNotReady = {
  soaLockPreflight: {
    totalSections: 8,
    finalizedSections: 5,
    allSectionsFinalized: false,
    soaStatus: 'IN_PROGRESS',
  },
};

const preflightLocked = {
  soaLockPreflight: {
    totalSections: 8,
    finalizedSections: 8,
    allSectionsFinalized: true,
    soaStatus: 'LOCKED',
  },
};

describe('LockSoaButton', () => {
  const mockLock = vi.fn().mockResolvedValue({
    data: { lockSoaAnalysis: { soaAnalysisId: 'soa-1', lockedAt: '2026-02-14', status: 'LOCKED' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockLock, { loading: false }]);
  });

  it('renders lock button when conditions met', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockSoaButton soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('lock-soa-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lock-soa-btn')).not.toBeDisabled();
  });

  it('disables button when sections not finalized', () => {
    mockUseQuery.mockReturnValue({ data: preflightNotReady, loading: false, error: null });
    render(<LockSoaButton soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('lock-soa-btn')).toBeDisabled();
  });

  it('shows locked badge when already locked', () => {
    mockUseQuery.mockReturnValue({ data: preflightLocked, loading: false, error: null });
    render(<LockSoaButton soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('locked-badge')).toBeInTheDocument();
    expect(screen.getByTestId('locked-badge')).toHaveTextContent('SOA Locked');
  });

  it('opens confirmation dialog on click', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockSoaButton soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('lock-soa-btn'));

    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();
  });

  it('confirm button disabled until checkbox checked', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    render(<LockSoaButton soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('lock-soa-btn'));

    expect(screen.getByTestId('confirm-lock-btn')).toBeDisabled();

    fireEvent.click(screen.getByTestId('lock-checkbox'));

    expect(screen.getByTestId('confirm-lock-btn')).not.toBeDisabled();
  });

  it('calls mutation on confirm', async () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false, error: null });
    const onLocked = vi.fn();
    render(<LockSoaButton soaAnalysisId="soa-1" onLocked={onLocked} />);

    fireEvent.click(screen.getByTestId('lock-soa-btn'));
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('confirm-lock-btn'));

    await waitFor(() => {
      expect(mockLock).toHaveBeenCalledWith({ variables: { soaAnalysisId: 'soa-1' } });
    });
  });

  it('shows disabled tooltip when sections not finalized', () => {
    mockUseQuery.mockReturnValue({ data: preflightNotReady, loading: false, error: null });
    render(<LockSoaButton soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('lock-soa-btn')).toBeDisabled();
    expect(screen.getByTestId('lock-soa-btn')).toHaveAttribute('title', '3 sections not finalized');
  });
});
