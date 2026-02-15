import type { Redis } from 'ioredis';
import type { TaskType } from './types.js';

export interface CostRecord {
  projectId: string | null;
  taskType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  timestamp: string;
}

export interface CostSummary {
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byProvider: Record<string, { costUsd: number; promptTokens: number; completionTokens: number; requestCount: number }>;
  byTaskType: Record<string, { costUsd: number; promptTokens: number; completionTokens: number; requestCount: number }>;
}

export class CostTracker {
  constructor(private readonly redis: Redis) {}

  async trackCost(
    projectId: string | null,
    taskType: TaskType,
    provider: string,
    model: string,
    usage: { promptTokens: number; completionTokens: number },
    costUsd: number,
  ): Promise<void> {
    const record: CostRecord = {
      projectId,
      taskType,
      provider,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      costUsd,
      timestamp: new Date().toISOString(),
    };

    const key = projectId ? `llm:costs:${projectId}` : 'llm:costs:global';
    await this.redis.lpush(key, JSON.stringify(record));

    // Also store in global list for aggregation
    if (projectId) {
      await this.redis.lpush('llm:costs:global', JSON.stringify(record));
    }

    // Publish event for real-time tracking
    await this.redis.publish('llm:cost:event', JSON.stringify(record));
  }

  async getCostSummary(projectId?: string, timeRange?: { start: string; end: string }): Promise<CostSummary> {
    const key = projectId ? `llm:costs:${projectId}` : 'llm:costs:global';
    const raw = await this.redis.lrange(key, 0, -1);

    const records: CostRecord[] = raw
      .map((r) => {
        try {
          return JSON.parse(r) as CostRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is CostRecord => r !== null);

    // Filter by time range if provided
    const filtered = timeRange
      ? records.filter((r) => {
          const ts = new Date(r.timestamp).getTime();
          const start = new Date(timeRange.start).getTime();
          const end = new Date(timeRange.end).getTime();
          return ts >= start && ts <= end;
        })
      : records;

    return this.aggregateRecords(filtered);
  }

  private aggregateRecords(records: CostRecord[]): CostSummary {
    const summary: CostSummary = {
      totalCostUsd: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      byProvider: {},
      byTaskType: {},
    };

    for (const record of records) {
      summary.totalCostUsd += record.costUsd;
      summary.totalPromptTokens += record.promptTokens;
      summary.totalCompletionTokens += record.completionTokens;

      // By provider
      if (!summary.byProvider[record.provider]) {
        summary.byProvider[record.provider] = { costUsd: 0, promptTokens: 0, completionTokens: 0, requestCount: 0 };
      }
      summary.byProvider[record.provider]!.costUsd += record.costUsd;
      summary.byProvider[record.provider]!.promptTokens += record.promptTokens;
      summary.byProvider[record.provider]!.completionTokens += record.completionTokens;
      summary.byProvider[record.provider]!.requestCount += 1;

      // By task type
      if (!summary.byTaskType[record.taskType]) {
        summary.byTaskType[record.taskType] = { costUsd: 0, promptTokens: 0, completionTokens: 0, requestCount: 0 };
      }
      summary.byTaskType[record.taskType]!.costUsd += record.costUsd;
      summary.byTaskType[record.taskType]!.promptTokens += record.promptTokens;
      summary.byTaskType[record.taskType]!.completionTokens += record.completionTokens;
      summary.byTaskType[record.taskType]!.requestCount += 1;
    }

    return summary;
  }
}
