import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { ScreeningAuditPanel, GET_SCREENING_AUDIT_LOG } from './ScreeningAuditPanel';

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

function buildQueryMock(entries = mockEntries, filter?: { decision: string }): MockedResponse {
  return {
    request: {
      query: GET_SCREENING_AUDIT_LOG,
      variables: { sessionId: 's-1', filter },
    },
    result: {
      data: {
        screeningAuditLog: { entries, hasMore: false, cursor: null },
      },
    },
  };
}

describe('ScreeningAuditPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, []);
    expect(screen.getByTestId('audit-loading')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: GET_SCREENING_AUDIT_LOG,
        variables: { sessionId: 's-1', filter: undefined },
      },
      error: new Error('fail'),
    };
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [errorMock]);
    expect(await screen.findByTestId('audit-error')).toBeInTheDocument();
  });

  it('renders empty state when no entries', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock([])]);
    expect(await screen.findByTestId('audit-empty')).toBeInTheDocument();
  });

  it('renders audit table with entries', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('screening-audit-panel')).toBeInTheDocument();
    expect(screen.getByTestId('audit-table')).toBeInTheDocument();
    expect(screen.getByTestId('audit-row-entry-1')).toBeInTheDocument();
    expect(screen.getByTestId('audit-row-entry-2')).toBeInTheDocument();
  });

  it('displays decision badges', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    await screen.findByTestId('audit-table');
    const badges = screen.getAllByTestId('decision-badge');
    expect(badges[0]).toHaveTextContent('INCLUDED');
    expect(badges[1]).toHaveTextContent('EXCLUDED');
  });

  it('shows spot-check indicator', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('indicator-spot-check')).toBeInTheDocument();
  });

  it('shows AI override indicator', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('indicator-ai-override')).toBeInTheDocument();
  });

  it('renders filter buttons', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    await screen.findByTestId('screening-audit-panel');
    expect(screen.getByTestId('audit-filters')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-included')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-excluded')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-skipped')).toBeInTheDocument();
  });

  it('clicking filter updates query and shows filtered results', async () => {
    // Provide both the initial (no filter) and the filtered mock
    const excludedEntries = [mockEntries[1]!];
    const filteredMock = buildQueryMock(excludedEntries, { decision: 'EXCLUDED' });
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock(), filteredMock]);

    await screen.findByTestId('audit-table');
    fireEvent.click(screen.getByTestId('audit-filter-excluded'));

    // After clicking the filter, the query re-fires with the new variables and shows filtered results
    await waitFor(() => {
      expect(screen.getByTestId('audit-row-entry-2')).toBeInTheDocument();
      expect(screen.queryByTestId('audit-row-entry-1')).not.toBeInTheDocument();
    });
  });

  it('renders export button', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    await screen.findByTestId('screening-audit-panel');
    expect(screen.getByTestId('audit-export-btn')).toBeInTheDocument();
    expect(screen.getByTestId('audit-export-btn')).toHaveTextContent('Export CSV');
  });

  it('displays user name and article title in rows', async () => {
    renderWithApollo(<ScreeningAuditPanel sessionId="s-1" />, [buildQueryMock()]);
    await screen.findByTestId('audit-table');
    expect(screen.getByTestId('audit-row-entry-1')).toHaveTextContent('Dr. Smith');
    expect(screen.getByTestId('audit-row-entry-1')).toHaveTextContent(
      'Cervical spine surgery outcomes',
    );
  });
});
