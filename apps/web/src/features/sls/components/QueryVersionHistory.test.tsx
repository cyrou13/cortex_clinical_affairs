import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUpdateQuery = vi.fn();
const mockUseMutation = vi.fn().mockReturnValue([mockUpdateQuery, { loading: false }]);

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { QueryVersionHistory } from './QueryVersionHistory';

const mockVersions = [
  {
    id: 'v-1',
    version: 1,
    queryString: 'cancer AND treatment',
    diff: null,
    createdAt: '2026-02-14T10:00:00Z',
    createdById: 'user-1',
  },
  {
    id: 'v-2',
    version: 2,
    queryString: 'cancer AND treatment AND surgery',
    diff: '-cancer AND treatment\n+cancer AND treatment AND surgery',
    createdAt: '2026-02-14T12:00:00Z',
    createdById: 'user-2',
  },
  {
    id: 'v-3',
    version: 3,
    queryString: '(cancer OR tumor) AND treatment AND surgery',
    diff: '-cancer AND treatment AND surgery\n+(cancer OR tumor) AND treatment AND surgery',
    createdAt: '2026-02-14T14:00:00Z',
    createdById: 'user-1',
  },
];

describe('QueryVersionHistory', () => {
  const defaultProps = {
    queryId: 'q-1',
    onClose: vi.fn(),
    onRestore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockUpdateQuery, { loading: false }]);
  });

  it('renders version history panel', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getByTestId('version-history-panel')).toBeInTheDocument();
    expect(screen.getByText('Version History')).toBeInTheDocument();
  });

  it('renders all version items', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getByTestId('version-item-v-1')).toBeInTheDocument();
    expect(screen.getByTestId('version-item-v-2')).toBeInTheDocument();
    expect(screen.getByTestId('version-item-v-3')).toBeInTheDocument();
  });

  it('shows version numbers', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Version 3')).toBeInTheDocument();
  });

  it('shows created by user', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getAllByText('by user-1')).toHaveLength(2);
    expect(screen.getByText('by user-2')).toBeInTheDocument();
  });

  it('displays diff with additions and removals', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    const diffDisplays = screen.getAllByTestId('diff-display');
    // v-2 and v-3 have diffs, v-1 does not
    expect(diffDisplays).toHaveLength(2);
  });

  it('highlights additions in green', () => {
    mockUseQuery.mockReturnValue({
      data: {
        queryVersions: [
          {
            id: 'v-2',
            version: 2,
            queryString: 'cancer AND treatment AND surgery',
            diff: '+cancer AND treatment AND surgery',
            createdAt: '2026-02-14T12:00:00Z',
            createdById: 'user-2',
          },
        ],
      },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    const diffDisplay = screen.getByTestId('diff-display');
    const additionLine = diffDisplay.querySelector('.bg-green-100');
    expect(additionLine).toBeTruthy();
  });

  it('highlights removals in red', () => {
    mockUseQuery.mockReturnValue({
      data: {
        queryVersions: [
          {
            id: 'v-2',
            version: 2,
            queryString: 'cancer AND treatment AND surgery',
            diff: '-cancer AND treatment',
            createdAt: '2026-02-14T12:00:00Z',
            createdById: 'user-2',
          },
        ],
      },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    const diffDisplay = screen.getByTestId('diff-display');
    const removalLine = diffDisplay.querySelector('.bg-red-100');
    expect(removalLine).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-version-history'));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls updateQuery and onRestore when restore is clicked', async () => {
    const onRestore = vi.fn();
    mockUpdateQuery.mockResolvedValue({ data: { updateQuery: { id: 'q-1', queryString: 'cancer AND treatment', version: 4 } } });
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} onRestore={onRestore} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('restore-button-v-1'));
    });

    expect(mockUpdateQuery).toHaveBeenCalledWith({
      variables: { id: 'q-1', queryString: 'cancer AND treatment' },
    });
    expect(onRestore).toHaveBeenCalledWith('cancer AND treatment');
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getByText(/loading versions/i)).toBeInTheDocument();
  });

  it('shows empty state when no versions', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: [] },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getByTestId('no-versions')).toBeInTheDocument();
  });

  it('has restore buttons for each version', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: mockVersions },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    expect(screen.getByTestId('restore-button-v-1')).toBeInTheDocument();
    expect(screen.getByTestId('restore-button-v-2')).toBeInTheDocument();
    expect(screen.getByTestId('restore-button-v-3')).toBeInTheDocument();
  });

  it('has fixed position and correct width', () => {
    mockUseQuery.mockReturnValue({
      data: { queryVersions: [] },
      loading: false,
    });

    render(<QueryVersionHistory {...defaultProps} />);

    const panel = screen.getByTestId('version-history-panel');
    expect(panel.className).toContain('fixed');
    expect(panel.className).toContain('w-[380px]');
  });
});
