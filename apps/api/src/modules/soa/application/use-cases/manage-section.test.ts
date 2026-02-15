import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageSectionUseCase } from './manage-section.js';

function makePrisma(overrides?: {
  section?: Record<string, unknown> | null;
  soaAnalysis?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
}) {
  return {
    thematicSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: 'sec-1',
              status: 'DRAFT',
              narrativeContent: null,
              soaAnalysis: { status: 'IN_PROGRESS' },
            },
      ),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'sec-1', ...data }),
      ),
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          { id: 'sec-1', status: 'DRAFT' },
          { id: 'sec-2', status: 'IN_PROGRESS' },
          { id: 'sec-3', status: 'FINALIZED' },
        ],
      ),
    },
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soaAnalysis !== undefined
          ? overrides.soaAnalysis
          : { id: 'soa-1' },
      ),
    },
  } as any;
}

describe('ManageSectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateContent', () => {
    it('updates narrative content and sets status to IN_PROGRESS', async () => {
      const prisma = makePrisma();
      const useCase = new ManageSectionUseCase(prisma);

      const result = await useCase.updateContent('sec-1', 'New narrative text', 'user-1');

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.sectionId).toBe('sec-1');
      expect(prisma.thematicSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            narrativeContent: 'New narrative text',
            status: 'IN_PROGRESS',
            updatedById: 'user-1',
          }),
        }),
      );
    });

    it('throws for missing section', async () => {
      const prisma = makePrisma({ section: null });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.updateContent('missing', 'content', 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws for locked SOA analysis', async () => {
      const prisma = makePrisma({
        section: {
          id: 'sec-1',
          status: 'DRAFT',
          narrativeContent: null,
          soaAnalysis: { status: 'LOCKED' },
        },
      });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.updateContent('sec-1', 'content', 'user-1'),
      ).rejects.toThrow('locked');
    });

    it('throws for finalized section', async () => {
      const prisma = makePrisma({
        section: {
          id: 'sec-1',
          status: 'FINALIZED',
          narrativeContent: 'existing content',
          soaAnalysis: { status: 'IN_PROGRESS' },
        },
      });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.updateContent('sec-1', 'new content', 'user-1'),
      ).rejects.toThrow('finalized');
    });
  });

  describe('finalizeSection', () => {
    it('finalizes section with content', async () => {
      const prisma = makePrisma({
        section: {
          id: 'sec-1',
          status: 'IN_PROGRESS',
          narrativeContent: 'Some content here',
          soaAnalysis: { status: 'IN_PROGRESS' },
        },
      });
      const useCase = new ManageSectionUseCase(prisma);

      const result = await useCase.finalizeSection('sec-1', 'user-1');

      expect(result.status).toBe('FINALIZED');
      expect(result.sectionId).toBe('sec-1');
      expect(prisma.thematicSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FINALIZED' }),
        }),
      );
    });

    it('throws for empty narrative content', async () => {
      const prisma = makePrisma({
        section: {
          id: 'sec-1',
          status: 'IN_PROGRESS',
          narrativeContent: '',
          soaAnalysis: { status: 'IN_PROGRESS' },
        },
      });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.finalizeSection('sec-1', 'user-1'),
      ).rejects.toThrow('empty narrative content');
    });

    it('throws for null narrative content', async () => {
      const prisma = makePrisma({
        section: {
          id: 'sec-1',
          status: 'IN_PROGRESS',
          narrativeContent: null,
          soaAnalysis: { status: 'IN_PROGRESS' },
        },
      });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.finalizeSection('sec-1', 'user-1'),
      ).rejects.toThrow('empty narrative content');
    });

    it('throws for missing section', async () => {
      const prisma = makePrisma({ section: null });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.finalizeSection('missing', 'user-1'),
      ).rejects.toThrow('not found');
    });
  });

  describe('getProgress', () => {
    it('returns section progress with counts', async () => {
      const prisma = makePrisma({
        sections: [
          { id: 'sec-1', status: 'DRAFT' },
          { id: 'sec-2', status: 'IN_PROGRESS' },
          { id: 'sec-3', status: 'FINALIZED' },
          { id: 'sec-4', status: 'FINALIZED' },
        ],
      });
      const useCase = new ManageSectionUseCase(prisma);

      const result = await useCase.getProgress('soa-1');

      expect(result.totalSections).toBe(4);
      expect(result.counts.DRAFT).toBe(1);
      expect(result.counts.IN_PROGRESS).toBe(1);
      expect(result.counts.FINALIZED).toBe(2);
      expect(result.completionPercentage).toBe(50);
    });

    it('returns 0% when no sections are finalized', async () => {
      const prisma = makePrisma({
        sections: [
          { id: 'sec-1', status: 'DRAFT' },
          { id: 'sec-2', status: 'DRAFT' },
        ],
      });
      const useCase = new ManageSectionUseCase(prisma);

      const result = await useCase.getProgress('soa-1');

      expect(result.completionPercentage).toBe(0);
      expect(result.counts.FINALIZED).toBe(0);
    });

    it('throws for missing SOA analysis', async () => {
      const prisma = makePrisma({ soaAnalysis: null });
      const useCase = new ManageSectionUseCase(prisma);

      await expect(
        useCase.getProgress('missing'),
      ).rejects.toThrow('not found');
    });
  });
});
