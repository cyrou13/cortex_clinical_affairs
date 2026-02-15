import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostTracker } from './cost-tracker.js';

function createMockRedis() {
  return {
    lpush: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
  } as any;
}

describe('CostTracker', () => {
  let tracker: CostTracker;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    tracker = new CostTracker(mockRedis);
  });

  describe('trackCost', () => {
    it('stores cost record in project-specific and global lists', async () => {
      await tracker.trackCost(
        'project-123',
        'scoring',
        'claude',
        'claude-haiku-4-20250414',
        { promptTokens: 100, completionTokens: 50 },
        0.001,
      );

      expect(mockRedis.lpush).toHaveBeenCalledTimes(2);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'llm:costs:project-123',
        expect.any(String),
      );
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'llm:costs:global',
        expect.any(String),
      );
    });

    it('stores in global list only when no projectId', async () => {
      await tracker.trackCost(
        null,
        'extraction',
        'openai',
        'gpt-4o',
        { promptTokens: 200, completionTokens: 100 },
        0.005,
      );

      expect(mockRedis.lpush).toHaveBeenCalledTimes(1);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'llm:costs:global',
        expect.any(String),
      );
    });

    it('publishes cost event', async () => {
      await tracker.trackCost(
        'project-123',
        'scoring',
        'claude',
        'claude-haiku-4-20250414',
        { promptTokens: 100, completionTokens: 50 },
        0.001,
      );

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'llm:cost:event',
        expect.any(String),
      );

      const publishedData = JSON.parse(mockRedis.publish.mock.calls[0][1]);
      expect(publishedData.provider).toBe('claude');
      expect(publishedData.costUsd).toBe(0.001);
    });

    it('stores correct record structure', async () => {
      await tracker.trackCost(
        'project-123',
        'drafting',
        'openai',
        'gpt-4o',
        { promptTokens: 500, completionTokens: 300 },
        0.01,
      );

      const storedData = JSON.parse(mockRedis.lpush.mock.calls[0][1]);
      expect(storedData).toMatchObject({
        projectId: 'project-123',
        taskType: 'drafting',
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 500,
        completionTokens: 300,
        costUsd: 0.01,
      });
      expect(storedData.timestamp).toBeDefined();
    });
  });

  describe('getCostSummary', () => {
    it('aggregates costs by provider and task type', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({
          projectId: 'p1', taskType: 'scoring', provider: 'claude',
          model: 'claude-haiku-4-20250414', promptTokens: 100, completionTokens: 50,
          costUsd: 0.001, timestamp: '2026-01-15T00:00:00Z',
        }),
        JSON.stringify({
          projectId: 'p1', taskType: 'extraction', provider: 'openai',
          model: 'gpt-4o', promptTokens: 200, completionTokens: 100,
          costUsd: 0.005, timestamp: '2026-01-16T00:00:00Z',
        }),
      ]);

      const summary = await tracker.getCostSummary('p1');

      expect(summary.totalCostUsd).toBeCloseTo(0.006, 4);
      expect(summary.totalPromptTokens).toBe(300);
      expect(summary.totalCompletionTokens).toBe(150);
      expect(summary.byProvider['claude']!.requestCount).toBe(1);
      expect(summary.byProvider['openai']!.requestCount).toBe(1);
      expect(summary.byTaskType['scoring']!.requestCount).toBe(1);
      expect(summary.byTaskType['extraction']!.requestCount).toBe(1);
    });

    it('filters by time range', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({
          projectId: null, taskType: 'scoring', provider: 'claude',
          model: 'claude-haiku-4-20250414', promptTokens: 100, completionTokens: 50,
          costUsd: 0.001, timestamp: '2026-01-01T00:00:00Z',
        }),
        JSON.stringify({
          projectId: null, taskType: 'scoring', provider: 'claude',
          model: 'claude-haiku-4-20250414', promptTokens: 100, completionTokens: 50,
          costUsd: 0.001, timestamp: '2026-02-01T00:00:00Z',
        }),
      ]);

      const summary = await tracker.getCostSummary(undefined, {
        start: '2026-01-15T00:00:00Z',
        end: '2026-02-15T00:00:00Z',
      });

      expect(summary.byProvider['claude']!.requestCount).toBe(1);
    });

    it('returns empty summary when no records exist', async () => {
      mockRedis.lrange.mockResolvedValue([]);

      const summary = await tracker.getCostSummary();

      expect(summary.totalCostUsd).toBe(0);
      expect(summary.totalPromptTokens).toBe(0);
      expect(Object.keys(summary.byProvider)).toHaveLength(0);
    });
  });
});
