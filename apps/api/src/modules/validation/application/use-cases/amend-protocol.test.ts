import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmendProtocolUseCase } from './amend-protocol.js';

function makePrisma(overrides?: {
  protocol?: Record<string, unknown> | null;
  study?: Record<string, unknown> | null;
}) {
  return {
    protocol: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.protocol !== undefined
          ? overrides.protocol
          : {
              id: 'proto-1',
              version: '1.0',
              status: 'APPROVED',
              validationStudyId: 'study-1',
              summary: 'Original summary',
              endpoints: 'Original endpoints',
              sampleSizeJustification: 'Original justification',
              statisticalStrategy: 'Original strategy',
            },
      ),
      update: vi.fn().mockResolvedValue({ id: 'proto-1' }),
    },
    protocolAmendment: {
      create: vi.fn().mockResolvedValue({ id: 'amend-1' }),
    },
    validationStudy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.study !== undefined
          ? overrides.study
          : { id: 'study-1', status: 'IN_PROGRESS' },
      ),
    },
  } as any;
}

describe('AmendProtocolUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('amends protocol and increments version', async () => {
    const prisma = makePrisma();
    const useCase = new AmendProtocolUseCase(prisma);

    const result = await useCase.execute({
      protocolId: 'proto-1',
      reason: 'New data available',
      userId: 'user-1',
    });

    expect(result.fromVersion).toBe('1.0');
    expect(result.toVersion).toBe('1.1');
    expect(result.status).toBe('AMENDED');
  });

  it('creates amendment record', async () => {
    const prisma = makePrisma();
    const useCase = new AmendProtocolUseCase(prisma);

    const result = await useCase.execute({
      protocolId: 'proto-1',
      reason: 'Correction needed',
      userId: 'user-1',
    });

    expect(result.amendmentId).toBeTruthy();
    expect(prisma.protocolAmendment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          protocolId: 'proto-1',
          fromVersion: '1.0',
          toVersion: '1.1',
          reason: 'Correction needed',
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('updates protocol with new content when provided', async () => {
    const prisma = makePrisma();
    const useCase = new AmendProtocolUseCase(prisma);

    await useCase.execute({
      protocolId: 'proto-1',
      reason: 'Update endpoints',
      userId: 'user-1',
      endpoints: 'New endpoints',
      summary: 'New summary',
    });

    expect(prisma.protocol.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endpoints: 'New endpoints',
          summary: 'New summary',
        }),
      }),
    );
  });

  it('keeps original content when fields not provided', async () => {
    const prisma = makePrisma();
    const useCase = new AmendProtocolUseCase(prisma);

    await useCase.execute({
      protocolId: 'proto-1',
      reason: 'Minor fix',
      userId: 'user-1',
    });

    expect(prisma.protocol.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: 'Original summary',
          endpoints: 'Original endpoints',
        }),
      }),
    );
  });

  it('allows amending a previously amended protocol', async () => {
    const prisma = makePrisma({
      protocol: {
        id: 'proto-1',
        version: '1.1',
        status: 'AMENDED',
        validationStudyId: 'study-1',
        summary: 'Summary',
        endpoints: 'Endpoints',
        sampleSizeJustification: 'Just.',
        statisticalStrategy: 'Strategy',
      },
    });
    const useCase = new AmendProtocolUseCase(prisma);

    const result = await useCase.execute({
      protocolId: 'proto-1',
      reason: 'Second amendment',
      userId: 'user-1',
    });

    expect(result.fromVersion).toBe('1.1');
    expect(result.toVersion).toBe('1.2');
  });

  it('throws for empty reason', async () => {
    const prisma = makePrisma();
    const useCase = new AmendProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        protocolId: 'proto-1',
        reason: '  ',
        userId: 'user-1',
      }),
    ).rejects.toThrow('reason is required');
  });

  it('throws when protocol not found', async () => {
    const prisma = makePrisma({ protocol: null });
    const useCase = new AmendProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        protocolId: 'missing',
        reason: 'Reason',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when protocol is DRAFT', async () => {
    const prisma = makePrisma({
      protocol: {
        id: 'proto-1',
        version: '1.0',
        status: 'DRAFT',
        validationStudyId: 'study-1',
        summary: null,
        endpoints: null,
        sampleSizeJustification: null,
        statisticalStrategy: null,
      },
    });
    const useCase = new AmendProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        protocolId: 'proto-1',
        reason: 'Reason',
        userId: 'user-1',
      }),
    ).rejects.toThrow('approved or previously amended');
  });

  it('throws when study is locked', async () => {
    const prisma = makePrisma({
      study: { id: 'study-1', status: 'LOCKED' },
    });
    const useCase = new AmendProtocolUseCase(prisma);

    await expect(
      useCase.execute({
        protocolId: 'proto-1',
        reason: 'Reason',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });
});
