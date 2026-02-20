import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { ExecuteQueryInput, generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { TaskService } from '../../../../shared/services/task-service.js';

export class ExecuteQueryUseCase {
  private readonly taskService: TaskService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {
    this.taskService = new TaskService(prisma, redis);
  }

  async execute(input: unknown, userId: string) {
    const parsed = ExecuteQueryInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { queryId, databases, sessionId } = parsed.data;

    // Validate query exists
    const query = await this.prisma.slsQuery.findUnique({
      where: { id: queryId },
      include: { session: true },
    });

    if (!query) {
      throw new NotFoundError('SlsQuery', queryId);
    }

    // Validate session matches
    if (query.sessionId !== sessionId) {
      throw new ValidationError('Query does not belong to the specified session');
    }

    // Validate session is not LOCKED
    const session = query.session;
    if (session?.status === 'LOCKED') {
      throw new ValidationError('Cannot execute query: session is locked');
    }

    // Create QueryExecution records for each database
    const executionIds: string[] = [];
    const now = new Date();

    for (const database of databases) {
      const executionId = generateId();
      await this.prisma.queryExecution.create({
        data: {
          id: executionId,
          queryId,
          database,
          status: 'RUNNING',
          articlesFound: 0,
          articlesImported: 0,
          executedAt: now,
        },
      });
      executionIds.push(executionId);
    }

    // Enqueue BullMQ job via TaskService
    const task = await this.taskService.enqueueTask(
      'sls.execute-query',
      {
        queryId,
        databases,
        sessionId,
        executionIds,
        queryString: query.queryString,
        dateFrom: query.dateFrom?.toISOString() ?? null,
        dateTo: query.dateTo?.toISOString() ?? null,
      },
      userId,
    );

    // Generate reproducibility statements after task creation
    const reproducibilityStatements = databases.map(
      (db) =>
        `Search conducted on ${now.toISOString().split('T')[0]} in ${db} using query: ${query.queryString}. Results: pending.`,
    );

    return {
      taskId: task.id,
      executionIds,
      reproducibilityStatements,
    };
  }
}
