import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { SessionDashboard } from './SessionDashboard';

const mockSession = {
  id: 'sess-1',
  name: 'CSpine Clinical Review',
  type: 'SOA_CLINICAL',
  status: 'DRAFT',
  scopeFields: {
    indication: 'Cervical spine degeneration',
    population: 'Adults with chronic neck pain',
    intervention: 'Anterior cervical discectomy',
    comparator: 'Conservative treatment',
    outcomes: 'Pain reduction, functional improvement',
  },
  createdById: 'user-1',
  createdAt: '2026-02-14T10:00:00Z',
  updatedAt: '2026-02-14T10:00:00Z',
};

describe('SessionDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows session name and type', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSession: mockSession },
      loading: false,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.getByText('CSpine Clinical Review')).toBeInTheDocument();
    expect(screen.getByText(/SOA Clinical/)).toBeInTheDocument();
  });

  it('shows status badge', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSession: mockSession },
      loading: false,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'draft');
  });

  it('shows metrics cards', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSession: mockSession },
      loading: false,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    expect(screen.getByTestId('metric-articles')).toBeInTheDocument();
    expect(screen.getByTestId('metric-screening-progress')).toBeInTheDocument();
    expect(screen.getByTestId('metric-queries')).toBeInTheDocument();
  });

  it('shows scope fields', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSession: mockSession },
      loading: false,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.getByTestId('scope-fields-card')).toBeInTheDocument();
    expect(screen.getByText('Indication')).toBeInTheDocument();
    expect(screen.getByText('Cervical spine degeneration')).toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByText('Adults with chronic neck pain')).toBeInTheDocument();
    expect(screen.getByText('Intervention')).toBeInTheDocument();
    expect(screen.getByText('Anterior cervical discectomy')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Network error'),
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.getByText(/failed to load session/i)).toBeInTheDocument();
  });

  it('does not show scope fields card when scopeFields is null', () => {
    mockUseQuery.mockReturnValue({
      data: {
        slsSession: { ...mockSession, scopeFields: null },
      },
      loading: false,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.queryByTestId('scope-fields-card')).not.toBeInTheDocument();
  });

  it('shows creation date', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSession: mockSession },
      loading: false,
      error: null,
    });

    render(<SessionDashboard sessionId="sess-1" />);

    expect(screen.getByText(/created/i)).toBeInTheDocument();
  });
});
