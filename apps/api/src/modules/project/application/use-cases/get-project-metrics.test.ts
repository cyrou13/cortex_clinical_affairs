import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProjectMetricsUseCase } from './get-project-metrics.js';

function makePrisma(overrides?: {
  memberCount?: number;
  lastActivity?: { timestamp: Date } | null;
}) {
  return {
    projectMember: {
      count: vi.fn().mockResolvedValue(overrides?.memberCount ?? 0),
    },
    auditLog: {
      findFirst: vi.fn().mockResolvedValue(overrides?.lastActivity ?? null),
    },
  } as any;
}

describe('GetProjectMetricsUseCase', () => {
  describe('new project with no data', () => {
    let prisma: ReturnType<typeof makePrisma>;
    let useCase: GetProjectMetricsUseCase;

    beforeEach(() => {
      vi.clearAllMocks();
      prisma = makePrisma();
      useCase = new GetProjectMetricsUseCase(prisma);
    });

    it('returns zero counts for article metrics', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.totalArticles).toBe(0);
      expect(result.includedArticles).toBe(0);
    });

    it('returns zero team member count when no members', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.teamMemberCount).toBe(0);
    });

    it('returns null lastActivityAt when no activity exists', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.lastActivityAt).toBeNull();
    });

    it('returns default SOA section totals', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.soaSectionsComplete).toBe(0);
      expect(result.soaSectionsTotal).toBe(11);
    });

    it('returns default CER section totals', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.cerSectionsComplete).toBe(0);
      expect(result.cerSectionsTotal).toBe(14);
    });

    it('returns zero traceability coverage', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.traceabilityCoverage).toBe(0);
    });
  });

  describe('project with team members', () => {
    it('returns correct teamMemberCount', async () => {
      const prisma = makePrisma({ memberCount: 5 });
      const useCase = new GetProjectMetricsUseCase(prisma);

      const result = await useCase.execute('proj-1');
      expect(result.teamMemberCount).toBe(5);
      expect(prisma.projectMember.count).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });
  });

  describe('project with activity', () => {
    it('returns lastActivityAt as ISO string', async () => {
      const activityDate = new Date('2025-06-15T10:30:00.000Z');
      const prisma = makePrisma({
        lastActivity: { timestamp: activityDate },
      });
      const useCase = new GetProjectMetricsUseCase(prisma);

      const result = await useCase.execute('proj-1');
      expect(result.lastActivityAt).toBe('2025-06-15T10:30:00.000Z');
    });

    it('queries audit log with correct filters', async () => {
      const prisma = makePrisma({
        lastActivity: { timestamp: new Date() },
      });
      const useCase = new GetProjectMetricsUseCase(prisma);

      await useCase.execute('proj-42');
      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
        where: { targetType: 'project', targetId: 'proj-42' },
        orderBy: { timestamp: 'desc' },
      });
    });
  });
});
