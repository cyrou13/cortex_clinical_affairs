import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface GeneratePmcfReportResult {
  taskId: string;
  pmsCycleId: string;
  status: string;
}

interface TaskEnqueuer {
  enqueueTask: (type: string, data: Record<string, unknown> | undefined, userId: string) => Promise<{ id: string }>;
}

export class GeneratePmcfReportUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly taskService: TaskEnqueuer,
  ) {}

  async execute(pmsCycleId: string, userId: string): Promise<GeneratePmcfReportResult> {
    const cycle = await (this.prisma as any).pmsCycle.findUnique({
      where: { id: pmsCycleId },
      select: { id: true, status: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', pmsCycleId);
    }

    const task = await this.taskService.enqueueTask(
      'pms:generate-pmcf-report',
      { pmsCycleId },
      userId,
    );

    return {
      taskId: task.id,
      pmsCycleId,
      status: 'GENERATING',
    };
  }
}
