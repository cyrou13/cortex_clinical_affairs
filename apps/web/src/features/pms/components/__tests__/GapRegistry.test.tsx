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
  AlertTriangle: (props: Record<string, unknown>) => <span data-testid="icon-alert" {...props} />,
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../StatusBadge', () => ({
  PmsStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import { GapRegistry } from '../GapRegistry';

const mockEntries = [
  {
    id: 'gap-1',
    pmsPlanId: 'plan-1',
    sourceModule: 'SOA',
    sourceId: 'src-1',
    description: 'Missing data for clinical endpoint',
    severity: 'HIGH',
    recommendedActivity: 'Literature update',
    status: 'OPEN',
    manuallyCreated: false,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const mockPopulate = vi.fn();

describe('GapRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPopulate.mockReset();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ loading: true, data: null, error: null });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    expect(screen.getByTestId('gap-loading')).toBeDefined();
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: null,
      error: { message: 'Failed to load gaps' },
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    const errorEl = screen.getByTestId('gap-error');
    expect(errorEl).toBeDefined();
    expect(errorEl.textContent).toContain('Failed to load gaps');
  });

  it('shows empty state when no entries', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { gapRegistryEntries: [] },
      error: null,
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    expect(screen.getByTestId('gap-empty')).toBeDefined();
  });

  it('renders gap entries with correct testid', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { gapRegistryEntries: mockEntries },
      error: null,
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    expect(screen.getByTestId('gap-registry')).toBeDefined();
    expect(screen.getByTestId('gap-entry-gap-1')).toBeDefined();
  });

  it('shows populate button', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { gapRegistryEntries: mockEntries },
      error: null,
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    expect(screen.getByTestId('populate-gaps-btn')).toBeDefined();
  });

  it('shows filter dropdowns', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { gapRegistryEntries: mockEntries },
      error: null,
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    expect(screen.getByTestId('gap-filters')).toBeDefined();
    expect(screen.getByTestId('filter-status')).toBeDefined();
    expect(screen.getByTestId('filter-severity')).toBeDefined();
  });

  it('displays description and source module', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { gapRegistryEntries: mockEntries },
      error: null,
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    const entry = screen.getByTestId('gap-entry-gap-1');
    expect(entry.textContent).toContain('Missing data for clinical endpoint');
    expect(entry.textContent).toContain('SOA');
  });

  it('shows recommended activity text', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { gapRegistryEntries: mockEntries },
      error: null,
    });
    mockUseMutation.mockReturnValue([mockPopulate, { loading: false }]);
    render(<GapRegistry pmsPlanId="plan-1" />);
    const entry = screen.getByTestId('gap-entry-gap-1');
    expect(entry.textContent).toContain('Literature update');
  });
});
