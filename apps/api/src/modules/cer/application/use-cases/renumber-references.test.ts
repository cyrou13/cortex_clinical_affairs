import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RenumberReferencesUseCase } from './renumber-references.js';

const VERSION_ID = 'ver-1';
const USER_ID = 'user-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: VERSION_ID },
      ),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          {
            id: 'sec-1',
            sectionNumber: '1',
            humanEditedContent: 'See [3] and [1] for details',
            aiDraftContent: null,
          },
          {
            id: 'sec-2',
            sectionNumber: '2',
            humanEditedContent: 'Reference [2] and [R2] plus [R1]',
            aiDraftContent: null,
          },
        ],
      ),
      update: vi.fn().mockResolvedValue({ id: 'sec-1' }),
    },
    bibliographyEntry: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    crossReference: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('RenumberReferencesUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('renumbers bibliography references in order of appearance', async () => {
    const prisma = makePrisma();
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    // Appearance order: [3] -> 1, [1] -> 2, [2] -> 3
    const bibMappings = result.mappings.filter((m) => m.type === 'BIBLIOGRAPHY');
    expect(bibMappings.length).toBeGreaterThan(0);
    expect(bibMappings).toContainEqual(
      expect.objectContaining({ oldNumber: '3', newNumber: '1' }),
    );
  });

  it('renumbers external doc references in order of appearance', async () => {
    const prisma = makePrisma();
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    const extMappings = result.mappings.filter((m) => m.type === 'EXTERNAL_DOC');
    // [R2] appears first in section 2, then [R1]
    expect(extMappings).toContainEqual(
      expect.objectContaining({ oldNumber: 'R2', newNumber: 'R1' }),
    );
  });

  it('updates section content with new reference numbers', async () => {
    const prisma = makePrisma();
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.sectionsUpdated).toBeGreaterThan(0);
    expect(prisma.cerSection.update).toHaveBeenCalled();
  });

  it('updates bibliography entry order indexes', async () => {
    const prisma = makePrisma();
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(prisma.bibliographyEntry.updateMany).toHaveBeenCalled();
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ cerVersionId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('does not emit event when no changes needed', async () => {
    const prisma = makePrisma({
      sections: [
        {
          id: 'sec-1',
          sectionNumber: '1',
          humanEditedContent: 'Already numbered [1] and [2]',
          aiDraftContent: null,
        },
      ],
    });
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.mappings.length).toBe(0);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('emits cer.references.renumbered event when changes made', async () => {
    const prisma = makePrisma();
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'cer.references.renumbered',
        aggregateId: VERSION_ID,
        aggregateType: 'CerVersion',
      }),
    );
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'cer.references.renumbered',
        }),
      }),
    );
  });

  it('handles sections with no content', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', sectionNumber: '1', humanEditedContent: null, aiDraftContent: null },
      ],
    });
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.mappings).toEqual([]);
    expect(result.sectionsUpdated).toBe(0);
  });

  it('handles JSON content in sections', async () => {
    const prisma = makePrisma({
      sections: [
        {
          id: 'sec-1',
          sectionNumber: '1',
          humanEditedContent: { text: 'See [2] then [1]' },
          aiDraftContent: null,
        },
      ],
    });
    const useCase = new RenumberReferencesUseCase(prisma, eventBus);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    // [2] appears first -> should become [1], [1] appears second -> should become [2]
    expect(result.mappings).toContainEqual(
      expect.objectContaining({ oldNumber: '2', newNumber: '1' }),
    );
  });
});
