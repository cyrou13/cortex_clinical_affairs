import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { CreateCustomAiFilterInput, UpdateCustomAiFilterInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { TaskService } from '../../../../shared/services/task-service.js';

export class ConfigureCustomFilterUseCase {
  private readonly taskService: TaskService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {
    this.taskService = new TaskService(prisma, redis);
  }

  async createCustomFilter(sessionId: string, input: unknown, userId: string) {
    const parsed = CreateCustomAiFilterInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { name, criterion } = parsed.data;

    // Validate session exists
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    const created = await (this.prisma as any).customAiFilter.create({
      data: {
        sessionId,
        name,
        criterion,
      },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.customAiFilter.created',
        targetType: 'customAiFilter',
        targetId: created.id,
        after: { name, criterion, sessionId } as unknown as Prisma.InputJsonValue,
      },
    });

    return created;
  }

  async updateCustomFilter(filterId: string, input: unknown, userId: string) {
    const parsed = UpdateCustomAiFilterInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const existing = await (this.prisma as any).customAiFilter.findUnique({
      where: { id: filterId },
    });

    if (!existing) {
      throw new NotFoundError('CustomAiFilter', filterId);
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.criterion !== undefined) updateData.criterion = parsed.data.criterion;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const updated = await (this.prisma as any).customAiFilter.update({
      where: { id: filterId },
      data: updateData,
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.customAiFilter.updated',
        targetType: 'customAiFilter',
        targetId: filterId,
        before: { name: existing.name, criterion: existing.criterion, isActive: existing.isActive } as unknown as Prisma.InputJsonValue,
        after: updateData as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async deleteCustomFilter(filterId: string, userId: string) {
    const existing = await (this.prisma as any).customAiFilter.findUnique({
      where: { id: filterId },
    });

    if (!existing) {
      throw new NotFoundError('CustomAiFilter', filterId);
    }

    await (this.prisma as any).customAiFilter.delete({
      where: { id: filterId },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.customAiFilter.deleted',
        targetType: 'customAiFilter',
        targetId: filterId,
        before: { name: existing.name, criterion: existing.criterion, sessionId: existing.sessionId } as unknown as Prisma.InputJsonValue,
      },
    });

    return existing;
  }

  async launchCustomFilterScoring(sessionId: string, filterId: string, userId: string) {
    // Validate session exists
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Validate filter exists and belongs to session
    const filter = await (this.prisma as any).customAiFilter.findUnique({
      where: { id: filterId },
    });

    if (!filter) {
      throw new NotFoundError('CustomAiFilter', filterId);
    }

    if (filter.sessionId !== sessionId) {
      throw new ValidationError('Filter does not belong to the specified session');
    }

    // Enqueue BullMQ job via TaskService
    const task = await this.taskService.enqueueTask(
      'sls:custom-filter-score',
      {
        sessionId,
        filterId,
        criterion: filter.criterion,
        filterName: filter.name,
      },
      userId,
    );

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.customAiFilter.scoringLaunched',
        targetType: 'customAiFilter',
        targetId: filterId,
        after: { taskId: task.id, sessionId, filterId } as unknown as Prisma.InputJsonValue,
      },
    });

    return { taskId: task.id };
  }
}
