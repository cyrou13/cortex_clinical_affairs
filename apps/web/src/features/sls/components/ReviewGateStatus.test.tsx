import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ReviewGateStatus } from './ReviewGateStatus';

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

describe('ReviewGateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gate-loading')).toBeInTheDocument();
  });

  it('renders all gates when all met', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusAllMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('review-gate-status')).toBeInTheDocument();
    expect(screen.getByTestId('gate-0')).toBeInTheDocument();
    expect(screen.getByTestId('gate-1')).toBeInTheDocument();
    expect(screen.getByTestId('gate-2')).toBeInTheDocument();
  });

  it('shows green check for met gates', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusAllMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gate-0-check')).toBeInTheDocument();
  });

  it('shows red X for unmet gates', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusNotMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gate-0-x')).toBeInTheDocument();
  });

  it('shows "ready to lock" when all gates met', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusAllMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gates-summary')).toHaveTextContent('All gates met');
  });

  it('shows "some gates not met" when gates incomplete', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusNotMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gates-summary')).toHaveTextContent('Some gates not met');
  });

  it('displays article count for all-reviewed gate', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusNotMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gate-0')).toHaveTextContent('80 / 100');
  });

  it('displays spot-check count', () => {
    mockUseQuery.mockReturnValue({
      data: { reviewGateStatus: mockGateStatusNotMet },
      loading: false,
      error: null,
    });
    render(<ReviewGateStatus sessionId="s-1" />);

    expect(screen.getByTestId('gate-2')).toHaveTextContent('1 / 5 required');
  });

  it('renders nothing on error', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    const { container } = render(<ReviewGateStatus sessionId="s-1" />);

    expect(container.innerHTML).toBe('');
  });
});
