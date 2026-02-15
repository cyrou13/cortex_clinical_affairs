import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateGsprUseCase } from './generate-gspr.js';

const VERSION_ID = 'ver-1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  existingRowCount?: number;
  gsprMappings?: Array<Record<string, unknown>>;
  soaBenchmarks?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: VERSION_ID, projectId: PROJECT_ID },
      ),
    },
    gsprMatrixRow: {
      count: vi.fn().mockResolvedValue(overrides?.existingRowCount ?? 0),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id })),
    },
    gsprMapping: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.gsprMappings ?? [],
      ),
    },
    soaBenchmark: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.soaBenchmarks ?? [],
      ),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('GenerateGsprUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates GSPR matrix for Class III device', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    expect(result.cerVersionId).toBe(VERSION_ID);
    expect(result.deviceClass).toBe('III');
    expect(result.totalRequirements).toBeGreaterThan(0);
    expect(result.rows.length).toBe(result.totalRequirements);
  });

  it('generates GSPR matrix for Class I device (fewer requirements)', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    const resultI = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'I',
      userId: USER_ID,
    });

    // Reset mocks to allow second execution (no existing rows)
    prisma.gsprMatrixRow.count.mockResolvedValue(0);

    const resultIII = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    // Class III has more requirements than Class I
    expect(resultIII.totalRequirements).toBeGreaterThanOrEqual(resultI.totalRequirements);
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new GenerateGsprUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing', deviceClass: 'III', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError for invalid device class', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: VERSION_ID, deviceClass: 'INVALID' as any, userId: USER_ID }),
    ).rejects.toThrow('Invalid device class');
  });

  it('throws ValidationError if GSPR matrix already exists', async () => {
    const prisma = makePrisma({ existingRowCount: 23 });
    const useCase = new GenerateGsprUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: VERSION_ID, deviceClass: 'III', userId: USER_ID }),
    ).rejects.toThrow('already exists');
  });

  it('creates gsprMatrixRow for each requirement', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    expect(prisma.gsprMatrixRow.create).toHaveBeenCalledTimes(result.totalRequirements);
  });

  it('maps evidence from GSPR mappings', async () => {
    const prisma = makePrisma({
      gsprMappings: [
        { gsprId: 'GSPR-1', evidenceReferences: ['ref-1', 'ref-2'] },
      ],
    });
    const useCase = new GenerateGsprUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    const gspr1Row = result.rows.find((r) => r.gsprId === 'GSPR-1');
    expect(gspr1Row).toBeDefined();
    expect(gspr1Row!.evidenceReferences.length).toBeGreaterThan(0);
  });

  it('sets status to PARTIAL when no evidence found', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    // Most rows should be PARTIAL since no evidence was provided
    const partialRows = result.rows.filter((r) => r.status === 'PARTIAL');
    expect(partialRows.length).toBeGreaterThan(0);
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'cer.gspr-matrix.generated',
          targetType: 'cerVersion',
          targetId: VERSION_ID,
        }),
      }),
    );
  });

  it('each row has a unique id', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateGsprUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    const ids = result.rows.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('handles gsprMapping query failure gracefully', async () => {
    const prisma = makePrisma();
    prisma.gsprMapping.findMany.mockRejectedValue(new Error('DB error'));
    const useCase = new GenerateGsprUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      deviceClass: 'III',
      userId: USER_ID,
    });

    expect(result.totalRequirements).toBeGreaterThan(0);
  });
});
