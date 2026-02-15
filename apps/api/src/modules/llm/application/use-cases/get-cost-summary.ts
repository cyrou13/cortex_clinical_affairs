import type { PrismaClient } from '@prisma/client';

interface CostBreakdownEntry {
  key: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
}

interface CostSummaryResult {
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byProvider: CostBreakdownEntry[];
  byTaskType: CostBreakdownEntry[];
  periodStart: string | null;
  periodEnd: string | null;
}

export class GetCostSummaryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    projectId?: string,
    timeRange?: { start: string; end: string },
  ): Promise<CostSummaryResult> {
    const where: Record<string, unknown> = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (timeRange) {
      where.createdAt = {
        gte: new Date(timeRange.start),
        lte: new Date(timeRange.end),
      };
    }

    const records = await (this.prisma as any).llmCostRecord.findMany({ where });

    let totalCostUsd = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const providerMap = new Map<string, CostBreakdownEntry>();
    const taskTypeMap = new Map<string, CostBreakdownEntry>();

    for (const record of records) {
      totalCostUsd += record.costUsd;
      totalPromptTokens += record.promptTokens;
      totalCompletionTokens += record.completionTokens;

      // By provider
      const providerEntry = providerMap.get(record.provider) ?? {
        key: record.provider,
        costUsd: 0,
        promptTokens: 0,
        completionTokens: 0,
        requestCount: 0,
      };
      providerEntry.costUsd += record.costUsd;
      providerEntry.promptTokens += record.promptTokens;
      providerEntry.completionTokens += record.completionTokens;
      providerEntry.requestCount += 1;
      providerMap.set(record.provider, providerEntry);

      // By task type
      const taskEntry = taskTypeMap.get(record.taskType) ?? {
        key: record.taskType,
        costUsd: 0,
        promptTokens: 0,
        completionTokens: 0,
        requestCount: 0,
      };
      taskEntry.costUsd += record.costUsd;
      taskEntry.promptTokens += record.promptTokens;
      taskEntry.completionTokens += record.completionTokens;
      taskEntry.requestCount += 1;
      taskTypeMap.set(record.taskType, taskEntry);
    }

    return {
      totalCostUsd,
      totalPromptTokens,
      totalCompletionTokens,
      byProvider: [...providerMap.values()],
      byTaskType: [...taskTypeMap.values()],
      periodStart: timeRange?.start ?? null,
      periodEnd: timeRange?.end ?? null,
    };
  }
}
