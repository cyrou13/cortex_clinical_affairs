import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ProtocolAmendmentHistory } from './ProtocolAmendmentHistory';

const mockAmendments = {
  protocolAmendments: [
    {
      id: 'amend-1',
      version: 2,
      date: '2026-02-10',
      author: 'Dr. Smith',
      reason: 'Updated sample size calculation',
      changes: [
        { field: 'sampleSize', oldValue: '50 patients', newValue: '100 patients' },
      ],
    },
    {
      id: 'amend-2',
      version: 3,
      date: '2026-02-14',
      author: 'Dr. Jones',
      reason: 'Added secondary endpoint',
      changes: [
        { field: 'endpoints', oldValue: '1 endpoint', newValue: '2 endpoints' },
      ],
    },
  ],
};

describe('ProtocolAmendmentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the amendment history', () => {
    mockUseQuery.mockReturnValue({ data: mockAmendments, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    expect(screen.getByTestId('amendment-history')).toBeInTheDocument();
  });

  it('displays amendment entries', () => {
    mockUseQuery.mockReturnValue({ data: mockAmendments, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    expect(screen.getByTestId('amendment-entry-amend-1')).toBeInTheDocument();
    expect(screen.getByTestId('amendment-entry-amend-2')).toBeInTheDocument();
  });

  it('shows version badges', () => {
    mockUseQuery.mockReturnValue({ data: mockAmendments, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    const versions = screen.getAllByTestId('amendment-version');
    expect(versions[0]).toHaveTextContent('v2');
    expect(versions[1]).toHaveTextContent('v3');
  });

  it('displays amendment reason', () => {
    mockUseQuery.mockReturnValue({ data: mockAmendments, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    const reasons = screen.getAllByTestId('amendment-reason');
    expect(reasons[0]).toHaveTextContent('Updated sample size calculation');
  });

  it('expands changes on click', () => {
    mockUseQuery.mockReturnValue({ data: mockAmendments, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    expect(screen.queryByTestId('amendment-changes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('amendment-toggle-amend-1'));

    expect(screen.getByTestId('amendment-changes')).toBeInTheDocument();
    expect(screen.getByText('50 patients')).toBeInTheDocument();
    expect(screen.getByText('100 patients')).toBeInTheDocument();
  });

  it('collapses changes on second click', () => {
    mockUseQuery.mockReturnValue({ data: mockAmendments, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    fireEvent.click(screen.getByTestId('amendment-toggle-amend-1'));
    expect(screen.getByTestId('amendment-changes')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('amendment-toggle-amend-1'));
    expect(screen.queryByTestId('amendment-changes')).not.toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockUseQuery.mockReturnValue({ data: { protocolAmendments: [] }, loading: false });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    expect(screen.getByTestId('no-amendments')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ProtocolAmendmentHistory studyId="study-1" />);

    expect(screen.getByTestId('amendment-loading')).toBeInTheDocument();
  });
});
