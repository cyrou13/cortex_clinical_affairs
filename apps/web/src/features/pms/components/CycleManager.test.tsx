import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { CycleManager } from './CycleManager';

const mockCyclesData = {
  pmsCycles: [
    {
      id: 'cycle-1',
      name: 'Q1 2026',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      status: 'COMPLETED',
      completedAt: '2026-04-01',
    },
    {
      id: 'cycle-2',
      name: 'Q2 2026',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      status: 'ACTIVE',
    },
    {
      id: 'cycle-3',
      name: 'Q3 2026',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: 'PLANNED',
    },
  ],
};

describe('CycleManager', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: { createPmsCycle: { id: 'cycle-4', name: 'Q4 2026', status: 'PLANNED' } },
  });
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null, refetch: mockRefetch });
    render(<CycleManager planId="plan-1" />);

    expect(screen.getByTestId('cycle-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Failed'),
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    expect(screen.getByTestId('cycle-error')).toBeInTheDocument();
  });

  it('renders empty state when no cycles', () => {
    mockUseQuery.mockReturnValue({
      data: { pmsCycles: [] },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    expect(screen.getByTestId('empty-cycles')).toBeInTheDocument();
  });

  it('renders cycle timeline', () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    expect(screen.getByTestId('cycle-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-item-cycle-1')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-item-cycle-2')).toBeInTheDocument();
    expect(screen.getByTestId('cycle-item-cycle-3')).toBeInTheDocument();
  });

  it('displays cycle details', () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
    expect(screen.getByText('Q2 2026')).toBeInTheDocument();
    expect(screen.getByText('Q3 2026')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBe(3);
  });

  it('opens create cycle dialog', () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    fireEvent.click(screen.getByTestId('create-cycle-btn'));

    expect(screen.getByTestId('create-cycle-dialog')).toBeInTheDocument();
  });

  it('closes create cycle dialog on cancel', () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    fireEvent.click(screen.getByTestId('create-cycle-btn'));
    fireEvent.click(screen.getByTestId('cancel-create-btn'));

    expect(screen.queryByTestId('create-cycle-dialog')).not.toBeInTheDocument();
  });

  it('confirm button disabled until all fields filled', () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    fireEvent.click(screen.getByTestId('create-cycle-btn'));

    expect(screen.getByTestId('confirm-create-btn')).toBeDisabled();

    fireEvent.change(screen.getByTestId('cycle-name-input'), {
      target: { value: 'Q4 2026' },
    });
    fireEvent.change(screen.getByTestId('cycle-start-input'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByTestId('cycle-end-input'), {
      target: { value: '2026-12-31' },
    });

    expect(screen.getByTestId('confirm-create-btn')).not.toBeDisabled();
  });

  it('calls mutation on cycle creation', async () => {
    mockUseQuery.mockReturnValue({
      data: mockCyclesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<CycleManager planId="plan-1" />);

    fireEvent.click(screen.getByTestId('create-cycle-btn'));

    fireEvent.change(screen.getByTestId('cycle-name-input'), {
      target: { value: 'Q4 2026' },
    });
    fireEvent.change(screen.getByTestId('cycle-start-input'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByTestId('cycle-end-input'), {
      target: { value: '2026-12-31' },
    });

    fireEvent.click(screen.getByTestId('confirm-create-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        variables: {
          input: {
            planId: 'plan-1',
            name: 'Q4 2026',
            startDate: '2026-10-01',
            endDate: '2026-12-31',
          },
        },
      });
    });
  });
});
