import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ImportVersionDiff } from './ImportVersionDiff';

const mockDiffData = {
  importVersionDiff: {
    summary: { added: 5, removed: 2, modified: 3 },
    rows: [
      { id: 'r-1', type: 'ADDED', field: 'Patient 101', oldValue: null, newValue: '95.2' },
      { id: 'r-2', type: 'REMOVED', field: 'Patient 50', oldValue: '88.1', newValue: null },
      { id: 'r-3', type: 'MODIFIED', field: 'Patient 75', oldValue: '91.0', newValue: '92.5' },
    ],
  },
};

describe('ImportVersionDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the diff component', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    expect(screen.getByTestId('import-diff')).toBeInTheDocument();
  });

  it('displays summary counts', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    expect(screen.getByTestId('diff-summary')).toBeInTheDocument();
    expect(screen.getByTestId('added-count')).toHaveTextContent('5 added');
    expect(screen.getByTestId('removed-count')).toHaveTextContent('2 removed');
    expect(screen.getByTestId('modified-count')).toHaveTextContent('3 modified');
  });

  it('displays diff table', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    expect(screen.getByTestId('diff-table')).toBeInTheDocument();
  });

  it('displays diff rows', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    expect(screen.getByTestId('diff-row-r-1')).toBeInTheDocument();
    expect(screen.getByTestId('diff-row-r-2')).toBeInTheDocument();
    expect(screen.getByTestId('diff-row-r-3')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    expect(screen.getByTestId('diff-loading')).toBeInTheDocument();
  });

  it('shows empty diff state', () => {
    mockUseQuery.mockReturnValue({
      data: { importVersionDiff: { summary: { added: 0, removed: 0, modified: 0 }, rows: [] } },
      loading: false,
    });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    expect(screen.getByTestId('no-diff')).toBeInTheDocument();
  });

  it('color-codes added rows', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    const addedRow = screen.getByTestId('diff-row-r-1');
    expect(addedRow.className).toContain('bg-emerald-50');
  });

  it('color-codes removed rows', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    const removedRow = screen.getByTestId('diff-row-r-2');
    expect(removedRow.className).toContain('bg-red-50');
  });

  it('color-codes modified rows', () => {
    mockUseQuery.mockReturnValue({ data: mockDiffData, loading: false });
    render(<ImportVersionDiff studyId="study-1" versionA="v-1" versionB="v-2" />);

    const modifiedRow = screen.getByTestId('diff-row-r-3');
    expect(modifiedRow.className).toContain('bg-orange-50');
  });
});
