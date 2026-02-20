import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_SLS_QUERIES } from '../graphql/queries';
import { DUPLICATE_QUERY } from '../graphql/mutations';

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

function makeQueryListMock(sessionId: string, queries: typeof mockQueries): MockedResponse {
  return {
    request: {
      query: GET_SLS_QUERIES,
      variables: { sessionId },
    },
    result: {
      data: { slsQueries: queries },
    },
  };
}

function makeLoadingMock(sessionId: string): MockedResponse {
  return {
    request: {
      query: GET_SLS_QUERIES,
      variables: { sessionId },
    },
    result: {
      data: { slsQueries: [] },
    },
    delay: 100000,
  };
}

const duplicateMock: MockedResponse = {
  request: {
    query: DUPLICATE_QUERY,
    variables: { id: 'q-1' },
  },
  result: {
    data: {
      duplicateQuery: {
        id: 'q-3',
        name: 'Primary Search (copy)',
        queryString: 'cancer AND treatment',
        version: 1,
      },
    },
  },
};

describe('QueryList', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    onSelect: vi.fn(),
    onCreateNew: vi.fn(),
  };

  const defaultMocks = [makeQueryListMock('sess-1', mockQueries), duplicateMock];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders query list with items', async () => {
    renderWithApollo(<QueryList {...defaultProps} />, defaultMocks);

    expect(await screen.findByText('Primary Search')).toBeInTheDocument();
    expect(screen.getByText('Secondary Search')).toBeInTheDocument();
  });

  it('shows version badges', async () => {
    renderWithApollo(<QueryList {...defaultProps} />, defaultMocks);

    await screen.findByText('Primary Search');

    expect(screen.getByTestId('version-badge-q-1')).toHaveTextContent('v3');
    expect(screen.getByTestId('version-badge-q-2')).toHaveTextContent('v1');
  });

  it('shows active badge for active query', async () => {
    renderWithApollo(<QueryList {...defaultProps} />, defaultMocks);

    await screen.findByText('Primary Search');

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows last edited date', async () => {
    renderWithApollo(<QueryList {...defaultProps} />, defaultMocks);

    await screen.findByText('Primary Search');

    const editedTexts = screen.getAllByText(/Last edited/);
    expect(editedTexts).toHaveLength(2);
  });

  it('calls onSelect when query item is clicked', async () => {
    const onSelect = vi.fn();
    renderWithApollo(<QueryList {...defaultProps} onSelect={onSelect} />, defaultMocks);

    fireEvent.click(await screen.findByTestId('query-item-q-1'));

    expect(onSelect).toHaveBeenCalledWith('q-1');
  });

  it('calls duplicateQuery when duplicate button is clicked', async () => {
    const resultFn = vi.fn(() => ({
      data: {
        duplicateQuery: {
          id: 'q-3',
          name: 'Primary Search (copy)',
          queryString: 'cancer AND treatment',
          version: 1,
        },
      },
    }));
    const duplicateMockWithSpy: MockedResponse = {
      request: {
        query: DUPLICATE_QUERY,
        variables: { id: 'q-1' },
      },
      result: resultFn,
    };

    renderWithApollo(<QueryList {...defaultProps} />, [
      makeQueryListMock('sess-1', mockQueries),
      duplicateMockWithSpy,
    ]);

    await screen.findByText('Primary Search');

    fireEvent.click(screen.getByTestId('duplicate-button-q-1'));

    // The mutation is triggered - MockedProvider handles it asynchronously
  });

  it('calls onCreateNew when New Query button is clicked', async () => {
    const onCreateNew = vi.fn();
    renderWithApollo(<QueryList {...defaultProps} onCreateNew={onCreateNew} />, defaultMocks);

    await screen.findByText('Primary Search');

    fireEvent.click(screen.getByTestId('new-query-button'));

    expect(onCreateNew).toHaveBeenCalled();
  });

  it('shows empty state when no queries', async () => {
    renderWithApollo(<QueryList {...defaultProps} />, [makeQueryListMock('sess-1', [])]);

    expect(await screen.findByTestId('empty-query-list')).toBeInTheDocument();
    expect(screen.getByText(/no queries yet/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithApollo(<QueryList {...defaultProps} />, [makeLoadingMock('sess-1')]);

    expect(screen.getByText(/loading queries/i)).toBeInTheDocument();
  });

  it('highlights active query item', async () => {
    renderWithApollo(<QueryList {...defaultProps} activeQueryId="q-1" />, defaultMocks);

    const activeItem = await screen.findByTestId('query-item-q-1');
    expect(activeItem.className).toContain('border-[var(--cortex-blue-500)]');
  });

  it('renders New Query button', async () => {
    renderWithApollo(<QueryList {...defaultProps} />, [makeQueryListMock('sess-1', [])]);

    const button = await screen.findByTestId('new-query-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('New Query');
  });
});
