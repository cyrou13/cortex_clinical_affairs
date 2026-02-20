import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { TaskService } from './task-service.js';

const mockTask = {
  id: 'task-001',
  type: 'sls.score-articles',
  status: 'PENDING',
  progress: 0,
  total: null,
  result: null,
  error: null,
  metadata: { projectId: 'proj-1' },
  createdBy: 'user-123',
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  asyncTask: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

const mockRedis = {
  publish: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaskService(mockPrisma, mockRedis);
  });

  describe('enqueueTask', () => {
    it('creates a task with PENDING status', async () => {
      (mockPrisma.asyncTask.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);

      const result = await service.enqueueTask(
        'sls.score-articles',
        { projectId: 'proj-1' },
        'user-123',
      );

      expect(result).toEqual(mockTask);
      expect(mockPrisma.asyncTask.create).toHaveBeenCalledWith({
        data: {
          type: 'sls.score-articles',
          status: 'PENDING',
          progress: 0,
          metadata: { projectId: 'proj-1' },
          createdBy: 'user-123',
        },
      });
    });

    it('publishes task:enqueued event to Redis', async () => {
      (mockPrisma.asyncTask.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);

      await service.enqueueTask('sls.score-articles', { projectId: 'proj-1' }, 'user-123');

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'task:enqueued',
        expect.stringContaining('task-001'),
      );
    });

    it('creates task even if Redis publish fails', async () => {
      (mockPrisma.asyncTask.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
      (mockRedis.publish as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Redis down'),
      );

      const result = await service.enqueueTask('sls.score-articles', undefined, 'user-123');

      expect(result).toEqual(mockTask);
    });

    it('defaults metadata to empty object when undefined', async () => {
      (mockPrisma.asyncTask.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);

      await service.enqueueTask('sls.score-articles', undefined, 'user-123');

      expect(mockPrisma.asyncTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {},
        }),
      });
    });
  });

  describe('cancelTask', () => {
    it('cancels a PENDING task', async () => {
      const cancelledTask = { ...mockTask, status: 'CANCELLED', completedAt: new Date() };
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
      (mockPrisma.asyncTask.update as ReturnType<typeof vi.fn>).mockResolvedValue(cancelledTask);

      const result = await service.cancelTask('task-001', 'user-123');

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.asyncTask.update).toHaveBeenCalledWith({
        where: { id: 'task-001' },
        data: { status: 'CANCELLED', completedAt: expect.any(Date) },
      });
    });

    it('publishes cancellation event to Redis', async () => {
      const cancelledTask = { ...mockTask, status: 'CANCELLED', completedAt: new Date() };
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
      (mockPrisma.asyncTask.update as ReturnType<typeof vi.fn>).mockResolvedValue(cancelledTask);

      await service.cancelTask('task-001', 'user-123');

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'task:progress:user-123',
        expect.stringContaining('CANCELLED'),
      );
    });

    it('throws NotFoundError for non-existent task', async () => {
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.cancelTask('nonexistent', 'user-123')).rejects.toThrow('not found');
    });

    it('throws error for already completed task', async () => {
      const completedTask = { ...mockTask, status: 'COMPLETED' };
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        completedTask,
      );

      await expect(service.cancelTask('task-001', 'user-123')).rejects.toThrow(
        'Cannot cancel task with status COMPLETED',
      );
    });

    it('throws error for already failed task', async () => {
      const failedTask = { ...mockTask, status: 'FAILED' };
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(failedTask);

      await expect(service.cancelTask('task-001', 'user-123')).rejects.toThrow(
        'Cannot cancel task with status FAILED',
      );
    });

    it('throws error for already cancelled task', async () => {
      const cancelledTask = { ...mockTask, status: 'CANCELLED' };
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        cancelledTask,
      );

      await expect(service.cancelTask('task-001', 'user-123')).rejects.toThrow(
        'Cannot cancel task with status CANCELLED',
      );
    });
  });

  describe('getTaskStatus', () => {
    it('returns task by ID', async () => {
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);

      const result = await service.getTaskStatus('task-001');

      expect(result).toEqual(mockTask);
      expect(mockPrisma.asyncTask.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-001' },
      });
    });

    it('throws NotFoundError for non-existent task', async () => {
      (mockPrisma.asyncTask.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getTaskStatus('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('getActiveTasks', () => {
    it('returns PENDING and RUNNING tasks for user', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task-002', status: 'RUNNING' }];
      (mockPrisma.asyncTask.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(tasks);

      const result = await service.getActiveTasks('user-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.asyncTask.findMany).toHaveBeenCalledWith({
        where: {
          createdBy: 'user-123',
          status: { in: ['PENDING', 'RUNNING'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when no active tasks', async () => {
      (mockPrisma.asyncTask.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getActiveTasks('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getTaskHistory', () => {
    it('returns completed/failed/cancelled tasks with default limit', async () => {
      const tasks = [{ ...mockTask, status: 'COMPLETED' }];
      (mockPrisma.asyncTask.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(tasks);

      const result = await service.getTaskHistory('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrisma.asyncTask.findMany).toHaveBeenCalledWith({
        where: {
          createdBy: 'user-123',
          status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('respects custom limit', async () => {
      (mockPrisma.asyncTask.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.getTaskHistory('user-123', 5);

      expect(mockPrisma.asyncTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('updateTaskProgress', () => {
    it('updates task progress and publishes event', async () => {
      const updatedTask = { ...mockTask, status: 'RUNNING', progress: 50 };
      (mockPrisma.asyncTask.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedTask);

      const result = await service.updateTaskProgress('task-001', 50, 100, 50, 'Halfway done');

      expect(result.progress).toBe(50);
      expect(mockPrisma.asyncTask.update).toHaveBeenCalledWith({
        where: { id: 'task-001' },
        data: {
          progress: 50,
          total: 100,
          status: 'RUNNING',
        },
      });
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'task:progress:user-123',
        expect.stringContaining('"progress":50'),
      );
    });

    it('sets startedAt when progress is 0', async () => {
      const updatedTask = { ...mockTask, status: 'RUNNING', progress: 0 };
      (mockPrisma.asyncTask.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedTask);

      await service.updateTaskProgress('task-001', 0, undefined, undefined, 'Starting...');

      expect(mockPrisma.asyncTask.update).toHaveBeenCalledWith({
        where: { id: 'task-001' },
        data: expect.objectContaining({
          startedAt: expect.any(Date),
        }),
      });
    });

    it('handles Redis publish failure gracefully', async () => {
      const updatedTask = { ...mockTask, status: 'RUNNING', progress: 75 };
      (mockPrisma.asyncTask.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedTask);
      (mockRedis.publish as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Redis down'),
      );

      const result = await service.updateTaskProgress('task-001', 75, 100, 75, 'Almost done');

      expect(result).toEqual(updatedTask);
    });
  });
});
