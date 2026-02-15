import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { TaskProgressEvent } from '@cortex/shared';

export interface TaskJobData {
  taskId: string;
  type: string;
  metadata: Record<string, unknown>;
  createdBy: string;
}

export abstract class BaseProcessor {
  constructor(protected readonly redis: Redis) {}

  /**
   * Subclasses implement this to perform the actual work.
   */
  abstract process(job: Job<TaskJobData>): Promise<unknown>;

  /**
   * Reports progress to Redis pub/sub so the API can forward to subscribers.
   */
  async reportProgress(
    job: Job<TaskJobData>,
    progress: number,
    options?: {
      total?: number;
      current?: number;
      eta?: number;
      message?: string;
    },
  ): Promise<void> {
    const { taskId, type, createdBy } = job.data;

    await job.updateProgress(progress);

    const event: TaskProgressEvent = {
      taskId,
      type,
      status: 'RUNNING',
      progress,
      total: options?.total,
      current: options?.current,
      eta: options?.eta,
      message: options?.message,
    };

    await this.redis.publish(
      `task:progress:${createdBy}`,
      JSON.stringify(event),
    );
  }

  /**
   * Checks if the task has been cancelled by looking at a Redis key.
   * Workers should call this periodically during long-running tasks.
   */
  async checkCancellation(job: Job<TaskJobData>): Promise<boolean> {
    const cancelled = await this.redis.get(`task:cancelled:${job.data.taskId}`);
    return cancelled === '1';
  }
}
