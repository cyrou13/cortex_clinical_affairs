import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { NotFoundError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

export class TaskService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Creates an AsyncTask DB record with PENDING status and publishes to Redis.
   */
  async enqueueTask(
    type: string,
    data: Record<string, unknown> | undefined,
    userId: string,
  ) {
    const task = await this.prisma.asyncTask.create({
      data: {
        type,
        status: 'PENDING',
        progress: 0,
        metadata: (data ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    try {
      await this.redis.publish(
        'task:enqueued',
        JSON.stringify({
          taskId: task.id,
          type: task.type,
          status: task.status,
          metadata: task.metadata,
          createdBy: task.createdBy,
        }),
      );
    } catch (err) {
      logger.error({ err, taskId: task.id }, 'Failed to publish task:enqueued event');
    }

    return task;
  }

  /**
   * Cancels a task by setting its status to CANCELLED.
   */
  async cancelTask(taskId: string, userId: string) {
    const task = await this.prisma.asyncTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('AsyncTask', taskId);
    }

    if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
      throw new Error(`Cannot cancel task with status ${task.status}`);
    }

    const updated = await this.prisma.asyncTask.update({
      where: { id: taskId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    try {
      const event = {
        taskId: updated.id,
        type: updated.type,
        status: 'CANCELLED' as const,
        progress: updated.progress,
        message: 'Task cancelled',
      };
      await this.redis.publish(
        `task:progress:${task.createdBy}`,
        JSON.stringify(event),
      );
    } catch (err) {
      logger.error({ err, taskId }, 'Failed to publish task cancellation event');
    }

    return updated;
  }

  /**
   * Returns a single task by ID.
   */
  async getTaskStatus(taskId: string) {
    const task = await this.prisma.asyncTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('AsyncTask', taskId);
    }

    return task;
  }

  /**
   * Returns PENDING and RUNNING tasks for a user.
   */
  async getActiveTasks(userId: string) {
    return this.prisma.asyncTask.findMany({
      where: {
        createdBy: userId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns COMPLETED, FAILED, and CANCELLED tasks for a user.
   */
  async getTaskHistory(userId: string, limit = 20) {
    return this.prisma.asyncTask.findMany({
      where: {
        createdBy: userId,
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Updates task progress and publishes a progress event to Redis.
   */
  async updateTaskProgress(
    taskId: string,
    progress: number,
    total: number | undefined,
    current: number | undefined,
    message: string | undefined,
  ) {
    const task = await this.prisma.asyncTask.update({
      where: { id: taskId },
      data: {
        progress,
        total: total ?? undefined,
        status: 'RUNNING',
        ...(progress === 0 ? { startedAt: new Date() } : {}),
      },
    });

    try {
      const event = {
        taskId: task.id,
        type: task.type,
        status: 'RUNNING' as const,
        progress,
        total,
        current,
        message,
      };
      await this.redis.publish(
        `task:progress:${task.createdBy}`,
        JSON.stringify(event),
      );
    } catch (err) {
      logger.error({ err, taskId }, 'Failed to publish task progress event');
    }

    return task;
  }
}
