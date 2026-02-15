import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { TaskService } from '../../../../shared/services/task-service.js';

export class ScoreArticlesUseCase {
  private readonly taskService: TaskService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {
    this.taskService = new TaskService(prisma, redis);
  }

  async execute(sessionId: string, userId: string): Promise<{ taskId: string }> {
    // Validate session exists
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Validate session is not LOCKED
    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot score articles: session is locked');
    }

    // Fetch all articles with status PENDING in the session
    const pendingArticles = await (this.prisma as any).article.findMany({
      where: {
        sessionId,
        status: 'PENDING',
      },
      select: { id: true },
    });

    if (pendingArticles.length === 0) {
      throw new ValidationError('No pending articles found in session');
    }

    // Fetch exclusion codes for the session
    const exclusionCodes = await (this.prisma as any).exclusionCode.findMany({
      where: { sessionId },
      select: { code: true, label: true, shortCode: true },
    });

    // Fetch session scope/CEP context
    const scopeFields = session.scopeFields ?? null;

    const articleIds = pendingArticles.map((a: { id: string }) => a.id);

    // Create AsyncTask record and enqueue BullMQ job
    const task = await this.taskService.enqueueTask(
      'sls:score-articles',
      {
        sessionId,
        articleIds,
        exclusionCodes,
        sessionName: session.name,
        sessionType: session.type,
        scopeFields,
        projectId: session.projectId,
        totalArticles: articleIds.length,
      },
      userId,
    );

    return { taskId: task.id };
  }
}
