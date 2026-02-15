import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ListTodo,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  AlertTriangle,
  Ban,
  Loader2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  useTaskPanelStore,
  type TaskProgressEvent,
} from '../../stores/task-panel-store';
import { getTaskDisplay } from '../../features/async-tasks/task-display';

const CANCEL_TASK = gql`
  mutation CancelTask($taskId: String!) {
    cancelTask(taskId: $taskId)
  }
`;

function TaskItem({
  task,
  onCancel,
}: {
  task: TaskProgressEvent;
  onCancel: (taskId: string) => void;
}) {
  const display = getTaskDisplay(task.type);
  const Icon = display.icon;

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-[var(--cortex-blue-100)] bg-white px-3 py-2"
      data-testid={`task-item-${task.taskId}`}
    >
      <Icon
        size={16}
        className="shrink-0 text-[var(--cortex-blue-500)]"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--cortex-text-primary)]">
            {display.name}
          </span>
          {task.eta && (
            <span
              className="ml-2 text-xs text-[var(--cortex-text-muted)]"
              data-testid="task-eta"
            >
              ETA: {task.eta}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--cortex-blue-100)]"
            role="progressbar"
            aria-valuenow={task.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${display.name} progress`}
          >
            <div
              className="h-full rounded-full bg-[var(--cortex-blue-500)] transition-all duration-300 ease-out"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-[var(--cortex-text-muted)]">
            {task.progress}%
          </span>
        </div>
        {task.message && (
          <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)]">
            {task.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onCancel(task.taskId)}
        className="shrink-0 rounded p-1 text-[var(--cortex-text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
        aria-label={`Cancel ${display.name}`}
        title="Cancel task"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function HistoryItem({ task }: { task: TaskProgressEvent }) {
  const display = getTaskDisplay(task.type);
  const statusIcons: Record<string, typeof Check> = {
    COMPLETED: Check,
    FAILED: AlertTriangle,
    CANCELLED: Ban,
  };
  const StatusIcon = statusIcons[task.status] ?? Check;
  const statusColors: Record<string, string> = {
    COMPLETED: 'text-emerald-500',
    FAILED: 'text-red-500',
    CANCELLED: 'text-amber-500',
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      data-testid={`history-item-${task.taskId}`}
    >
      <StatusIcon
        size={14}
        className={cn('shrink-0', statusColors[task.status])}
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-xs text-[var(--cortex-text-secondary)]">
        {display.name}
      </span>
      <span className="shrink-0 text-xs capitalize text-[var(--cortex-text-muted)]">
        {task.status.toLowerCase()}
      </span>
    </div>
  );
}

export function AsyncTaskPanel() {
  const {
    isOpen,
    tasks,
    history,
    toggle,
    clearHistory,
    activeCount,
  } = useTaskPanelStore();

  const [showHistory, setShowHistory] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const [cancelTask] = useMutation(CANCEL_TASK);

  const count = activeCount();

  const handleCancel = (taskId: string) => {
    setConfirmCancelId(taskId);
  };

  const confirmCancel = () => {
    if (confirmCancelId) {
      cancelTask({ variables: { taskId: confirmCancelId } });
      setConfirmCancelId(null);
    }
  };

  const dismissCancel = () => {
    setConfirmCancelId(null);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      role="status"
      aria-live="polite"
    >
      {/* Confirmation dialog */}
      {confirmCancelId && (
        <div
          className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-lg"
          role="alertdialog"
          aria-label="Cancel task confirmation"
        >
          <p className="text-sm text-amber-800">
            Cancel this task? Completed items will be preserved.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={dismissCancel}
              className="rounded px-2 py-1 text-xs text-[var(--cortex-text-secondary)] hover:bg-amber-100"
            >
              Keep running
            </button>
            <button
              type="button"
              onClick={confirmCancel}
              className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
              data-testid="confirm-cancel-btn"
            >
              Cancel task
            </button>
          </div>
        </div>
      )}

      {/* Panel content */}
      {isOpen && (
        <div
          className="mb-2 w-80 overflow-hidden rounded-lg border border-[var(--cortex-blue-200)] bg-[var(--cortex-blue-50)] shadow-lg"
          data-testid="task-panel"
        >
          <div className="border-b border-[var(--cortex-blue-200)] bg-white px-3 py-2">
            <h2 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              Background Tasks
            </h2>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto p-3">
            {tasks.length === 0 && history.length === 0 && (
              <div className="py-6 text-center" data-testid="empty-state">
                <Loader2
                  size={24}
                  className="mx-auto mb-2 text-[var(--cortex-text-muted)]"
                  aria-hidden="true"
                />
                <p className="text-sm text-[var(--cortex-text-muted)]">
                  No active tasks
                </p>
              </div>
            )}

            {tasks.map((task) => (
              <TaskItem
                key={task.taskId}
                task={task}
                onCancel={handleCancel}
              />
            ))}
          </div>

          {/* History section */}
          {history.length > 0 && (
            <div className="border-t border-[var(--cortex-blue-200)]">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-blue-100)]"
                data-testid="history-toggle"
              >
                <span>History ({history.length})</span>
                {showHistory ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              {showHistory && (
                <div data-testid="history-section">
                  <div className="max-h-32 overflow-y-auto">
                    {history.map((task) => (
                      <HistoryItem key={task.taskId} task={task} />
                    ))}
                  </div>
                  <div className="border-t border-[var(--cortex-blue-200)] p-2">
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="flex items-center gap-1 text-xs text-[var(--cortex-text-muted)] hover:text-red-500"
                      data-testid="clear-history-btn"
                    >
                      <Trash2 size={12} />
                      Clear history
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 shadow-lg transition-all',
          'bg-[var(--cortex-blue-600)] text-white hover:bg-[var(--cortex-blue-700)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cortex-blue-400)]',
        )}
        aria-label={isOpen ? 'Close task panel' : 'Open task panel'}
        aria-expanded={isOpen}
        data-testid="task-panel-toggle"
      >
        <ListTodo size={18} aria-hidden="true" />
        <span className="text-sm font-medium">Tasks</span>
        {count > 0 && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-[var(--cortex-blue-600)]"
            data-testid="task-badge"
          >
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
