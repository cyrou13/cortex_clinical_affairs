import { z } from 'zod';

export const TaskStatus = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskProgressEvent = z.object({
  taskId: z.string().uuid(),
  type: z.string(),
  status: TaskStatus,
  progress: z.number().min(0).max(100),
  total: z.number().nonnegative().optional(),
  current: z.number().nonnegative().optional(),
  eta: z.number().nonnegative().optional(),
  message: z.string().optional(),
});
export type TaskProgressEvent = z.infer<typeof TaskProgressEvent>;

export const EnqueueTaskInput = z.object({
  type: z.string().min(1, 'Task type is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().uuid('Valid user ID is required'),
});
export type EnqueueTaskInput = z.infer<typeof EnqueueTaskInput>;
