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

import { ImportVersionList } from './ImportVersionList';

const mockVersions = {
  importVersions: [
    { id: 'v-1', version: 1, date: '2026-02-10', status: 'VALID', rowCount: 100, isActive: true },
    { id: 'v-2', version: 2, date: '2026-02-14', status: 'VALID', rowCount: 120, isActive: false },
    { id: 'v-3', version: 3, date: '2026-02-14', status: 'PROCESSING', rowCount: 0, isActive: false },
  ],
};

describe('ImportVersionList', () => {
  const mockSetActive = vi.fn().mockResolvedValue({
    data: { setActiveImportVersion: { versionId: 'v-2', isActive: true } },
  });
  const mockRollback = vi.fn().mockResolvedValue({
    data: { rollbackImportVersion: { versionId: 'v-2', status: 'ROLLED_BACK' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockSetActive, { loading: false }],
      [mockRollback, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders the version list', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    expect(screen.getByTestId('import-version-list')).toBeInTheDocument();
  });

  it('displays version cards', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    expect(screen.getByTestId('version-card-v-1')).toBeInTheDocument();
    expect(screen.getByTestId('version-card-v-2')).toBeInTheDocument();
    expect(screen.getByTestId('version-card-v-3')).toBeInTheDocument();
  });

  it('shows version status badges', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    const statuses = screen.getAllByTestId('version-status');
    expect(statuses[0]).toHaveTextContent('VALID');
  });

  it('shows set active button for non-active valid versions', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    const activeButtons = screen.getAllByTestId('set-active-btn');
    expect(activeButtons.length).toBe(1); // Only v-2 (VALID and not active)
  });

  it('calls setActive mutation', async () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    fireEvent.click(screen.getAllByTestId('set-active-btn')[0]);

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({
        variables: { studyId: 'study-1', versionId: 'v-2' },
      });
    });
  });

  it('shows compare button for each version', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    const compareButtons = screen.getAllByTestId('compare-btn');
    expect(compareButtons.length).toBe(3);
  });

  it('shows rollback button', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    const rollbackButtons = screen.getAllByTestId('rollback-btn');
    expect(rollbackButtons.length).toBe(3);
  });

  it('shows empty state', () => {
    mockUseQuery.mockReturnValue({ data: { importVersions: [] }, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    expect(screen.getByTestId('no-versions')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ImportVersionList studyId="study-1" />);

    expect(screen.getByTestId('versions-loading')).toBeInTheDocument();
  });

  it('highlights active version card', () => {
    mockUseQuery.mockReturnValue({ data: mockVersions, loading: false });
    render(<ImportVersionList studyId="study-1" />);

    const activeCard = screen.getByTestId('version-card-v-1');
    expect(activeCard.className).toContain('bg-blue-50');
  });
});
