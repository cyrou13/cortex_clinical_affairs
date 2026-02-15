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
  Scale: (props: Record<string, unknown>) => <span data-testid="icon-scale" {...props} />,
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Import component AFTER mocks
import { CerUpdateDecisionPanel } from '../CerUpdateDecisionPanel';

const mockDecision = {
  id: 'dec-1',
  pmsCycleId: 'cyc-1',
  benefitRiskReAssessment: 'Favorable benefit-risk ratio',
  conclusion: 'CER_UPDATE_NOT_REQUIRED' as const,
  justification: 'No material changes identified',
  materialChangesIdentified: false,
  materialChangesDescription: null,
  status: 'DRAFT',
  decidedBy: 'user-1',
  decidedAt: null,
  createdAt: '2024-01-15T00:00:00Z',
};

describe('CerUpdateDecisionPanel', () => {
  const mockCreateDecision = vi.fn();
  const mockFinalizeDecision = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(overrides?: {
    loading?: boolean;
    decision?: typeof mockDecision | null;
  }) {
    const { loading = false, decision = mockDecision } = overrides ?? {};

    mockUseQuery.mockReturnValueOnce({
      data: decision ? { cerUpdateDecision: decision } : { cerUpdateDecision: null },
      loading,
    });

    mockUseMutation
      .mockReturnValueOnce([mockCreateDecision, { loading: false }])
      .mockReturnValueOnce([mockFinalizeDecision, { loading: false }]);
  }

  it('shows loading state', () => {
    setupMocks({ loading: true });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('decision-loading')).toBeInTheDocument();
  });

  it('shows creation form when no decision exists', () => {
    setupMocks({ decision: null });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('decision-form')).toBeInTheDocument();
  });

  it('shows benefit-risk input', () => {
    setupMocks({ decision: null });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('benefit-risk-input')).toBeInTheDocument();
  });

  it('shows conclusion select', () => {
    setupMocks({ decision: null });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('conclusion-select')).toBeInTheDocument();
  });

  it('shows justification input', () => {
    setupMocks({ decision: null });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('justification-input')).toBeInTheDocument();
  });

  it('shows material changes checkbox', () => {
    setupMocks({ decision: null });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('material-changes-checkbox')).toBeInTheDocument();
  });

  it('shows decision detail when decision exists', () => {
    setupMocks();
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('decision-detail')).toBeInTheDocument();
  });

  it('shows finalize button for DRAFT status', () => {
    setupMocks();
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.getByTestId('finalize-decision-btn')).toBeInTheDocument();
  });

  it('hides finalize button for FINALIZED status', () => {
    setupMocks({ decision: { ...mockDecision, status: 'FINALIZED' } });
    render(<CerUpdateDecisionPanel cycleId="cyc-1" />);
    expect(screen.queryByTestId('finalize-decision-btn')).not.toBeInTheDocument();
  });
});
