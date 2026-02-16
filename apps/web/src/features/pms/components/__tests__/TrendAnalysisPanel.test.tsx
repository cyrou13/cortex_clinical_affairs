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
  Trash2: (props: Record<string, unknown>) => <span data-testid="icon-trash2" {...props} />,
  TrendingUp: (props: Record<string, unknown>) => <span data-testid="icon-trendingup" {...props} />,
  Database: (props: Record<string, unknown>) => <span data-testid="icon-database" {...props} />,
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
import { TrendAnalysisPanel } from '../TrendAnalysisPanel';

const mockBaseEntries = [
  {
    id: 'base-1',
    pmsCycleId: 'cyc-1',
    periodStart: '2024-01-01',
    periodEnd: '2024-03-31',
    totalUnitsShipped: 500,
    activeDevices: 450,
    regionBreakdown: { EU: 300, US: 150 },
  },
];

const mockTrendAnalysis = {
  id: 'trend-1',
  pmsCycleId: 'cyc-1',
  analysisDate: '2024-04-01',
  complaintTrends: { q1: 5, q2: 8 },
  severityDistribution: { LOW: 3, MEDIUM: 4, HIGH: 1 },
  classificationDistribution: { Technical: 5, Cosmetic: 3 },
  significantChanges: ['Increased complaints in Q2'],
  conclusions: null,
  status: 'DRAFT',
};

describe('TrendAnalysisPanel', () => {
  const mockCreateEntry = vi.fn();
  const mockDeleteEntry = vi.fn();
  const mockComputeTrend = vi.fn();
  const mockFinalizeTrend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(overrides?: {
    baseLoading?: boolean;
    trendLoading?: boolean;
    baseEntries?: typeof mockBaseEntries;
    trendAnalyses?: (typeof mockTrendAnalysis)[];
  }) {
    const {
      baseLoading = false,
      trendLoading = false,
      baseEntries = mockBaseEntries,
      trendAnalyses = [mockTrendAnalysis],
    } = overrides ?? {};

    mockUseQuery
      .mockReturnValueOnce({ data: { installedBaseEntries: baseEntries }, loading: baseLoading })
      .mockReturnValueOnce({ data: { trendAnalyses }, loading: trendLoading });

    mockUseMutation
      .mockReturnValueOnce([mockCreateEntry, { loading: false }])
      .mockReturnValueOnce([mockDeleteEntry, { loading: false }])
      .mockReturnValueOnce([mockComputeTrend, { loading: false }])
      .mockReturnValueOnce([mockFinalizeTrend, { loading: false }]);
  }

  it('shows loading state when baseLoading is true', () => {
    setupMocks({ baseLoading: true });
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('trend-loading')).toBeInTheDocument();
  });

  it('renders trend panel with both sections', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('trend-panel')).toBeInTheDocument();
    expect(screen.getByTestId('installed-base-section')).toBeInTheDocument();
    expect(screen.getByTestId('trend-section')).toBeInTheDocument();
  });

  it('shows installed base entries in table', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('base-entry-base-1')).toBeInTheDocument();
  });

  it('shows add entry button', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('add-base-btn')).toBeInTheDocument();
  });

  it('renders compute trends button', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('compute-btn')).toBeInTheDocument();
  });

  it('shows trend analysis card', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('trend-analysis-trend-1')).toBeInTheDocument();
  });

  it('shows conclusions input for DRAFT analysis', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('conclusions-input')).toBeInTheDocument();
  });

  it('shows finalize button for DRAFT analysis', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('finalize-btn')).toBeInTheDocument();
  });

  it('shows delete button per installed base entry', () => {
    setupMocks();
    render(<TrendAnalysisPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('delete-base-base-1')).toBeInTheDocument();
  });
});
