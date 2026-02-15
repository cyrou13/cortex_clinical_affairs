import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

const mockUseTaskPanelStore = vi.fn();

vi.mock('../../../stores/task-panel-store', () => ({
  useTaskPanelStore: (selector: unknown) => mockUseTaskPanelStore(selector),
}));

import { QueryExecutionProgress } from './QueryExecutionProgress';

describe('QueryExecutionProgress', () => {
  const defaultProps = {
    executionId: 'exec-1',
    onComplete: vi.fn(),
  };

  let cancelMutationFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    cancelMutationFn = vi.fn().mockResolvedValue({ data: { cancelExecution: true } });
    mockUseMutation.mockReturnValue([cancelMutationFn, { loading: false }]);
  });

  it('shows waiting state when no task found', () => {
    // First call for tasks, second call for history
    mockUseTaskPanelStore
      .mockReturnValueOnce([]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    expect(screen.getByTestId('execution-progress')).toBeInTheDocument();
    expect(
      screen.getByText('Waiting for execution to start...'),
    ).toBeInTheDocument();
  });

  it('renders progress bar for active task', () => {
    const activeTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'RUNNING',
      progress: 45,
      total: 100,
      current: 45,
      eta: '2 min',
      message: 'pubmed:RUNNING:3200,cochrane:PENDING:',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([activeTask]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    expect(screen.getByTestId('execution-progress')).toBeInTheDocument();
    expect(screen.getByText('Query Execution')).toBeInTheDocument();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows per-database status indicators', () => {
    const activeTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'RUNNING',
      progress: 60,
      total: 100,
      current: 60,
      eta: '1 min',
      message: 'pubmed:SUCCESS:3200,cochrane:RUNNING:,embase:FAILED:',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([activeTask]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    expect(screen.getByTestId('db-status-pubmed')).toBeInTheDocument();
    expect(screen.getByTestId('db-status-cochrane')).toBeInTheDocument();
    expect(screen.getByTestId('db-status-embase')).toBeInTheDocument();

    // Check status labels
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows article count per database', () => {
    const activeTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'RUNNING',
      progress: 50,
      total: 100,
      current: 50,
      eta: '1 min',
      message: 'pubmed:SUCCESS:3200',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([activeTask]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    expect(screen.getByTestId('db-articles-pubmed')).toHaveTextContent(
      '3,200 articles found',
    );
  });

  it('renders cancel button for active execution', () => {
    const activeTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'RUNNING',
      progress: 30,
      total: 100,
      current: 30,
      eta: '3 min',
      message: 'pubmed:RUNNING:',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([activeTask]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    const cancelButton = screen.getByTestId('cancel-execution-button');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('calls cancel mutation when cancel is clicked', () => {
    const activeTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'RUNNING',
      progress: 30,
      total: 100,
      current: 30,
      eta: '3 min',
      message: 'pubmed:RUNNING:',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([activeTask]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel-execution-button'));

    expect(cancelMutationFn).toHaveBeenCalledWith({
      variables: { executionId: 'exec-1' },
    });
  });

  it('does not show cancel button for completed task', () => {
    const completedTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'COMPLETED',
      progress: 100,
      total: 100,
      current: 100,
      eta: null,
      message: 'pubmed:SUCCESS:3200',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([]) // tasks (not active)
      .mockReturnValueOnce([completedTask]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    expect(
      screen.queryByTestId('cancel-execution-button'),
    ).not.toBeInTheDocument();
  });

  it('shows database labels correctly', () => {
    const activeTask = {
      taskId: 'exec-1',
      type: 'sls:execute-query',
      status: 'RUNNING',
      progress: 50,
      total: 100,
      current: 50,
      eta: '1 min',
      message: 'pubmed:RUNNING:,cochrane:PENDING:,embase:RUNNING:',
    };

    mockUseTaskPanelStore
      .mockReturnValueOnce([activeTask]) // tasks
      .mockReturnValueOnce([]); // history

    render(<QueryExecutionProgress {...defaultProps} />);

    expect(screen.getByText('PubMed')).toBeInTheDocument();
    expect(screen.getByText('Cochrane')).toBeInTheDocument();
    expect(screen.getByText('Embase')).toBeInTheDocument();
  });
});
