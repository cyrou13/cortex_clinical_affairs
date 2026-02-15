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
  Plus: (props: Record<string, unknown>) => <span data-testid="icon-plus" {...props} />,
  Upload: (props: Record<string, unknown>) => <span data-testid="icon-upload" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <span data-testid="icon-alert" {...props} />,
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
import { ComplaintsDashboard } from '../ComplaintsDashboard';

const mockComplaints = [
  {
    id: 'comp-1',
    pmsCycleId: 'cyc-1',
    date: '2024-02-01',
    reportDate: '2024-02-02',
    description: 'Device malfunction',
    deviceIdentifier: 'DEV-001',
    lotNumber: 'LOT-A',
    serialNumber: null,
    severity: 'HIGH',
    classification: 'Technical',
    classificationDescription: null,
    status: 'OPEN',
    resolution: null,
    resolutionDate: null,
    source: 'MANUAL',
    externalId: null,
    isIncident: true,
    regulatoryReportRequired: false,
    harmSeverity: null,
    correctiveAction: null,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
  },
  {
    id: 'comp-2',
    pmsCycleId: 'cyc-1',
    date: '2024-02-15',
    reportDate: '2024-02-16',
    description: 'Minor scratch',
    deviceIdentifier: 'DEV-002',
    lotNumber: null,
    serialNumber: null,
    severity: 'LOW',
    classification: 'Cosmetic',
    classificationDescription: null,
    status: 'RESOLVED',
    resolution: 'Replaced',
    resolutionDate: '2024-03-01',
    source: 'MANUAL',
    externalId: null,
    isIncident: false,
    regulatoryReportRequired: false,
    harmSeverity: null,
    correctiveAction: null,
    createdAt: '2024-02-15',
    updatedAt: '2024-03-01',
  },
];

const mockCreateComplaint = vi.fn();
const mockImportComplaints = vi.fn();

function setupMutationMocks() {
  let mutationCall = 0;
  const mutations: [ReturnType<typeof vi.fn>, { loading: boolean }][] = [
    [mockCreateComplaint, { loading: false }],
    [mockImportComplaints, { loading: false }],
  ];
  mockUseMutation.mockImplementation(() => {
    const result = mutations[mutationCall % mutations.length];
    mutationCall++;
    return result;
  });
}

describe('ComplaintsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('complaints-loading')).toBeInTheDocument();
  });

  it('shows empty state when no complaints', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: [] },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('complaints-empty')).toBeInTheDocument();
  });

  it('renders complaints table with rows', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('complaints-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('complaints-table')).toBeInTheDocument();
    expect(screen.getByTestId('complaint-row-comp-1')).toBeInTheDocument();
    expect(screen.getByTestId('complaint-row-comp-2')).toBeInTheDocument();
  });

  it('shows total complaints metric', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    const metricTotal = screen.getByTestId('metric-total');
    expect(metricTotal).toBeInTheDocument();
    expect(metricTotal).toHaveTextContent('2');
  });

  it('shows incidents metric count', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    const metricIncidents = screen.getByTestId('metric-incidents');
    expect(metricIncidents).toBeInTheDocument();
    expect(metricIncidents).toHaveTextContent('1');
  });

  it('shows severity filter dropdown', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('filter-severity')).toBeInTheDocument();
  });

  it('shows status filter dropdown', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
  });

  it('renders add complaint button', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('add-complaint-btn')).toBeInTheDocument();
  });

  it('renders import button', () => {
    mockUseQuery.mockReturnValue({
      data: { complaints: mockComplaints },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<ComplaintsDashboard cycleId="cyc-1" />);

    expect(screen.getByTestId('import-btn')).toBeInTheDocument();
  });
});
