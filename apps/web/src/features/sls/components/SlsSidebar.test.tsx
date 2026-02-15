import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

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

describe('SlsSidebar', () => {
  const defaultProps = {
    projectId: 'proj-1',
    onNewSession: vi.fn(),
    onSelectSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session list', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSessions: mockSessions },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} />);

    expect(screen.getByText('CSpine Clinical Review')).toBeInTheDocument();
    expect(screen.getByText('Device SOA Search')).toBeInTheDocument();
    expect(screen.getByText('PMS Update 2026')).toBeInTheDocument();
  });

  it('shows session count badge', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSessions: mockSessions },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} />);

    const countBadge = screen.getByTestId('session-count');
    expect(countBadge).toHaveTextContent('3');
  });

  it('highlights active session', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSessions: mockSessions },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} activeSessionId="sess-2" />);

    const activeItem = screen.getByTestId('session-item-sess-2');
    expect(activeItem).toHaveAttribute('aria-current', 'true');
  });

  it('calls onNewSession when New Session button is clicked', () => {
    const onNewSession = vi.fn();
    mockUseQuery.mockReturnValue({
      data: { slsSessions: [] },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} onNewSession={onNewSession} />);

    fireEvent.click(screen.getByTestId('new-session-button'));
    expect(onNewSession).toHaveBeenCalled();
  });

  it('shows empty state when no sessions exist', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSessions: [] },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} />);

    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(
      screen.getByText(/no sls sessions yet/i),
    ).toBeInTheDocument();
  });

  it('shows type labels for sessions', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSessions: mockSessions },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} />);

    expect(screen.getByText('SOA Clinical')).toBeInTheDocument();
    expect(screen.getByText('SOA Device')).toBeInTheDocument();
    expect(screen.getByText('PMS Update')).toBeInTheDocument();
  });

  it('calls onSelectSession when a session is clicked', () => {
    const onSelectSession = vi.fn();
    mockUseQuery.mockReturnValue({
      data: { slsSessions: mockSessions },
      loading: false,
    });

    render(
      <SlsSidebar {...defaultProps} onSelectSession={onSelectSession} />,
    );

    fireEvent.click(screen.getByTestId('session-item-sess-1'));
    expect(onSelectSession).toHaveBeenCalledWith('sess-1');
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
    });

    render(<SlsSidebar {...defaultProps} />);

    expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();
  });

  it('does not show session count badge when no sessions', () => {
    mockUseQuery.mockReturnValue({
      data: { slsSessions: [] },
      loading: false,
    });

    render(<SlsSidebar {...defaultProps} />);

    expect(screen.queryByTestId('session-count')).not.toBeInTheDocument();
  });
});
