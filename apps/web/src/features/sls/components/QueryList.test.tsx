import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockDuplicateQuery = vi.fn();
const mockUseMutation = vi.fn().mockReturnValue([mockDuplicateQuery, { loading: false }]);

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { QueryList } from './QueryList';

const mockQueries = [
  {
    id: 'q-1',
    name: 'Primary Search',
    queryString: 'cancer AND treatment',
    version: 3,
    isActive: true,
    parentQueryId: null,
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-14T12:00:00Z',
  },
  {
    id: 'q-2',
    name: 'Secondary Search',
    queryString: 'tumor OR neoplasm',
    version: 1,
    isActive: false,
    parentQueryId: null,
    createdAt: '2026-02-14T11:00:00Z',
    updatedAt: '2026-02-14T11:30:00Z',
  },
];

describe('QueryList', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    onSelect: vi.fn(),
    onCreateNew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockDuplicateQuery, { loading: false }]);
  });

  it('renders query list with items', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    expect(screen.getByText('Primary Search')).toBeInTheDocument();
    expect(screen.getByText('Secondary Search')).toBeInTheDocument();
  });

  it('shows version badges', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    expect(screen.getByTestId('version-badge-q-1')).toHaveTextContent('v3');
    expect(screen.getByTestId('version-badge-q-2')).toHaveTextContent('v1');
  });

  it('shows active badge for active query', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows last edited date', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    const editedTexts = screen.getAllByText(/Last edited/);
    expect(editedTexts).toHaveLength(2);
  });

  it('calls onSelect when query item is clicked', () => {
    const onSelect = vi.fn();
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('query-item-q-1'));

    expect(onSelect).toHaveBeenCalledWith('q-1');
  });

  it('calls duplicateQuery when duplicate button is clicked', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    fireEvent.click(screen.getByTestId('duplicate-button-q-1'));

    expect(mockDuplicateQuery).toHaveBeenCalledWith({
      variables: { id: 'q-1' },
    });
  });

  it('calls onCreateNew when New Query button is clicked', () => {
    const onCreateNew = vi.fn();
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} onCreateNew={onCreateNew} />);

    fireEvent.click(screen.getByTestId('new-query-button'));

    expect(onCreateNew).toHaveBeenCalled();
  });

  it('shows empty state when no queries', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: [] },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    expect(screen.getByTestId('empty-query-list')).toBeInTheDocument();
    expect(screen.getByText(/no queries yet/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
    });

    render(<QueryList {...defaultProps} />);

    expect(screen.getByText(/loading queries/i)).toBeInTheDocument();
  });

  it('highlights active query item', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: mockQueries },
      loading: false,
    });

    render(<QueryList {...defaultProps} activeQueryId="q-1" />);

    const activeItem = screen.getByTestId('query-item-q-1');
    expect(activeItem.className).toContain('border-[var(--cortex-blue-500)]');
  });

  it('renders New Query button', () => {
    mockUseQuery.mockReturnValue({
      data: { slsQueries: [] },
      loading: false,
    });

    render(<QueryList {...defaultProps} />);

    const button = screen.getByTestId('new-query-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('New Query');
  });
});
