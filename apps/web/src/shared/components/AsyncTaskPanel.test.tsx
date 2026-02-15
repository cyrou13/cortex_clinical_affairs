import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

const mockStore = {
  isOpen: false,
  tasks: [] as import('../../stores/task-panel-store').TaskProgressEvent[],
  history: [] as import('../../stores/task-panel-store').TaskProgressEvent[],
  open: vi.fn(),
  close: vi.fn(),
  toggle: vi.fn(),
  onTaskProgress: vi.fn(),
  onTaskCompleted: vi.fn(),
  onTaskFailed: vi.fn(),
  clearHistory: vi.fn(),
  activeCount: vi.fn(() => 0),
};

vi.mock('../../stores/task-panel-store', () => ({
  useTaskPanelStore: (selector?: (state: typeof mockStore) => unknown) =>
    selector ? selector(mockStore) : mockStore,
}));

vi.mock('../../features/async-tasks/task-display', () => ({
  getTaskDisplay: (type: string) => {
    const map: Record<string, { icon: () => null; name: string }> = {
      'sls:score-articles': { icon: () => null, name: 'AI Screening' },
    };
    return map[type] ?? { icon: () => null, name: 'Background Task' };
  },
}));

import { AsyncTaskPanel } from './AsyncTaskPanel';

describe('AsyncTaskPanel', () => {
  const cancelMutationFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.isOpen = false;
    mockStore.tasks = [];
    mockStore.history = [];
    mockStore.activeCount.mockReturnValue(0);
    mockUseMutation.mockReturnValue([cancelMutationFn]);
  });

  it('renders toggle button', () => {
    render(<AsyncTaskPanel />);
    const toggleBtn = screen.getByTestId('task-panel-toggle');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent('Tasks');
  });

  it('shows badge count with active tasks', () => {
    mockStore.activeCount.mockReturnValue(3);
    render(<AsyncTaskPanel />);
    const badge = screen.getByTestId('task-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('does not show badge when no active tasks', () => {
    mockStore.activeCount.mockReturnValue(0);
    render(<AsyncTaskPanel />);
    expect(screen.queryByTestId('task-badge')).not.toBeInTheDocument();
  });

  it('opens panel on click', () => {
    render(<AsyncTaskPanel />);
    const toggleBtn = screen.getByTestId('task-panel-toggle');
    fireEvent.click(toggleBtn);
    expect(mockStore.toggle).toHaveBeenCalled();
  });

  it('shows active tasks with progress bars when open', () => {
    mockStore.isOpen = true;
    mockStore.tasks = [
      {
        taskId: 'task-1',
        type: 'sls:score-articles',
        status: 'RUNNING',
        progress: 45,
        total: 100,
        current: 45,
        eta: '2 min',
        message: 'Scoring articles...',
      },
    ];
    mockStore.activeCount.mockReturnValue(1);

    render(<AsyncTaskPanel />);

    expect(screen.getByTestId('task-panel')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    expect(screen.getByText('AI Screening')).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
  });

  it('shows task name and ETA', () => {
    mockStore.isOpen = true;
    mockStore.tasks = [
      {
        taskId: 'task-1',
        type: 'sls:score-articles',
        status: 'RUNNING',
        progress: 60,
        total: 100,
        current: 60,
        eta: '3 min',
        message: '',
      },
    ];

    render(<AsyncTaskPanel />);

    expect(screen.getByText('AI Screening')).toBeInTheDocument();
    expect(screen.getByTestId('task-eta')).toHaveTextContent('ETA: 3 min');
  });

  it('cancel button triggers confirmation and then mutation', () => {
    mockStore.isOpen = true;
    mockStore.tasks = [
      {
        taskId: 'task-1',
        type: 'sls:score-articles',
        status: 'RUNNING',
        progress: 50,
        total: 100,
        current: 50,
        eta: null,
        message: '',
      },
    ];

    render(<AsyncTaskPanel />);

    // Click cancel button on the task
    const cancelBtn = screen.getByLabelText('Cancel AI Screening');
    fireEvent.click(cancelBtn);

    // Confirmation dialog should appear
    expect(
      screen.getByText(/Cancel this task\? Completed items will be preserved\./),
    ).toBeInTheDocument();

    // Confirm cancellation
    const confirmBtn = screen.getByTestId('confirm-cancel-btn');
    fireEvent.click(confirmBtn);

    expect(cancelMutationFn).toHaveBeenCalledWith({
      variables: { taskId: 'task-1' },
    });
  });

  it('shows history section when history exists', () => {
    mockStore.isOpen = true;
    mockStore.history = [
      {
        taskId: 'task-done',
        type: 'sls:score-articles',
        status: 'COMPLETED',
        progress: 100,
        total: 100,
        current: 100,
        eta: null,
        message: 'Done',
      },
    ];

    render(<AsyncTaskPanel />);

    const historyToggle = screen.getByTestId('history-toggle');
    expect(historyToggle).toHaveTextContent('History (1)');

    // Expand history
    fireEvent.click(historyToggle);
    expect(screen.getByTestId('history-section')).toBeInTheDocument();
    expect(screen.getByTestId('history-item-task-done')).toBeInTheDocument();
  });

  it('shows empty state when no tasks and no history', () => {
    mockStore.isOpen = true;
    mockStore.tasks = [];
    mockStore.history = [];

    render(<AsyncTaskPanel />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<AsyncTaskPanel />);

    const panel = screen.getByRole('status');
    expect(panel).toHaveAttribute('aria-live', 'polite');

    const toggleBtn = screen.getByTestId('task-panel-toggle');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('clear history button clears history', () => {
    mockStore.isOpen = true;
    mockStore.history = [
      {
        taskId: 'task-done',
        type: 'sls:score-articles',
        status: 'COMPLETED',
        progress: 100,
        total: 100,
        current: 100,
        eta: null,
        message: '',
      },
    ];

    render(<AsyncTaskPanel />);

    // Expand history first
    fireEvent.click(screen.getByTestId('history-toggle'));

    const clearBtn = screen.getByTestId('clear-history-btn');
    fireEvent.click(clearBtn);

    expect(mockStore.clearHistory).toHaveBeenCalled();
  });
});
