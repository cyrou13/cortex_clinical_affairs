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
  Plus: (props: Record<string, unknown>) => <span data-testid="icon-plus" {...props} />,
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
import { CycleTimeline } from '../CycleTimeline';

const mockCycles = [
  {
    id: 'cyc-1',
    pmsPlanId: 'plan-1',
    cerVersionId: 'cer-v1',
    name: 'Q1 2024',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    status: 'PLANNED',
    completedAt: null,
    createdById: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'cyc-2',
    pmsPlanId: 'plan-1',
    cerVersionId: 'cer-v1',
    name: 'Q2 2024',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    status: 'ACTIVE',
    completedAt: null,
    createdById: 'user-1',
    createdAt: '2024-04-01',
    updatedAt: '2024-04-01',
  },
  {
    id: 'cyc-3',
    pmsPlanId: 'plan-1',
    cerVersionId: 'cer-v1',
    name: 'Q3 2024',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    status: 'COMPLETED',
    completedAt: '2024-09-30',
    createdById: 'user-1',
    createdAt: '2024-07-01',
    updatedAt: '2024-09-30',
  },
];

const mockCreateCycle = vi.fn();
const mockActivateCycle = vi.fn();
const mockCompleteCycle = vi.fn();

function setupMutationMocks() {
  let mutationCall = 0;
  const mutations: [ReturnType<typeof vi.fn>, { loading: boolean }][] = [
    [mockCreateCycle, { loading: false }],
    [mockActivateCycle, { loading: false }],
    [mockCompleteCycle, { loading: false }],
  ];
  mockUseMutation.mockImplementation(() => {
    const result = mutations[mutationCall % mutations.length];
    mutationCall++;
    return result;
  });
}

describe('CycleTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    expect(screen.getByTestId('cycle-loading')).toBeInTheDocument();
  });

  it('shows empty state when no cycles', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: [] },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    expect(screen.getByTestId('cycle-empty')).toBeInTheDocument();
  });

  it('renders cycle cards with cycle-card-cyc-1, cyc-2, cyc-3', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    expect(screen.getByTestId('cycle-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-card-cyc-1')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-card-cyc-2')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-card-cyc-3')).toBeInTheDocument();
  });

  it('shows activate button for PLANNED cycle', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    expect(screen.getByTestId('activate-cycle-cyc-1')).toBeInTheDocument();
  });

  it('shows complete button for ACTIVE cycle', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    expect(screen.getByTestId('complete-cycle-cyc-2')).toBeInTheDocument();
  });

  it('hides action buttons for COMPLETED cycle', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    expect(screen.queryByTestId('activate-cycle-cyc-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('complete-cycle-cyc-3')).not.toBeInTheDocument();
  });

  it('toggles create form on create-cycle-btn click', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    const createBtn = screen.getByTestId('create-cycle-btn');
    expect(screen.queryByTestId('cycle-name-input')).not.toBeInTheDocument();

    fireEvent.click(createBtn);

    expect(screen.getByTestId('cycle-name-input')).toBeInTheDocument();
  });

  it('shows form inputs when form visible', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    fireEvent.click(screen.getByTestId('create-cycle-btn'));

    expect(screen.getByTestId('cycle-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-cer-input')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-start-input')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-end-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-cycle-btn')).toBeInTheDocument();
  });

  it('disables submit when form fields empty', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: mockCycles },
      loading: false,
      error: null,
    });
    setupMutationMocks();

    render(<CycleTimeline pmsPlanId="plan-1" />);

    fireEvent.click(screen.getByTestId('create-cycle-btn'));

    const submitBtn = screen.getByTestId('submit-cycle-btn');
    expect(submitBtn).toBeDisabled();
  });
});
