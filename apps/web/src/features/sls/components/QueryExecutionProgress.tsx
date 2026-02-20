import { useMutation } from '@apollo/client/react';
import { Loader2, XCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useTaskPanelStore } from '../../../stores/task-panel-store';
import { CANCEL_EXECUTION } from '../graphql/mutations';

type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

interface DatabaseExecution {
  database: string;
  status: ExecutionStatus;
  articlesFound: number | null;
}

const statusConfig: Record<ExecutionStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-600',
  },
  RUNNING: {
    label: 'Running',
    className: 'bg-amber-100 text-amber-700',
  },
  SUCCESS: {
    label: 'Success',
    className: 'bg-emerald-100 text-emerald-700',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600',
  },
};

const databaseLabels: Record<string, string> = {
  PUBMED: 'PubMed',
  PMC: 'PubMed Central',
  GOOGLE_SCHOLAR: 'Google Scholar',
  CLINICAL_TRIALS: 'ClinicalTrials.gov',
};

interface QueryExecutionProgressProps {
  executionId: string;
  onComplete: () => void;
}

export function QueryExecutionProgress({ executionId, onComplete }: QueryExecutionProgressProps) {
  const tasks = useTaskPanelStore((s) => s.tasks);
  const history = useTaskPanelStore((s) => s.history);

  const [cancelExecution, { loading: cancelling }] = useMutation(CANCEL_EXECUTION);

  // Find the task in active tasks or history
  const activeTask = tasks.find((t) => t.taskId === executionId);
  const completedTask = history.find((t) => t.taskId === executionId);
  const task = activeTask ?? completedTask;

  // Parse database statuses from task message if available
  const databaseExecutions = parseDatabaseStatuses(task?.message);
  const isActive =
    !!activeTask && (activeTask.status === 'RUNNING' || activeTask.status === 'PENDING');

  // Call onComplete when the task finishes
  if (completedTask && !activeTask) {
    // Defer to avoid calling during render
    queueMicrotask(onComplete);
  }

  async function handleCancel() {
    try {
      await cancelExecution({
        variables: { executionId },
      });
    } catch {
      // Error handled by Apollo Client error link
    }
  }

  if (!task) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm" data-testid="execution-progress">
        <div className="flex items-center gap-2 text-sm text-[var(--cortex-text-muted)]">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Waiting for execution to start...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm" data-testid="execution-progress">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--cortex-text-primary)]">Query Execution</h3>
        {isActive && (
          <button
            type="button"
            data-testid="cancel-execution-button"
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50',
              cancelling && 'cursor-not-allowed opacity-50',
            )}
            disabled={cancelling}
            onClick={handleCancel}
          >
            <XCircle size={14} aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>

      {/* Overall progress bar */}
      {isActive && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--cortex-text-muted)]">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[var(--cortex-blue-500)] transition-all"
              style={{ width: `${task.progress}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>
      )}

      {/* Per-database status */}
      <div className="space-y-2" data-testid="database-statuses">
        {databaseExecutions.length > 0 ? (
          databaseExecutions.map((dbExec) => {
            const config = statusConfig[dbExec.status] ?? statusConfig.PENDING;
            const dbLabel = databaseLabels[dbExec.database] ?? dbExec.database;

            return (
              <div
                key={dbExec.database}
                className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                data-testid={`db-status-${dbExec.database}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    role="status"
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      config.className,
                    )}
                  >
                    {config.label}
                  </span>
                  <span className="text-sm text-[var(--cortex-text-primary)]">{dbLabel}</span>
                </div>
                {dbExec.articlesFound !== null && (
                  <span
                    className="text-xs text-[var(--cortex-text-muted)]"
                    data-testid={`db-articles-${dbExec.database}`}
                  >
                    {dbExec.articlesFound.toLocaleString()} articles found
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--cortex-text-muted)]">
            {isActive && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {isActive ? 'Executing query...' : task.message || 'Execution complete'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Parses database statuses from the task message.
 * Expected format: "PUBMED:RUNNING:3200,PMC:SUCCESS:1500,GOOGLE_SCHOLAR:PENDING:"
 */
function parseDatabaseStatuses(message?: string): DatabaseExecution[] {
  if (!message) return [];

  try {
    const parts = message.split(',').filter(Boolean);
    return parts
      .map((part) => {
        const [database, status, countStr] = part.split(':');
        if (!database || !status) return null;
        return {
          database,
          status: status as ExecutionStatus,
          articlesFound: countStr ? parseInt(countStr, 10) : null,
        };
      })
      .filter((item): item is DatabaseExecution => item !== null);
  } catch {
    return [];
  }
}
