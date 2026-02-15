import { gql } from '@apollo/client';
import { useSubscription } from '@apollo/client/react';
import { useTaskPanelStore } from '../../stores/task-panel-store';
import { useToastStore } from '../../stores/toast-store';
import { getTaskDisplay } from '../../features/async-tasks/task-display';
import type { TaskProgressEvent } from '../../stores/task-panel-store';

const ON_TASK_PROGRESS = gql`
  subscription OnTaskProgress($userId: String!) {
    onTaskProgress(userId: $userId) {
      taskId
      type
      status
      progress
      total
      current
      eta
      message
    }
  }
`;

interface SubscriptionData {
  onTaskProgress: TaskProgressEvent;
}

export function useTaskSubscription(userId: string) {
  const { onTaskProgress, onTaskCompleted, onTaskFailed } =
    useTaskPanelStore.getState();
  const addToast = useToastStore.getState().addToast;

  const { loading, error } = useSubscription<SubscriptionData>(
    ON_TASK_PROGRESS,
    {
      variables: { userId },
      skip: !userId,
      onData: ({ data: result }) => {
        const event = result.data?.onTaskProgress;
        if (!event) return;

        const display = getTaskDisplay(event.type);

        switch (event.status) {
          case 'COMPLETED':
            onTaskCompleted(event);
            addToast({
              type: 'success',
              message: `${display.name} complete. ${event.message || ''}`.trim(),
            });
            break;

          case 'FAILED':
            onTaskFailed(event);
            addToast({
              type: 'error',
              message: `${display.name} failed. ${event.message || ''}`.trim(),
            });
            break;

          case 'CANCELLED':
            onTaskFailed(event);
            break;

          default:
            onTaskProgress(event);
            break;
        }
      },
    },
  );

  return {
    connected: !loading && !error,
    loading,
    error,
  };
}
