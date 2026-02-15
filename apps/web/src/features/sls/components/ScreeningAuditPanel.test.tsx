import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ScreeningAuditPanel } from './ScreeningAuditPanel';

const mockEntries = [
  {
    id: 'entry-1',
    timestamp: '2026-02-14T10:00:00Z',
    userId: 'user-1',
    userName: 'Dr. Smith',
    articleId: 'art-1',
    articleTitle: 'Cervical spine surgery outcomes',
    decision: 'INCLUDED',
    exclusionCode: null,
    reason: 'Relevant to device',
    isSpotCheck: false,
    isAiOverride: false,
  },
  {
    id: 'entry-2',
    timestamp: '2026-02-14T10:05:00Z',
    userId: 'user-1',
    userName: 'Dr. Smith',
    articleId: 'art-2',
    articleTitle: 'Pediatric dental study',
    decision: 'EXCLUDED',
    exclusionCode: 'E1',
    reason: 'Not relevant - dental',
    isSpotCheck: true,
    isAiOverride: true,
  },
];

describe('ScreeningAuditPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('audit-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('audit-error')).toBeInTheDocument();
  });

  it('renders empty state when no entries', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: [], hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('audit-empty')).toBeInTheDocument();
  });

  it('renders audit table with entries', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('screening-audit-panel')).toBeInTheDocument();
    expect(screen.getByTestId('audit-table')).toBeInTheDocument();
    expect(screen.getByTestId('audit-row-entry-1')).toBeInTheDocument();
    expect(screen.getByTestId('audit-row-entry-2')).toBeInTheDocument();
  });

  it('displays decision badges', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    const badges = screen.getAllByTestId('decision-badge');
    expect(badges[0]).toHaveTextContent('INCLUDED');
    expect(badges[1]).toHaveTextContent('EXCLUDED');
  });

  it('shows spot-check indicator', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('indicator-spot-check')).toBeInTheDocument();
  });

  it('shows AI override indicator', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('indicator-ai-override')).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('audit-filters')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-included')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-excluded')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-skipped')).toBeInTheDocument();
  });

  it('clicking filter updates query variables', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('audit-filter-excluded'));

    // After re-render, useQuery should be called with the filter
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { sessionId: 's-1', filter: { decision: 'EXCLUDED' } },
      }),
    );
  });

  it('renders export button', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('audit-export-btn')).toBeInTheDocument();
    expect(screen.getByTestId('audit-export-btn')).toHaveTextContent('Export CSV');
  });

  it('displays user name and article title in rows', () => {
    mockUseQuery.mockReturnValue({
      data: { screeningAuditLog: { entries: mockEntries, hasMore: false, cursor: null } },
      loading: false,
      error: null,
    });
    render(<ScreeningAuditPanel sessionId="s-1" />);

    expect(screen.getByTestId('audit-row-entry-1')).toHaveTextContent('Dr. Smith');
    expect(screen.getByTestId('audit-row-entry-1')).toHaveTextContent('Cervical spine surgery outcomes');
  });
});
