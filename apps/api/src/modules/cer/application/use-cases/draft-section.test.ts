import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftSectionUseCase } from './draft-section.js';

function makePrisma(overrides?: { section?: Record<string, unknown> | null }) {
  return {
    cerSection: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.section !== undefined ? overrides.section : { id: 'sec-1', status: 'DRAFT' },
        ),
      update: vi.fn().mockResolvedValue({ id: 'sec-1' }),
    },
  } as any;
}

function makeLlm() {
  return {
    generateSectionDraft: vi.fn().mockResolvedValue({
      content:
        'This section describes the scope of the clinical evaluation for the CardioValve Pro device.',
      references: [{ sourceId: 'soa-1', excerpt: 'Device description' }],
    }),
  };
}

function makeDataGatherer() {
  return {
    gatherData: vi.fn().mockResolvedValue({
      data: [
        {
          moduleType: 'SOA',
          moduleId: 'soa-1',
          dataType: 'device-description',
          content: 'CardioValve Pro is a transcatheter heart valve replacement device.',
        },
      ],
    }),
  };
}

describe('DraftSectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drafts a section with LLM content', async () => {
    const prisma = makePrisma();
    const llm = makeLlm();
    const gatherer = makeDataGatherer();
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    const result = await useCase.execute({
      cerSectionId: 'sec-1',
      cerVersionId: 'cer-1',
      sectionNumber: '1',
      sectionTitle: 'Scope of the Clinical Evaluation',
      requiredUpstreamData: [
        { moduleType: 'SOA', dataType: 'device-description', description: 'Device description' },
      ],
      userId: 'user-1',
    });

    expect(result.cerSectionId).toBe('sec-1');
    expect(result.content).toContain('scope');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('gathers upstream data before drafting', async () => {
    const prisma = makePrisma();
    const llm = makeLlm();
    const gatherer = makeDataGatherer();
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    await useCase.execute({
      cerSectionId: 'sec-1',
      cerVersionId: 'cer-1',
      sectionNumber: '1',
      sectionTitle: 'Scope',
      requiredUpstreamData: [
        { moduleType: 'SOA', dataType: 'device-description', description: 'Desc' },
      ],
      userId: 'user-1',
    });

    expect(gatherer.gatherData).toHaveBeenCalledWith('cer-1', [
      { moduleType: 'SOA', dataType: 'device-description', description: 'Desc' },
    ]);
  });

  it('calls LLM with constructed prompt', async () => {
    const prisma = makePrisma();
    const llm = makeLlm();
    const gatherer = makeDataGatherer();
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    await useCase.execute({
      cerSectionId: 'sec-1',
      cerVersionId: 'cer-1',
      sectionNumber: '3',
      sectionTitle: 'Device Description',
      requiredUpstreamData: [],
      userId: 'user-1',
    });

    expect(llm.generateSectionDraft).toHaveBeenCalledWith(expect.stringContaining('Section 3'));
  });

  it('stores content in the section', async () => {
    const prisma = makePrisma();
    const llm = makeLlm();
    const gatherer = makeDataGatherer();
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    await useCase.execute({
      cerSectionId: 'sec-1',
      cerVersionId: 'cer-1',
      sectionNumber: '1',
      sectionTitle: 'Scope',
      requiredUpstreamData: [],
      userId: 'user-1',
    });

    expect(prisma.cerSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sec-1' },
        data: expect.objectContaining({
          status: 'DRAFT',
          content: expect.any(String),
          wordCount: expect.any(Number),
        }),
      }),
    );
  });

  it('throws when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const llm = makeLlm();
    const gatherer = makeDataGatherer();
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    await expect(
      useCase.execute({
        cerSectionId: 'missing',
        cerVersionId: 'cer-1',
        sectionNumber: '1',
        sectionTitle: 'Scope',
        requiredUpstreamData: [],
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('returns references from upstream data', async () => {
    const prisma = makePrisma();
    const llm = makeLlm();
    const gatherer = makeDataGatherer();
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    const result = await useCase.execute({
      cerSectionId: 'sec-1',
      cerVersionId: 'cer-1',
      sectionNumber: '1',
      sectionTitle: 'Scope',
      requiredUpstreamData: [
        { moduleType: 'SOA', dataType: 'device-description', description: 'Desc' },
      ],
      userId: 'user-1',
    });

    expect(result.references).toHaveLength(1);
    expect(result.references[0]!.moduleType).toBe('SOA');
    expect(result.references[0]!.dataType).toBe('device-description');
  });

  it('handles section with no upstream data requirements', async () => {
    const prisma = makePrisma();
    const llm = makeLlm();
    const gatherer = {
      gatherData: vi.fn().mockResolvedValue({ data: [] }),
    };
    const useCase = new DraftSectionUseCase(prisma, llm, gatherer);

    const result = await useCase.execute({
      cerSectionId: 'sec-1',
      cerVersionId: 'cer-1',
      sectionNumber: '14',
      sectionTitle: 'Date, Signature, and Qualifications',
      requiredUpstreamData: [],
      userId: 'user-1',
    });

    expect(result.references).toHaveLength(0);
    expect(llm.generateSectionDraft).toHaveBeenCalledWith(expect.stringContaining('Section 14'));
  });
});
