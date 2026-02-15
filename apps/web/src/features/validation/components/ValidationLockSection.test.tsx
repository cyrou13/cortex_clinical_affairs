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

import { ValidationLockSection } from './ValidationLockSection';

const preflightReady = {
  validationLockPreflight: {
    studyStatus: 'IN_PROGRESS',
    protocolApproved: true,
    dataImported: true,
    resultsComputed: true,
    allEndpointsMet: true,
    reportsGenerated: true,
    canLock: true,
  },
};

const preflightNotReady = {
  validationLockPreflight: {
    studyStatus: 'IN_PROGRESS',
    protocolApproved: true,
    dataImported: true,
    resultsComputed: false,
    allEndpointsMet: false,
    reportsGenerated: false,
    canLock: false,
  },
};

const preflightLocked = {
  validationLockPreflight: {
    studyStatus: 'LOCKED',
    protocolApproved: true,
    dataImported: true,
    resultsComputed: true,
    allEndpointsMet: true,
    reportsGenerated: true,
    canLock: false,
  },
};

describe('ValidationLockSection', () => {
  const mockLock = vi.fn().mockResolvedValue({
    data: { lockValidationStudy: { studyId: 'study-1', lockedAt: '2026-02-14', status: 'LOCKED' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockLock, { loading: false }]);
  });

  it('renders lock button when ready', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    expect(screen.getByTestId('lock-validation-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lock-validation-btn')).not.toBeDisabled();
  });

  it('disables lock button when not ready', () => {
    mockUseQuery.mockReturnValue({ data: preflightNotReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    expect(screen.getByTestId('lock-validation-btn')).toBeDisabled();
  });

  it('shows locked badge when already locked', () => {
    mockUseQuery.mockReturnValue({ data: preflightLocked, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    expect(screen.getByTestId('locked-badge')).toBeInTheDocument();
    expect(screen.getByTestId('locked-badge')).toHaveTextContent('Validation Locked');
  });

  it('shows preflight checks summary', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    expect(screen.getByTestId('lock-summary')).toBeInTheDocument();
    expect(screen.getByText('Protocol approved')).toBeInTheDocument();
    expect(screen.getByText('Data imported')).toBeInTheDocument();
    expect(screen.getByText('Results computed')).toBeInTheDocument();
  });

  it('opens confirmation dialog on click', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    fireEvent.click(screen.getByTestId('lock-validation-btn'));

    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();
  });

  it('confirm button disabled until checkbox checked', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    fireEvent.click(screen.getByTestId('lock-validation-btn'));

    expect(screen.getByTestId('confirm-lock-btn')).toBeDisabled();

    fireEvent.click(screen.getByTestId('lock-checkbox'));

    expect(screen.getByTestId('confirm-lock-btn')).not.toBeDisabled();
  });

  it('calls mutation on confirm', async () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false });
    const onLocked = vi.fn();
    render(<ValidationLockSection studyId="study-1" onLocked={onLocked} />);

    fireEvent.click(screen.getByTestId('lock-validation-btn'));
    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('confirm-lock-btn'));

    await waitFor(() => {
      expect(mockLock).toHaveBeenCalledWith({ variables: { studyId: 'study-1' } });
    });
  });

  it('closes dialog on cancel', () => {
    mockUseQuery.mockReturnValue({ data: preflightReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    fireEvent.click(screen.getByTestId('lock-validation-btn'));
    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lock-cancel-btn'));
    expect(screen.queryByTestId('lock-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('shows check marks for met prerequisites', () => {
    mockUseQuery.mockReturnValue({ data: preflightNotReady, loading: false });
    render(<ValidationLockSection studyId="study-1" />);

    const summary = screen.getByTestId('lock-summary');
    expect(summary).toBeInTheDocument();
    // 2 met (protocol, data) + 3 not met (results, endpoints, reports)
    expect(screen.getByText('Protocol approved')).toBeInTheDocument();
    expect(screen.getByText('Results computed')).toBeInTheDocument();
  });
});
