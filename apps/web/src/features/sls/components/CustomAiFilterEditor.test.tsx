import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_CUSTOM_AI_FILTERS } from '../graphql/queries';
import {
  CREATE_CUSTOM_AI_FILTER,
  UPDATE_CUSTOM_AI_FILTER,
  DELETE_CUSTOM_AI_FILTER,
  LAUNCH_CUSTOM_FILTER_SCORING,
} from '../graphql/mutations';
import { CustomAiFilterEditor } from './CustomAiFilterEditor';

const mockFilters = [
  {
    id: 'f-1',
    name: 'Study Design Filter',
    criterion: 'Exclude studies that are not randomized controlled trials',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'f-2',
    name: 'Sample Size Filter',
    criterion: 'Exclude studies with fewer than 50 participants',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
  },
];

function buildQueryMock(sessionId = 'sess-1', filters = mockFilters): MockedResponse {
  return {
    request: {
      query: GET_CUSTOM_AI_FILTERS,
      variables: { sessionId },
    },
    result: {
      data: { customAiFilters: filters },
    },
  };
}

describe('CustomAiFilterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the custom AI filter editor', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByText('Custom AI Filters');
    expect(screen.getByTestId('custom-ai-filter-editor')).toBeInTheDocument();
  });

  it('renders existing filters', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('filter-item-f-1');
    expect(screen.getByTestId('filter-item-f-2')).toBeInTheDocument();
    expect(screen.getByTestId('filter-name-f-1')).toHaveTextContent('Study Design Filter');
    expect(screen.getByTestId('filter-criterion-f-1')).toHaveTextContent(
      'Exclude studies that are not randomized controlled trials',
    );
  });

  it('shows empty state when no filters', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock('sess-1', [])]);
    await screen.findByTestId('empty-filters');
  });

  it('shows loading state', () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, []);
    expect(screen.getByText('Loading custom filters...')).toBeInTheDocument();
  });

  it('opens create form when Add Filter is clicked', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('add-filter-button');
    fireEvent.click(screen.getByTestId('add-filter-button'));
    expect(screen.getByTestId('create-filter-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-filter-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-filter-criterion-input')).toBeInTheDocument();
  });

  it('creates a new filter', async () => {
    const createMock: MockedResponse = {
      request: {
        query: CREATE_CUSTOM_AI_FILTER,
        variables: {
          sessionId: 'sess-1',
          name: 'Language Filter',
          criterion: 'Only include English language studies',
        },
      },
      result: {
        data: {
          createCustomAiFilter: {
            id: 'new-1',
            name: 'Language Filter',
            criterion: 'Only include English language studies',
          },
        },
      },
    };
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [
      buildQueryMock(),
      createMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('add-filter-button');
    fireEvent.click(screen.getByTestId('add-filter-button'));

    fireEvent.change(screen.getByTestId('new-filter-name-input'), {
      target: { value: 'Language Filter' },
    });
    fireEvent.change(screen.getByTestId('new-filter-criterion-input'), {
      target: { value: 'Only include English language studies' },
    });
    fireEvent.click(screen.getByTestId('save-new-filter-button'));

    // After creating, the form should close
    await waitFor(() => {
      expect(screen.queryByTestId('create-filter-form')).not.toBeInTheDocument();
    });
  });

  it('disables create button when fields are empty', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('add-filter-button');
    fireEvent.click(screen.getByTestId('add-filter-button'));
    expect(screen.getByTestId('save-new-filter-button')).toBeDisabled();
  });

  it('cancels create form', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('add-filter-button');
    fireEvent.click(screen.getByTestId('add-filter-button'));
    expect(screen.getByTestId('create-filter-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-create-filter-button'));
    expect(screen.queryByTestId('create-filter-form')).not.toBeInTheDocument();
  });

  it('opens edit form for a filter', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('edit-filter-f-1');
    fireEvent.click(screen.getByTestId('edit-filter-f-1'));
    expect(screen.getByTestId('edit-filter-form-f-1')).toBeInTheDocument();
    expect(screen.getByTestId('edit-filter-name-f-1')).toHaveValue('Study Design Filter');
    expect(screen.getByTestId('edit-filter-criterion-f-1')).toHaveValue(
      'Exclude studies that are not randomized controlled trials',
    );
  });

  it('saves edited filter', async () => {
    const updateMock: MockedResponse = {
      request: {
        query: UPDATE_CUSTOM_AI_FILTER,
        variables: {
          id: 'f-1',
          name: 'Updated Filter Name',
          criterion: 'Exclude studies that are not randomized controlled trials',
        },
      },
      result: {
        data: {
          updateCustomAiFilter: {
            id: 'f-1',
            name: 'Updated Filter Name',
            criterion: 'Exclude studies that are not randomized controlled trials',
            isActive: true,
          },
        },
      },
    };
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [
      buildQueryMock(),
      updateMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('edit-filter-f-1');
    fireEvent.click(screen.getByTestId('edit-filter-f-1'));

    fireEvent.change(screen.getByTestId('edit-filter-name-f-1'), {
      target: { value: 'Updated Filter Name' },
    });
    fireEvent.click(screen.getByTestId('save-filter-edit-f-1'));

    // After saving, the edit form should close
    await waitFor(() => {
      expect(screen.queryByTestId('edit-filter-form-f-1')).not.toBeInTheDocument();
    });
  });

  it('cancels edit form', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('edit-filter-f-1');
    fireEvent.click(screen.getByTestId('edit-filter-f-1'));
    expect(screen.getByTestId('edit-filter-form-f-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-filter-edit-f-1'));
    expect(screen.queryByTestId('edit-filter-form-f-1')).not.toBeInTheDocument();
  });

  it('shows delete confirmation', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('delete-filter-f-1');
    fireEvent.click(screen.getByTestId('delete-filter-f-1'));
    expect(screen.getByTestId('confirm-delete-f-1')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-delete-f-1')).toBeInTheDocument();
  });

  it('deletes a filter after confirmation', async () => {
    const deleteMock: MockedResponse = {
      request: {
        query: DELETE_CUSTOM_AI_FILTER,
        variables: { id: 'f-1' },
      },
      result: {
        data: { deleteCustomAiFilter: true },
      },
    };
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [
      buildQueryMock(),
      deleteMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('delete-filter-f-1');
    fireEvent.click(screen.getByTestId('delete-filter-f-1'));
    fireEvent.click(screen.getByTestId('confirm-delete-f-1'));

    // After deleting, the confirmation should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-f-1')).not.toBeInTheDocument();
    });
  });

  it('cancels delete confirmation', async () => {
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('delete-filter-f-1');
    fireEvent.click(screen.getByTestId('delete-filter-f-1'));
    expect(screen.getByTestId('confirm-delete-f-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-delete-f-1'));
    expect(screen.queryByTestId('confirm-delete-f-1')).not.toBeInTheDocument();
  });

  it('launches scoring for a filter', async () => {
    const launchMock: MockedResponse = {
      request: {
        query: LAUNCH_CUSTOM_FILTER_SCORING,
        variables: { sessionId: 'sess-1', filterId: 'f-1' },
      },
      result: {
        data: { launchCustomFilterScoring: { taskId: 'task-123' } },
      },
    };
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock(), launchMock]);
    await screen.findByTestId('launch-scoring-f-1');
    fireEvent.click(screen.getByTestId('launch-scoring-f-1'));

    await screen.findByTestId('scoring-task-launched');
  });

  it('shows scoring task notification after launch', async () => {
    const launchMock: MockedResponse = {
      request: {
        query: LAUNCH_CUSTOM_FILTER_SCORING,
        variables: { sessionId: 'sess-1', filterId: 'f-1' },
      },
      result: {
        data: { launchCustomFilterScoring: { taskId: 'task-123' } },
      },
    };
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock(), launchMock]);
    await screen.findByTestId('launch-scoring-f-1');
    fireEvent.click(screen.getByTestId('launch-scoring-f-1'));

    await screen.findByTestId('scoring-task-launched');
    expect(screen.getByText(/task-123/)).toBeInTheDocument();
  });

  it('dismisses scoring task notification', async () => {
    const launchMock: MockedResponse = {
      request: {
        query: LAUNCH_CUSTOM_FILTER_SCORING,
        variables: { sessionId: 'sess-1', filterId: 'f-1' },
      },
      result: {
        data: { launchCustomFilterScoring: { taskId: 'task-123' } },
      },
    };
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-1" />, [buildQueryMock(), launchMock]);
    await screen.findByTestId('launch-scoring-f-1');
    fireEvent.click(screen.getByTestId('launch-scoring-f-1'));

    await screen.findByTestId('scoring-task-launched');

    fireEvent.click(screen.getByTestId('dismiss-scoring-task'));
    expect(screen.queryByTestId('scoring-task-launched')).not.toBeInTheDocument();
  });

  it('fetches custom filters for the given sessionId', async () => {
    const mocks: MockedResponse[] = [buildQueryMock('sess-42')];
    renderWithApollo(<CustomAiFilterEditor sessionId="sess-42" />, mocks);
    // If the variables are wrong, MockedProvider won't resolve data
    await screen.findByTestId('custom-ai-filter-editor');
    await screen.findByText('Custom AI Filters');
  });
});
