import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockCreateFilter = vi.fn();
const mockUpdateFilter = vi.fn();
const mockDeleteFilter = vi.fn();
const mockLaunchScoring = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (mutation: unknown) => {
    const mutationStr = String(mutation);
    if (mutationStr.includes('createCustomAiFilter')) {
      return [mockCreateFilter, { loading: false }];
    }
    if (mutationStr.includes('updateCustomAiFilter')) {
      return [mockUpdateFilter, { loading: false }];
    }
    if (mutationStr.includes('deleteCustomAiFilter')) {
      return [mockDeleteFilter, { loading: false }];
    }
    if (mutationStr.includes('launchCustomFilterScoring')) {
      return [mockLaunchScoring, { loading: false }];
    }
    return [vi.fn(), { loading: false }];
  },
}));

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

describe('CustomAiFilterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFilter.mockResolvedValue({
      data: { createCustomAiFilter: { id: 'new-1', name: 'New', criterion: 'Test' } },
    });
    mockUpdateFilter.mockResolvedValue({
      data: { updateCustomAiFilter: { id: 'f-1', name: 'Updated', criterion: 'Updated', isActive: true } },
    });
    mockDeleteFilter.mockResolvedValue({ data: { deleteCustomAiFilter: true } });
    mockLaunchScoring.mockResolvedValue({
      data: { launchCustomFilterScoring: { taskId: 'task-123' } },
    });
    mockUseQuery.mockReturnValue({
      data: { customAiFilters: mockFilters },
      loading: false,
    });
  });

  it('renders the custom AI filter editor', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    expect(screen.getByTestId('custom-ai-filter-editor')).toBeInTheDocument();
    expect(screen.getByText('Custom AI Filters')).toBeInTheDocument();
  });

  it('renders existing filters', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    expect(screen.getByTestId('filter-item-f-1')).toBeInTheDocument();
    expect(screen.getByTestId('filter-item-f-2')).toBeInTheDocument();
    expect(screen.getByTestId('filter-name-f-1')).toHaveTextContent('Study Design Filter');
    expect(screen.getByTestId('filter-criterion-f-1')).toHaveTextContent(
      'Exclude studies that are not randomized controlled trials',
    );
  });

  it('shows empty state when no filters', () => {
    mockUseQuery.mockReturnValue({
      data: { customAiFilters: [] },
      loading: false,
    });
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    expect(screen.getByTestId('empty-filters')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    expect(screen.getByText('Loading custom filters...')).toBeInTheDocument();
  });

  it('opens create form when Add Filter is clicked', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-filter-button'));
    expect(screen.getByTestId('create-filter-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-filter-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-filter-criterion-input')).toBeInTheDocument();
  });

  it('creates a new filter', async () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-filter-button'));

    fireEvent.change(screen.getByTestId('new-filter-name-input'), {
      target: { value: 'Language Filter' },
    });
    fireEvent.change(screen.getByTestId('new-filter-criterion-input'), {
      target: { value: 'Only include English language studies' },
    });
    fireEvent.click(screen.getByTestId('save-new-filter-button'));

    await waitFor(() => {
      expect(mockCreateFilter).toHaveBeenCalledWith({
        variables: {
          sessionId: 'sess-1',
          name: 'Language Filter',
          criterion: 'Only include English language studies',
        },
      });
    });
  });

  it('disables create button when fields are empty', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-filter-button'));
    expect(screen.getByTestId('save-new-filter-button')).toBeDisabled();
  });

  it('cancels create form', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-filter-button'));
    expect(screen.getByTestId('create-filter-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-create-filter-button'));
    expect(screen.queryByTestId('create-filter-form')).not.toBeInTheDocument();
  });

  it('opens edit form for a filter', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('edit-filter-f-1'));
    expect(screen.getByTestId('edit-filter-form-f-1')).toBeInTheDocument();
    expect(screen.getByTestId('edit-filter-name-f-1')).toHaveValue('Study Design Filter');
    expect(screen.getByTestId('edit-filter-criterion-f-1')).toHaveValue(
      'Exclude studies that are not randomized controlled trials',
    );
  });

  it('saves edited filter', async () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('edit-filter-f-1'));

    fireEvent.change(screen.getByTestId('edit-filter-name-f-1'), {
      target: { value: 'Updated Filter Name' },
    });
    fireEvent.click(screen.getByTestId('save-filter-edit-f-1'));

    await waitFor(() => {
      expect(mockUpdateFilter).toHaveBeenCalledWith({
        variables: {
          id: 'f-1',
          name: 'Updated Filter Name',
          criterion: 'Exclude studies that are not randomized controlled trials',
        },
      });
    });
  });

  it('cancels edit form', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('edit-filter-f-1'));
    expect(screen.getByTestId('edit-filter-form-f-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-filter-edit-f-1'));
    expect(screen.queryByTestId('edit-filter-form-f-1')).not.toBeInTheDocument();
  });

  it('shows delete confirmation', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('delete-filter-f-1'));
    expect(screen.getByTestId('confirm-delete-f-1')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-delete-f-1')).toBeInTheDocument();
  });

  it('deletes a filter after confirmation', async () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('delete-filter-f-1'));
    fireEvent.click(screen.getByTestId('confirm-delete-f-1'));

    await waitFor(() => {
      expect(mockDeleteFilter).toHaveBeenCalledWith({
        variables: { id: 'f-1' },
      });
    });
  });

  it('cancels delete confirmation', () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('delete-filter-f-1'));
    expect(screen.getByTestId('confirm-delete-f-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-delete-f-1'));
    expect(screen.queryByTestId('confirm-delete-f-1')).not.toBeInTheDocument();
  });

  it('launches scoring for a filter', async () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('launch-scoring-f-1'));

    await waitFor(() => {
      expect(mockLaunchScoring).toHaveBeenCalledWith({
        variables: { sessionId: 'sess-1', filterId: 'f-1' },
      });
    });
  });

  it('shows scoring task notification after launch', async () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('launch-scoring-f-1'));

    await waitFor(() => {
      expect(screen.getByTestId('scoring-task-launched')).toBeInTheDocument();
    });
    expect(screen.getByText(/task-123/)).toBeInTheDocument();
  });

  it('dismisses scoring task notification', async () => {
    render(<CustomAiFilterEditor sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('launch-scoring-f-1'));

    await waitFor(() => {
      expect(screen.getByTestId('scoring-task-launched')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dismiss-scoring-task'));
    expect(screen.queryByTestId('scoring-task-launched')).not.toBeInTheDocument();
  });

  it('passes sessionId to useQuery', () => {
    render(<CustomAiFilterEditor sessionId="sess-42" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { sessionId: 'sess-42' } }),
    );
  });
});
