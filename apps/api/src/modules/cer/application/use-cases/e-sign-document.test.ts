import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ESignDocumentUseCase } from './e-sign-document.js';

const CER_VERSION_ID = 'cer-v1';
const USER_ID = 'user-1';
const EVALUATOR_ID = 'eval-1';
const SIGNATURE_ID = 'sig-1';
const DOCUMENT_HASH = 'abc123hash';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makeChecksumService() {
  return {
    computeHash: vi.fn().mockReturnValue(DOCUMENT_HASH),
    verifyHash: vi.fn().mockReturnValue(true),
    computeDocumentHash: vi.fn().mockReturnValue(DOCUMENT_HASH),
  };
}

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  evaluator?: Record<string, unknown> | null;
  sections?: Record<string, unknown>[];
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: CER_VERSION_ID },
      ),
    },
    evaluator: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.evaluator !== undefined
          ? overrides.evaluator
          : {
              id: EVALUATOR_ID,
              cvFilePath: '/uploads/cv.pdf',
              coiDeclaredAt: new Date().toISOString(),
              signedAt: null,
            },
      ),
      update: vi.fn().mockResolvedValue({ id: EVALUATOR_ID }),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          { content: 'Section 1 content' },
          { content: 'Section 2 content' },
        ],
      ),
    },
    eSignature: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id }),
      ),
    },
  } as any;
}

describe('ESignDocumentUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;
  let checksumService: ReturnType<typeof makeChecksumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
    checksumService = makeChecksumService();
  });

  it('signs document successfully', async () => {
    const prisma = makePrisma();
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    const result = await useCase.execute({
      userId: USER_ID,
      cerVersionId: CER_VERSION_ID,
      action: 'APPROVE',
    });

    expect(result.userId).toBe(USER_ID);
    expect(result.cerVersionId).toBe(CER_VERSION_ID);
    expect(result.documentHash).toBe(DOCUMENT_HASH);
    expect(result.signedAt).toBeDefined();
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ userId: USER_ID, cerVersionId: 'missing', action: 'APPROVE' }),
    ).rejects.toThrow('not found');
  });

  it('throws NotFoundError when evaluator record does not exist', async () => {
    const prisma = makePrisma({ evaluator: null });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ userId: USER_ID, cerVersionId: CER_VERSION_ID, action: 'APPROVE' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when COI not declared', async () => {
    const prisma = makePrisma({
      evaluator: {
        id: EVALUATOR_ID,
        cvFilePath: '/uploads/cv.pdf',
        coiDeclaredAt: null,
        signedAt: null,
      },
    });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ userId: USER_ID, cerVersionId: CER_VERSION_ID, action: 'APPROVE' }),
    ).rejects.toThrow('COI declaration must be completed');
  });

  it('throws ValidationError when CV not uploaded', async () => {
    const prisma = makePrisma({
      evaluator: {
        id: EVALUATOR_ID,
        cvFilePath: null,
        coiDeclaredAt: new Date().toISOString(),
        signedAt: null,
      },
    });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ userId: USER_ID, cerVersionId: CER_VERSION_ID, action: 'APPROVE' }),
    ).rejects.toThrow('CV must be uploaded');
  });

  it('throws ValidationError when already signed', async () => {
    const prisma = makePrisma({
      evaluator: {
        id: EVALUATOR_ID,
        cvFilePath: '/uploads/cv.pdf',
        coiDeclaredAt: new Date().toISOString(),
        signedAt: new Date().toISOString(),
      },
    });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ userId: USER_ID, cerVersionId: CER_VERSION_ID, action: 'APPROVE' }),
    ).rejects.toThrow('already been signed');
  });

  it('computes document hash from all sections', async () => {
    const prisma = makePrisma({
      sections: [
        { content: 'Section A' },
        { content: 'Section B' },
        { content: 'Section C' },
      ],
    });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await useCase.execute({
      userId: USER_ID,
      cerVersionId: CER_VERSION_ID,
      action: 'APPROVE',
    });

    expect(checksumService.computeDocumentHash).toHaveBeenCalledWith([
      { content: 'Section A' },
      { content: 'Section B' },
      { content: 'Section C' },
    ]);
  });

  it('creates ESignature record', async () => {
    const prisma = makePrisma();
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await useCase.execute({
      userId: USER_ID,
      cerVersionId: CER_VERSION_ID,
      action: 'APPROVE',
    });

    expect(prisma.eSignature.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cerVersionId: CER_VERSION_ID,
          userId: USER_ID,
          documentHash: DOCUMENT_HASH,
          action: 'APPROVE',
        }),
      }),
    );
  });

  it('updates evaluator record with signature', async () => {
    const prisma = makePrisma();
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await useCase.execute({
      userId: USER_ID,
      cerVersionId: CER_VERSION_ID,
      action: 'APPROVE',
    });

    expect(prisma.evaluator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVALUATOR_ID },
        data: expect.objectContaining({
          signatureHash: DOCUMENT_HASH,
          signedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('emits cer.document.signed event', async () => {
    const prisma = makePrisma();
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await useCase.execute({
      userId: USER_ID,
      cerVersionId: CER_VERSION_ID,
      action: 'APPROVE',
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'cer.document.signed',
        aggregateType: 'CerVersion',
        data: expect.objectContaining({
          cerVersionId: CER_VERSION_ID,
          userId: USER_ID,
          documentHash: DOCUMENT_HASH,
          action: 'APPROVE',
        }),
      }),
    );
  });

  it('does not emit event or create records on validation failure', async () => {
    const prisma = makePrisma({
      evaluator: {
        id: EVALUATOR_ID,
        cvFilePath: null,
        coiDeclaredAt: null,
        signedAt: null,
      },
    });
    const useCase = new ESignDocumentUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ userId: USER_ID, cerVersionId: CER_VERSION_ID, action: 'APPROVE' }),
    ).rejects.toThrow();

    expect(prisma.eSignature.create).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
