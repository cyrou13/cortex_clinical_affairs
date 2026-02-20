import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_QUERY_VERSIONS } from '../graphql/queries';
import { UPDATE_QUERY } from '../graphql/mutations';
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

function buildQueryMock(versions = mockVersions): MockedResponse {
  return {
    request: {
      query: GET_QUERY_VERSIONS,
      variables: { queryId: 'q-1' },
    },
    result: {
      data: { queryVersions: versions },
    },
  };
}

describe('QueryVersionHistory', () => {
  const defaultProps = {
    queryId: 'q-1',
    onClose: vi.fn(),
    onRestore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders version history panel', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock()]);

    await screen.findByText('Version History');
    expect(screen.getByTestId('version-history-panel')).toBeInTheDocument();
  });

  it('renders all version items', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock()]);

    await screen.findByTestId('version-item-v-1');
    expect(screen.getByTestId('version-item-v-2')).toBeInTheDocument();
    expect(screen.getByTestId('version-item-v-3')).toBeInTheDocument();
  });

  it('shows version numbers', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock()]);

    await screen.findByText('Version 1');
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Version 3')).toBeInTheDocument();
  });

  it('shows created by user', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock()]);

    await screen.findByText('by user-2');
    expect(screen.getAllByText('by user-1')).toHaveLength(2);
  });

  it('displays diff with additions and removals', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock()]);

    await screen.findByTestId('version-item-v-2');
    const diffDisplays = screen.getAllByTestId('diff-display');
    // v-2 and v-3 have diffs, v-1 does not
    expect(diffDisplays).toHaveLength(2);
  });

  it('highlights additions in green', async () => {
    const singleVersionMock: MockedResponse = {
      request: {
        query: GET_QUERY_VERSIONS,
        variables: { queryId: 'q-1' },
      },
      result: {
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
      },
    };

    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [singleVersionMock]);

    const diffDisplay = await screen.findByTestId('diff-display');
    const additionLine = diffDisplay.querySelector('.bg-green-100');
    expect(additionLine).toBeTruthy();
  });

  it('highlights removals in red', async () => {
    const singleVersionMock: MockedResponse = {
      request: {
        query: GET_QUERY_VERSIONS,
        variables: { queryId: 'q-1' },
      },
      result: {
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
      },
    };

    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [singleVersionMock]);

    const diffDisplay = await screen.findByTestId('diff-display');
    const removalLine = diffDisplay.querySelector('.bg-red-100');
    expect(removalLine).toBeTruthy();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderWithApollo(<QueryVersionHistory {...defaultProps} onClose={onClose} />, [
      buildQueryMock(),
    ]);

    await screen.findByTestId('close-version-history');
    fireEvent.click(screen.getByTestId('close-version-history'));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls updateQuery and onRestore when restore is clicked', async () => {
    const onRestore = vi.fn();
    const updateMock: MockedResponse = {
      request: {
        query: UPDATE_QUERY,
        variables: { id: 'q-1', queryString: 'cancer AND treatment' },
      },
      result: {
        data: { updateQuery: { id: 'q-1', queryString: 'cancer AND treatment', version: 4 } },
      },
    };

    renderWithApollo(<QueryVersionHistory {...defaultProps} onRestore={onRestore} />, [
      buildQueryMock(),
      updateMock,
    ]);

    await screen.findByTestId('restore-button-v-1');

    await act(async () => {
      fireEvent.click(screen.getByTestId('restore-button-v-1'));
    });

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith('cancer AND treatment');
    });
  });

  it('shows loading state', () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, []);

    expect(screen.getByText(/loading versions/i)).toBeInTheDocument();
  });

  it('shows empty state when no versions', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock([])]);

    await screen.findByTestId('no-versions');
  });

  it('has restore buttons for each version', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock()]);

    await screen.findByTestId('restore-button-v-1');
    expect(screen.getByTestId('restore-button-v-2')).toBeInTheDocument();
    expect(screen.getByTestId('restore-button-v-3')).toBeInTheDocument();
  });

  it('has fixed position and correct width', async () => {
    renderWithApollo(<QueryVersionHistory {...defaultProps} />, [buildQueryMock([])]);

    await screen.findByTestId('version-history-panel');
    const panel = screen.getByTestId('version-history-panel');
    expect(panel.className).toContain('fixed');
    expect(panel.className).toContain('w-[380px]');
  });
});
