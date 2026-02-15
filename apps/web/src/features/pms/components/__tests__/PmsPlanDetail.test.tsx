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
  Settings: (props: Record<string, unknown>) => <span data-testid="icon-settings" {...props} />,
  Database: (props: Record<string, unknown>) => <span data-testid="icon-database" {...props} />,
  Users: (props: Record<string, unknown>) => <span data-testid="icon-users" {...props} />,
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import { PmsPlanDetail } from '../PmsPlanDetail';

const mockPlan = {
  id: 'plan-1',
  projectId: 'proj-1',
  cerVersionId: 'cer-v1',
  updateFrequency: 'Annual',
  dataCollectionMethods: ['complaints'],
  status: 'DRAFT',
  createdById: 'user-1',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  approvedAt: null,
  approvedById: null,
  activatedAt: null,
};

let queryCallCount: number;

const mockApproveFn = vi.fn();
const mockActivateFn = vi.fn();

function setupDefaultMocks(planOverride?: Partial<typeof mockPlan> | null) {
  queryCallCount = 0;
  const plan = planOverride === null ? null : { ...mockPlan, ...planOverride };
  mockUseQuery.mockImplementation(() => {
    queryCallCount++;
    const idx = ((queryCallCount - 1) % 3) + 1;
    if (idx === 1)
      return { data: { pmsPlan: plan }, loading: false, error: null };
    if (idx === 2)
      return { data: { vigilanceDatabases: [] }, loading: false, error: null };
    return { data: { pmsResponsibilities: [] }, loading: false, error: null };
  });
  let mutationCall = 0;
  const mutations: [ReturnType<typeof vi.fn>, { loading: boolean }][] = [
    [mockApproveFn, { loading: false }],
    [mockActivateFn, { loading: false }],
  ];
  mockUseMutation.mockImplementation(() => {
    const result = mutations[mutationCall % mutations.length];
    mutationCall++;
    return result;
  });
}

describe('PmsPlanDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCallCount = 0;
    mockApproveFn.mockReset();
    mockActivateFn.mockReset();
  });

  it('shows loading state', () => {
    queryCallCount = 0;
    mockUseQuery.mockImplementation(() => {
      queryCallCount++;
      if (queryCallCount === 1)
        return { data: null, loading: true, error: null };
      if (queryCallCount === 2)
        return { data: { vigilanceDatabases: [] }, loading: false, error: null };
      return { data: { pmsResponsibilities: [] }, loading: false, error: null };
    });
    mockUseMutation.mockImplementation(() => [vi.fn(), { loading: false }]);
    render(<PmsPlanDetail planId="plan-1" />);
    expect(screen.getByTestId('plan-loading')).toBeDefined();
  });

  it('shows error state with message', () => {
    queryCallCount = 0;
    mockUseQuery.mockImplementation(() => {
      queryCallCount++;
      if (queryCallCount === 1)
        return {
          data: null,
          loading: false,
          error: { message: 'Plan fetch failed' },
        };
      if (queryCallCount === 2)
        return { data: { vigilanceDatabases: [] }, loading: false, error: null };
      return { data: { pmsResponsibilities: [] }, loading: false, error: null };
    });
    mockUseMutation.mockImplementation(() => [vi.fn(), { loading: false }]);
    render(<PmsPlanDetail planId="plan-1" />);
    const errorEl = screen.getByTestId('plan-error');
    expect(errorEl).toBeDefined();
    expect(errorEl.textContent).toContain('Plan fetch failed');
  });

  it('shows plan-not-found when pmsPlan is null', () => {
    setupDefaultMocks(null);
    render(<PmsPlanDetail planId="plan-1" />);
    expect(screen.getByTestId('plan-not-found')).toBeDefined();
  });

  it('renders plan detail with config tab by default', () => {
    setupDefaultMocks();
    render(<PmsPlanDetail planId="plan-1" />);
    expect(screen.getByTestId('plan-detail')).toBeDefined();
    expect(screen.getByTestId('config-panel')).toBeDefined();
  });

  it('shows approve button for DRAFT status', () => {
    setupDefaultMocks({ status: 'DRAFT' });
    render(<PmsPlanDetail planId="plan-1" />);
    expect(screen.getByTestId('approve-btn')).toBeDefined();
  });

  it('shows activate button for APPROVED status', () => {
    setupDefaultMocks({ status: 'APPROVED' });
    render(<PmsPlanDetail planId="plan-1" />);
    expect(screen.getByTestId('activate-btn')).toBeDefined();
  });

  it('hides all action buttons for ACTIVE status', () => {
    setupDefaultMocks({ status: 'ACTIVE' });
    render(<PmsPlanDetail planId="plan-1" />);
    expect(screen.queryByTestId('approve-btn')).toBeNull();
    expect(screen.queryByTestId('activate-btn')).toBeNull();
  });

  it('switches to vigilance tab on click', () => {
    setupDefaultMocks();
    render(<PmsPlanDetail planId="plan-1" />);
    const vigilanceTab = screen.getByTestId('tab-vigilance');
    fireEvent.click(vigilanceTab);
    expect(vigilanceTab).toBeDefined();
  });

  it('switches to responsibilities tab on click', () => {
    setupDefaultMocks();
    render(<PmsPlanDetail planId="plan-1" />);
    const responsibilitiesTab = screen.getByTestId('tab-responsibilities');
    fireEvent.click(responsibilitiesTab);
    expect(responsibilitiesTab).toBeDefined();
  });

  it('calls approve mutation when approve button clicked', () => {
    setupDefaultMocks({ status: 'DRAFT' });
    render(<PmsPlanDetail planId="plan-1" />);
    const approveBtn = screen.getByTestId('approve-btn');
    fireEvent.click(approveBtn);
    expect(mockApproveFn).toHaveBeenCalled();
  });
});
