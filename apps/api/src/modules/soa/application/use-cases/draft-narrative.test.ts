import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftNarrativeUseCase } from './draft-narrative.js';

const SOA_ID = 'soa-1';
const SECTION_ID = 'sec-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: { section?: Record<string, unknown> | null }) {
  return {
    thematicSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: SECTION_ID,
              status: 'DRAFT',
              soaAnalysis: { id: SOA_ID, status: 'IN_PROGRESS' },
            },
      ),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({ id: 'task-1' }),
    },
  } as any;
}

describe('DraftNarrativeUseCase', () => {
  let mockEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueue = vi.fn().mockResolvedValue('job-1');
  });

  it('creates async task and returns taskId on happy path', async () => {
    const prisma = makePrisma();
    const useCase = new DraftNarrativeUseCase(prisma, mockEnqueue);

    const result = await useCase.execute({
      sectionId: SECTION_ID,
      soaAnalysisId: SOA_ID,
      userId: USER_ID,
    });

    expect(result.taskId).toBe('task-1');
    expect(prisma.asyncTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SOA_DRAFT_NARRATIVE',
          status: 'PENDING',
          createdBy: USER_ID,
        }),
      }),
    );
  });

  it('throws NotFoundError for missing section', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new DraftNarrativeUseCase(prisma, mockEnqueue);

    await expect(
      useCase.execute({ sectionId: 'missing', soaAnalysisId: SOA_ID, userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError for locked SOA', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'DRAFT',
        soaAnalysis: { id: SOA_ID, status: 'LOCKED' },
      },
    });
    const useCase = new DraftNarrativeUseCase(prisma, mockEnqueue);

    await expect(
      useCase.execute({ sectionId: SECTION_ID, soaAnalysisId: SOA_ID, userId: USER_ID }),
    ).rejects.toThrow('locked SOA');
  });

  it('throws ValidationError when section is already finalized', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'FINALIZED',
        soaAnalysis: { id: SOA_ID, status: 'IN_PROGRESS' },
      },
    });
    const useCase = new DraftNarrativeUseCase(prisma, mockEnqueue);

    await expect(
      useCase.execute({ sectionId: SECTION_ID, soaAnalysisId: SOA_ID, userId: USER_ID }),
    ).rejects.toThrow('finalized section');
  });

  it('enqueues BullMQ job on soa:draft-narrative queue', async () => {
    const prisma = makePrisma();
    const useCase = new DraftNarrativeUseCase(prisma, mockEnqueue);

    await useCase.execute({
      sectionId: SECTION_ID,
      soaAnalysisId: SOA_ID,
      userId: USER_ID,
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'soa.draft-narrative',
      expect.objectContaining({
        taskId: 'task-1',
        sectionId: SECTION_ID,
        soaAnalysisId: SOA_ID,
      }),
    );
  });
});
