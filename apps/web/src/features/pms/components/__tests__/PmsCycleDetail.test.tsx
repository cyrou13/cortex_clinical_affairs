import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
  Calendar: (props: Record<string, unknown>) => <span data-testid="icon-calendar" {...props} />,
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../TrendAnalysisPanel', () => ({
  TrendAnalysisPanel: ({ cycleId }: { cycleId: string }) => <div data-testid="mock-trend-panel">TrendAnalysisPanel {cycleId}</div>,
}));

vi.mock('../ReportGeneration', () => ({
  ReportGeneration: ({ cycleId }: { cycleId: string }) => <div data-testid="mock-report-gen">ReportGeneration {cycleId}</div>,
}));

vi.mock('../CerUpdateDecisionPanel', () => ({
  CerUpdateDecisionPanel: ({ cycleId }: { cycleId: string }) => <div data-testid="mock-cer-decision">CerUpdateDecisionPanel {cycleId}</div>,
}));

// Import component AFTER mocks
import { PmsCycleDetail } from '../PmsCycleDetail';

const mockCycle = {
  id: 'cyc-1',
  pmsPlanId: 'plan-1',
  cerVersionId: 'cer-v1',
  name: 'Q1 2024 Cycle',
  startDate: '2024-01-01',
  endDate: '2024-03-31',
  status: 'ACTIVE',
  completedAt: null,
  createdById: 'user-1',
  createdAt: '2024-01-01',
};

describe('PmsCycleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(overrides?: {
    loading?: boolean;
    error?: Error | null;
    cycle?: typeof mockCycle | null;
  }) {
    const { loading = false, error = null, cycle = mockCycle } = overrides ?? {};

    mockUseQuery.mockReturnValue({
      data: cycle ? { pmsCycle: cycle } : null,
      loading,
      error,
    });
  }

  it('shows loading state', () => {
    setupMocks({ loading: true });
    render(<PmsCycleDetail cycleId="cyc-1" />);
    expect(screen.getByTestId('cycle-detail-loading')).toBeInTheDocument();
  });

  it('shows not-found state on error', () => {
    setupMocks({ error: new Error('Not found') });
    render(<PmsCycleDetail cycleId="cyc-1" />);
    expect(screen.getByTestId('cycle-detail-not-found')).toBeInTheDocument();
  });

  it('shows not-found state when cycle data is null', () => {
    setupMocks({ cycle: null });
    render(<PmsCycleDetail cycleId="cyc-1" />);
    expect(screen.getByTestId('cycle-detail-not-found')).toBeInTheDocument();
  });

  it('renders cycle detail with name', () => {
    setupMocks();
    render(<PmsCycleDetail cycleId="cyc-1" />);
    expect(screen.getByTestId('cycle-detail')).toBeInTheDocument();
    expect(screen.getByText('Q1 2024 Cycle')).toBeInTheDocument();
  });

  it('shows activities placeholder by default', () => {
    setupMocks();
    render(<PmsCycleDetail cycleId="cyc-1" />);
    expect(screen.getByTestId('tab-activities')).toBeInTheDocument();
    expect(screen.getByTestId('activities-placeholder')).toBeInTheDocument();
  });

  it('switches to trends tab and shows TrendAnalysisPanel', () => {
    setupMocks();
    render(<PmsCycleDetail cycleId="cyc-1" />);
    fireEvent.click(screen.getByTestId('tab-trends'));
    expect(screen.getByTestId('mock-trend-panel')).toBeInTheDocument();
  });

  it('switches to reports tab and shows ReportGeneration', () => {
    setupMocks();
    render(<PmsCycleDetail cycleId="cyc-1" />);
    fireEvent.click(screen.getByTestId('tab-reports'));
    expect(screen.getByTestId('mock-report-gen')).toBeInTheDocument();
  });

  it('switches to decision tab and shows CerUpdateDecisionPanel', () => {
    setupMocks();
    render(<PmsCycleDetail cycleId="cyc-1" />);
    fireEvent.click(screen.getByTestId('tab-decision'));
    expect(screen.getByTestId('mock-cer-decision')).toBeInTheDocument();
  });
});
