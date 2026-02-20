import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_SLS_SESSIONS } from '../graphql/queries';
import { SlsSidebar } from './SlsSidebar';

const mockSessions = [
  {
    id: 'sess-1',
    name: 'CSpine Clinical Review',
    type: 'SOA_CLINICAL',
    status: 'DRAFT',
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-14T10:00:00Z',
  },
  {
    id: 'sess-2',
    name: 'Device SOA Search',
    type: 'SOA_DEVICE',
    status: 'SCREENING',
    createdAt: '2026-02-14T11:00:00Z',
    updatedAt: '2026-02-14T11:00:00Z',
  },
  {
    id: 'sess-3',
    name: 'PMS Update 2026',
    type: 'PMS_UPDATE',
    status: 'COMPLETED',
    createdAt: '2026-02-14T12:00:00Z',
    updatedAt: '2026-02-14T12:00:00Z',
  },
];

function buildQueryMock(sessions = mockSessions): MockedResponse {
  return {
    request: {
      query: GET_SLS_SESSIONS,
      variables: { projectId: 'proj-1' },
    },
    result: {
      data: { slsSessions: sessions },
    },
  };
}

describe('SlsSidebar', () => {
  const defaultProps = {
    projectId: 'proj-1',
    onNewSession: vi.fn(),
    onSelectSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session list', async () => {
    renderWithApollo(<SlsSidebar {...defaultProps} />, [buildQueryMock()]);

    await screen.findByText('CSpine Clinical Review');
    expect(screen.getByText('Device SOA Search')).toBeInTheDocument();
    expect(screen.getByText('PMS Update 2026')).toBeInTheDocument();
  });

  it('shows session count badge', async () => {
    renderWithApollo(<SlsSidebar {...defaultProps} />, [buildQueryMock()]);

    const countBadge = await screen.findByTestId('session-count');
    expect(countBadge).toHaveTextContent('3');
  });

  it('highlights active session', async () => {
    renderWithApollo(<SlsSidebar {...defaultProps} activeSessionId="sess-2" />, [buildQueryMock()]);

    const activeItem = await screen.findByTestId('session-item-sess-2');
    expect(activeItem).toHaveAttribute('aria-current', 'true');
  });

  it('calls onNewSession when New Session button is clicked', async () => {
    const onNewSession = vi.fn();
    renderWithApollo(<SlsSidebar {...defaultProps} onNewSession={onNewSession} />, [
      buildQueryMock([]),
    ]);

    await screen.findByTestId('new-session-button');
    fireEvent.click(screen.getByTestId('new-session-button'));
    expect(onNewSession).toHaveBeenCalled();
  });

  it('shows empty state when no sessions exist', async () => {
    renderWithApollo(<SlsSidebar {...defaultProps} />, [buildQueryMock([])]);

    const emptyState = await screen.findByTestId('empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText(/no sls sessions yet/i)).toBeInTheDocument();
  });

  it('shows type labels for sessions', async () => {
    renderWithApollo(<SlsSidebar {...defaultProps} />, [buildQueryMock()]);

    await screen.findByText('SOA Clinical');
    expect(screen.getByText('SOA Device')).toBeInTheDocument();
    expect(screen.getByText('PMS Update')).toBeInTheDocument();
  });

  it('calls onSelectSession when a session is clicked', async () => {
    const onSelectSession = vi.fn();
    renderWithApollo(<SlsSidebar {...defaultProps} onSelectSession={onSelectSession} />, [
      buildQueryMock(),
    ]);

    await screen.findByTestId('session-item-sess-1');
    fireEvent.click(screen.getByTestId('session-item-sess-1'));
    expect(onSelectSession).toHaveBeenCalledWith('sess-1');
  });

  it('shows loading state', () => {
    // No mocks = query never resolves = loading state
    renderWithApollo(<SlsSidebar {...defaultProps} />, []);

    expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();
  });

  it('does not show session count badge when no sessions', async () => {
    renderWithApollo(<SlsSidebar {...defaultProps} />, [buildQueryMock([])]);

    await screen.findByTestId('empty-state');
    expect(screen.queryByTestId('session-count')).not.toBeInTheDocument();
  });
});
