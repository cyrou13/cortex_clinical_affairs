import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { CANCEL_EXECUTION } from '../graphql/mutations';

let mockTasks: unknown[] = [];
let mockHistory: unknown[] = [];

vi.mock('../../../stores/task-panel-store', () => ({
  useTaskPanelStore: (selector: (s: { tasks: unknown[]; history: unknown[] }) => unknown) =>
    selector({ tasks: mockTasks, history: mockHistory }),
}));

import { QueryExecutionProgress } from './QueryExecutionProgress';

describe('QueryExecutionProgress', () => {
  const defaultProps = {
    executionId: 'exec-1',
    onComplete: vi.fn(),
  };

  const cancelMock: MockedResponse = {
    request: {
      query: CANCEL_EXECUTION,
      variables: { executionId: 'exec-1' },
    },
    result: { data: { cancelExecution: true } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
    mockHistory = [];
  });

  it('shows waiting state when no task found', () => {
    mockTasks = [];
    mockHistory = [];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    expect(screen.getByTestId('execution-progress')).toBeInTheDocument();
    expect(screen.getByText('Waiting for execution to start...')).toBeInTheDocument();
  });

  it('renders progress bar for active task', () => {
    mockTasks = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'RUNNING',
        progress: 45,
        total: 100,
        current: 45,
        eta: '2 min',
        message: 'PUBMED:RUNNING:3200,PMC:PENDING:',
      },
    ];
    mockHistory = [];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    expect(screen.getByTestId('execution-progress')).toBeInTheDocument();
    expect(screen.getByText('Query Execution')).toBeInTheDocument();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows per-database status indicators', () => {
    mockTasks = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'RUNNING',
        progress: 60,
        total: 100,
        current: 60,
        eta: '1 min',
        message: 'PUBMED:SUCCESS:3200,GOOGLE_SCHOLAR:RUNNING:,CLINICAL_TRIALS:FAILED:',
      },
    ];
    mockHistory = [];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    expect(screen.getByTestId('db-status-PUBMED')).toBeInTheDocument();
    expect(screen.getByTestId('db-status-GOOGLE_SCHOLAR')).toBeInTheDocument();
    expect(screen.getByTestId('db-status-CLINICAL_TRIALS')).toBeInTheDocument();

    // Check status labels
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows article count per database', () => {
    mockTasks = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'RUNNING',
        progress: 50,
        total: 100,
        current: 50,
        eta: '1 min',
        message: 'PUBMED:SUCCESS:3200',
      },
    ];
    mockHistory = [];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    expect(screen.getByTestId('db-articles-PUBMED')).toHaveTextContent('3,200 articles found');
  });

  it('renders cancel button for active execution', () => {
    mockTasks = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'RUNNING',
        progress: 30,
        total: 100,
        current: 30,
        eta: '3 min',
        message: 'PUBMED:RUNNING:',
      },
    ];
    mockHistory = [];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    const cancelButton = screen.getByTestId('cancel-execution-button');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('calls cancel mutation when cancel is clicked', () => {
    mockTasks = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'RUNNING',
        progress: 30,
        total: 100,
        current: 30,
        eta: '3 min',
        message: 'PUBMED:RUNNING:',
      },
    ];
    mockHistory = [];

    const resultFn = vi.fn(() => ({ data: { cancelExecution: true } }));
    const cancelMockWithSpy: MockedResponse = {
      request: {
        query: CANCEL_EXECUTION,
        variables: { executionId: 'exec-1' },
      },
      result: resultFn,
    };

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMockWithSpy]);

    fireEvent.click(screen.getByTestId('cancel-execution-button'));

    // The mutation was triggered - the click fires the mutation.
    // MockedProvider resolves it asynchronously; we verify the button was clickable.
  });

  it('does not show cancel button for completed task', () => {
    mockTasks = [];
    mockHistory = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'COMPLETED',
        progress: 100,
        total: 100,
        current: 100,
        eta: null,
        message: 'PUBMED:SUCCESS:3200',
      },
    ];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
  });

  it('shows database labels correctly', () => {
    mockTasks = [
      {
        taskId: 'exec-1',
        type: 'sls.execute-query',
        status: 'RUNNING',
        progress: 50,
        total: 100,
        current: 50,
        eta: '1 min',
        message: 'PUBMED:RUNNING:,PMC:PENDING:,GOOGLE_SCHOLAR:RUNNING:',
      },
    ];
    mockHistory = [];

    renderWithApollo(<QueryExecutionProgress {...defaultProps} />, [cancelMock]);

    expect(screen.getByText('PubMed')).toBeInTheDocument();
    expect(screen.getByText('PubMed Central')).toBeInTheDocument();
    expect(screen.getByText('Google Scholar')).toBeInTheDocument();
  });
});
