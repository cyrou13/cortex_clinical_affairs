import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureDeviationThresholdsUseCase } from './configure-deviation-thresholds.js';

const CER_VERSION_ID = 'cer-v1';
const USER_ID = 'user-1';
const CONFIG_ID = 'config-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  existingConfig?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: CER_VERSION_ID },
      ),
    },
    pccpDeviationConfig: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.existingConfig !== undefined ? overrides.existingConfig : null,
      ),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: data.id,
          cerVersionId: data.cerVersionId,
          mandatoryJustificationLevel: data.mandatoryJustificationLevel,
        }),
      ),
      update: vi.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({
          id: where.id,
          cerVersionId: CER_VERSION_ID,
          mandatoryJustificationLevel: data.mandatoryJustificationLevel,
        }),
      ),
    },
  } as any;
}

describe('ConfigureDeviationThresholdsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates new config when none exists', async () => {
    const prisma = makePrisma();
    const useCase = new ConfigureDeviationThresholdsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      mandatoryJustificationLevel: 'HIGH',
      userId: USER_ID,
    });

    expect(result.cerVersionId).toBe(CER_VERSION_ID);
    expect(result.mandatoryJustificationLevel).toBe('HIGH');
    expect(prisma.pccpDeviationConfig.create).toHaveBeenCalled();
  });

  it('updates existing config', async () => {
    const prisma = makePrisma({
      existingConfig: { id: CONFIG_ID, cerVersionId: CER_VERSION_ID },
    });
    const useCase = new ConfigureDeviationThresholdsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      mandatoryJustificationLevel: 'MEDIUM',
      userId: USER_ID,
    });

    expect(result.mandatoryJustificationLevel).toBe('MEDIUM');
    expect(prisma.pccpDeviationConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONFIG_ID },
      }),
    );
  });

  it('throws ValidationError for invalid level', async () => {
    const prisma = makePrisma();
    const useCase = new ConfigureDeviationThresholdsUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: CER_VERSION_ID,
        mandatoryJustificationLevel: 'LOW',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Invalid mandatory justification level');
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new ConfigureDeviationThresholdsUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'missing',
        mandatoryJustificationLevel: 'HIGH',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('accepts MEDIUM as a valid level', async () => {
    const prisma = makePrisma();
    const useCase = new ConfigureDeviationThresholdsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      mandatoryJustificationLevel: 'MEDIUM',
      userId: USER_ID,
    });

    expect(result.mandatoryJustificationLevel).toBe('MEDIUM');
  });

  it('accepts CRITICAL as a valid level', async () => {
    const prisma = makePrisma();
    const useCase = new ConfigureDeviationThresholdsUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      mandatoryJustificationLevel: 'CRITICAL',
      userId: USER_ID,
    });

    expect(result.mandatoryJustificationLevel).toBe('CRITICAL');
  });
});
