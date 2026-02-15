export const AsyncTaskStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type AsyncTaskStatus = (typeof AsyncTaskStatus)[keyof typeof AsyncTaskStatus];

export interface AsyncTaskInfo {
  id: string;
  type: string;
  status: AsyncTaskStatus;
  progress: number;
  total: number | null;
  error: string | null;
  createdBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
