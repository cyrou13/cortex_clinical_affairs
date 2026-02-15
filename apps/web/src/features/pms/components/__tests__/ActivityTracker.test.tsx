import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock('lucide-react', () => ({
  __esModule: true,
  BookOpen: (props: Record<string, unknown>) => <span data-testid="icon-bookopen" {...props} />,
  Search: (props: Record<string, unknown>) => <span data-testid="icon-search" {...props} />,
  ClipboardList: (props: Record<string, unknown>) => <span data-testid="icon-clipboard" {...props} />,
  Users: (props: Record<string, unknown>) => <span data-testid="icon-users" {...props} />,
  Microscope: (props: Record<string, unknown>) => <span data-testid="icon-microscope" {...props} />,
  FileBarChart: (props: Record<string, unknown>) => <span data-testid="icon-filebarchart" {...props} />,
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Import component AFTER mocks
import { ActivityTracker } from '../ActivityTracker';

const mockActivities = [
  {
    id: 'act-1',
    pmsCycleId: 'cyc-1',
    activityType: 'LITERATURE_UPDATE',
    assigneeId: 'user-1-long-id',
    title: 'Literature Review',
    description: 'Review new literature',
    status: 'PLANNED',
    startedAt: null,
    completedAt: null,
    findingsSummary: null,
    dataCollected: null,
    conclusions: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'act-2',
    pmsCycleId: 'cyc-1',
    activityType: 'LITERATURE_UPDATE',
    assigneeId: 'user-2-long-id',
    title: 'Follow-up Review',
    description: 'Follow up',
    status: 'IN_PROGRESS',
    startedAt: '2024-02-01',
    completedAt: null,
    findingsSummary: null,
    dataCollected: null,
    conclusions: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-01',
  },
];

const mockStartActivity = vi.fn();
const mockCompleteActivity = vi.fn();

function setupMutationMocks() {
  let mutationCall = 0;
  const mutations: [ReturnType<typeof vi.fn>, { loading: boolean }][] = [
    [mockStartActivity, { loading: false }],
    [mockCompleteActivity, { loading: false }],
  ];
  mockUseMutation.mockImplementation(() => {
    const result = mutations[mutationCall % mutations.length];
    mutationCall++;
    return result;
  });
}

describe('ActivityTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByTestId('activity-loading')).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: [] },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByTestId('activity-empty')).toBeInTheDocument();
  });

  it('renders activity cards', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: mockActivities },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByTestId('activity-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('activity-card-act-1')).toBeInTheDocument();
    expect(screen.getByTestId('activity-card-act-2')).toBeInTheDocument();
  });

  it('shows start button for PLANNED activity', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: mockActivities },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByTestId('start-activity-act-1')).toBeInTheDocument();
  });

  it('shows complete button for IN_PROGRESS activity', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: mockActivities },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByTestId('complete-activity-act-2')).toBeInTheDocument();
  });

  it('renders status filter dropdown', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: mockActivities },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
  });

  it('shows activity title in card', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: mockActivities },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    expect(screen.getByText('Literature Review')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Review')).toBeInTheDocument();
  });

  it('shows assignee id (truncated) in card', () => {
    mockUseQuery.mockReturnValue({
      data: { pmcfActivities: mockActivities },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ActivityTracker cycleId="cyc-1" />);

    // Assignee IDs should be displayed, possibly truncated
    expect(screen.getByText(/user-1/)).toBeInTheDocument();
    expect(screen.getByText(/user-2/)).toBeInTheDocument();
  });
});
