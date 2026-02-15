import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefineProtocolUseCase } from './define-protocol.js';

function makePrisma(overrides?: {
  study?: Record<string, unknown> | null;
  existingProtocol?: Record<string, unknown> | null;
}) {
  return {
    validationStudy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.study !== undefined
          ? overrides.study
          : { id: 'study-1', status: 'DRAFT' },
      ),
    },
    protocol: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.existingProtocol !== undefined ? overrides.existingProtocol : null,
      ),
      create: vi.fn().mockResolvedValue({ id: 'proto-1' }),
      update: vi.fn().mockResolvedValue({ id: 'proto-1' }),
    },
  } as any;
}

describe('DefineProtocolUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new protocol when none exists', async () => {
    const prisma = makePrisma();
    const useCase = new DefineProtocolUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      summary: 'Test protocol',
      endpoints: 'Sensitivity, Specificity',
      sampleSizeJustification: '100 cases',
      statisticalStrategy: 'Wilson CI',
      userId: 'user-1',
    });

    expect(result.isNew).toBe(true);
    expect(result.version).toBe('1.0');
    expect(result.status).toBe('DRAFT');
    expect(prisma.protocol.create).toHaveBeenCalled();
  });

  it('updates existing DRAFT protocol', async () => {
    const prisma = makePrisma({
      existingProtocol: { id: 'proto-1', version: '1.0', status: 'DRAFT' },
    });
    const useCase = new DefineProtocolUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      summary: 'Updated summary',
      userId: 'user-1',
    });

    expect(result.isNew).toBe(false);
    expect(result.protocolId).toBe('proto-1');
    expect(prisma.protocol.update).toHaveBeenCalled();
    expect(prisma.protocol.create).not.toHaveBeenCalled();
  });

  it('updates existing AMENDED protocol', async () => {
    const prisma = makePrisma({
      existingProtocol: { id: 'proto-1', version: '1.1', status: 'AMENDED' },
    });
    const useCase = new DefineProtocolUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      summary: 'Updated after amendment',
      userId: 'user-1',
    });

    expect(result.isNew).toBe(false);
    expect(prisma.protocol.update).toHaveBeenCalled();
  });

  it('throws when protocol is APPROVED', async () => {
    const prisma = makePrisma({
      existingProtocol: { id: 'proto-1', version: '1.0', status: 'APPROVED' },
    });
    const useCase = new DefineProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'study-1',
        summary: 'Change',
        userId: 'user-1',
      }),
    ).rejects.toThrow('approved');
  });

  it('throws when study not found', async () => {
    const prisma = makePrisma({ study: null });
    const useCase = new DefineProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when study is locked', async () => {
    const prisma = makePrisma({
      study: { id: 'study-1', status: 'LOCKED' },
    });
    const useCase = new DefineProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'study-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });

  it('passes correct data to protocol create', async () => {
    const prisma = makePrisma();
    const useCase = new DefineProtocolUseCase(prisma);

    await useCase.execute({
      validationStudyId: 'study-1',
      summary: 'Summary',
      endpoints: 'Endpoints',
      sampleSizeJustification: 'Justification',
      statisticalStrategy: 'Strategy',
      userId: 'user-1',
    });

    expect(prisma.protocol.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStudyId: 'study-1',
          version: '1.0',
          status: 'DRAFT',
          summary: 'Summary',
          endpoints: 'Endpoints',
          sampleSizeJustification: 'Justification',
          statisticalStrategy: 'Strategy',
          createdById: 'user-1',
        }),
      }),
    );
  });
});
