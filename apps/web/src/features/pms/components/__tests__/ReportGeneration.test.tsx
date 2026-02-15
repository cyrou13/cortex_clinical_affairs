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
  FileText: (props: Record<string, unknown>) => <span data-testid="icon-filetext" {...props} />,
  BarChart3: (props: Record<string, unknown>) => <span data-testid="icon-barchart3" {...props} />,
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Import component AFTER mocks
import { ReportGeneration } from '../ReportGeneration';

describe('ReportGeneration', () => {
  const mockGeneratePmcf = vi.fn();
  const mockGeneratePsur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(overrides?: {
    pmcfLoading?: boolean;
    psurLoading?: boolean;
    pmcfError?: Error | null;
    psurError?: Error | null;
  }) {
    const {
      pmcfLoading = false,
      psurLoading = false,
      pmcfError = null,
      psurError = null,
    } = overrides ?? {};

    mockUseMutation
      .mockReturnValueOnce([mockGeneratePmcf, { loading: pmcfLoading, error: pmcfError }])
      .mockReturnValueOnce([mockGeneratePsur, { loading: psurLoading, error: psurError }]);
  }

  it('renders report generation panel', () => {
    setupMocks();
    render(<ReportGeneration cycleId="cyc-1" />);
    expect(screen.getByTestId('report-generation')).toBeInTheDocument();
  });

  it('shows PMCF generate button', () => {
    setupMocks();
    render(<ReportGeneration cycleId="cyc-1" />);
    expect(screen.getByTestId('generate-pmcf-btn')).toBeInTheDocument();
  });

  it('shows PSUR generate button', () => {
    setupMocks();
    render(<ReportGeneration cycleId="cyc-1" />);
    expect(screen.getByTestId('generate-psur-btn')).toBeInTheDocument();
  });

  it('calls PMCF mutation when button clicked', () => {
    setupMocks();
    render(<ReportGeneration cycleId="cyc-1" />);
    fireEvent.click(screen.getByTestId('generate-pmcf-btn'));
    expect(mockGeneratePmcf).toHaveBeenCalled();
  });

  it('calls PSUR mutation when button clicked', () => {
    setupMocks();
    render(<ReportGeneration cycleId="cyc-1" />);
    fireEvent.click(screen.getByTestId('generate-psur-btn'));
    expect(mockGeneratePsur).toHaveBeenCalled();
  });

  it('shows Generating... text when PMCF loading is true', () => {
    setupMocks({ pmcfLoading: true });
    render(<ReportGeneration cycleId="cyc-1" />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('shows Generating... text when PSUR loading is true', () => {
    setupMocks({ psurLoading: true });
    render(<ReportGeneration cycleId="cyc-1" />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });
});
