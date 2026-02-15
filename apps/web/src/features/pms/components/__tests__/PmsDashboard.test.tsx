import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('lucide-react', () => ({
  __esModule: true,
  ClipboardList: (props: Record<string, unknown>) => (
    <span data-testid="icon-clipboardlist" {...props} />
  ),
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import { PmsDashboard } from '../PmsDashboard';

const mockPlans = [
  {
    id: 'plan-1',
    projectId: 'proj-1',
    cerVersionId: 'cer-v1',
    updateFrequency: 'Annual',
    dataCollectionMethods: ['complaints', 'surveys'],
    status: 'DRAFT',
    createdById: 'user-1',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    approvedAt: null,
    approvedById: null,
    activatedAt: null,
  },
];

describe('PmsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ loading: true, data: null, error: null });
    render(<PmsDashboard projectId="proj-1" />);
    expect(screen.getByTestId('pms-loading')).toBeDefined();
  });

  it('shows error state with message', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: null,
      error: { message: 'Network error' },
    });
    render(<PmsDashboard projectId="proj-1" />);
    const errorEl = screen.getByTestId('pms-error');
    expect(errorEl).toBeDefined();
    expect(errorEl.textContent).toContain('Network error');
  });

  it('shows empty state when pmsPlans is empty array', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { pmsPlans: [] },
      error: null,
    });
    render(<PmsDashboard projectId="proj-1" />);
    expect(screen.getByTestId('pms-empty')).toBeDefined();
  });

  it('renders plan cards with correct testid', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { pmsPlans: mockPlans },
      error: null,
    });
    render(<PmsDashboard projectId="proj-1" />);
    expect(screen.getByTestId('pms-dashboard')).toBeDefined();
    expect(screen.getByTestId('plan-card-plan-1')).toBeDefined();
  });

  it('shows update frequency in plan card', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { pmsPlans: mockPlans },
      error: null,
    });
    render(<PmsDashboard projectId="proj-1" />);
    const card = screen.getByTestId('plan-card-plan-1');
    expect(card.textContent).toContain('Annual');
  });

  it('shows data collection methods', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { pmsPlans: mockPlans },
      error: null,
    });
    render(<PmsDashboard projectId="proj-1" />);
    const card = screen.getByTestId('plan-card-plan-1');
    expect(card.textContent).toContain('complaints');
    expect(card.textContent).toContain('surveys');
  });

  it('passes projectId as query variable', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { pmsPlans: mockPlans },
      error: null,
    });
    render(<PmsDashboard projectId="proj-1" />);
    expect(mockUseQuery).toHaveBeenCalled();
    const callArgs = mockUseQuery.mock.calls[0]!;
    expect(callArgs[1]).toEqual(
      expect.objectContaining({
        variables: expect.objectContaining({ projectId: 'proj-1' }),
      }),
    );
  });
});
