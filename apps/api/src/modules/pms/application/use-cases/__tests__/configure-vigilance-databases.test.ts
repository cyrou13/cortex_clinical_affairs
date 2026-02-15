import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ConfigureVigilanceDatabasesUseCase } from '../configure-vigilance-databases.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsPlan: {
      findUnique: vi.fn().mockResolvedValue({ id: 'plan-1' }),
    },
    pmsPlanVigilanceDb: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: args.data.id,
          pmsPlanId: args.data.pmsPlanId,
          databaseName: args.data.databaseName,
          enabled: args.data.enabled,
          searchKeywords: args.data.searchKeywords,
        }),
      ),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('ConfigureVigilanceDatabasesUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ConfigureVigilanceDatabasesUseCase;

  const validInput = {
    pmsPlanId: 'plan-1',
    databases: [
      {
        databaseName: 'EUDAMED',
        enabled: true,
        searchKeywords: ['hip implant', 'adverse event'],
      },
      {
        databaseName: 'MAUDE',
        enabled: false,
        searchKeywords: ['orthopedic'],
      },
    ],
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ConfigureVigilanceDatabasesUseCase(prisma);
  });

  it('configures vigilance databases successfully', async () => {
    const result = await useCase.execute(validInput);

    expect(result).toHaveLength(2);
    expect(result[0].databaseName).toBe('EUDAMED');
    expect(result[0].enabled).toBe(true);
    expect(result[1].databaseName).toBe('MAUDE');
    expect(result[1].enabled).toBe(false);
  });

  it('deletes existing databases before creating new ones', async () => {
    await useCase.execute(validInput);

    expect(prisma.pmsPlanVigilanceDb.deleteMany).toHaveBeenCalledWith({
      where: { pmsPlanId: 'plan-1' },
    });

    const deleteOrder = prisma.pmsPlanVigilanceDb.deleteMany.mock.invocationCallOrder[0];
    const createOrder = prisma.pmsPlanVigilanceDb.create.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it('creates a record for each database in the input', async () => {
    await useCase.execute(validInput);

    expect(prisma.pmsPlanVigilanceDb.create).toHaveBeenCalledTimes(2);

    expect(prisma.pmsPlanVigilanceDb.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          databaseName: 'EUDAMED',
          enabled: true,
          searchKeywords: ['hip implant', 'adverse event'],
        }),
      }),
    );

    expect(prisma.pmsPlanVigilanceDb.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsPlanId: 'plan-1',
          databaseName: 'MAUDE',
          enabled: false,
          searchKeywords: ['orthopedic'],
        }),
      }),
    );
  });

  it('returns results with pmsPlanId set for each entry', async () => {
    const result = await useCase.execute(validInput);

    for (const entry of result) {
      expect(entry.pmsPlanId).toBe('plan-1');
    }
  });

  it('handles empty databases array', async () => {
    const result = await useCase.execute({
      pmsPlanId: 'plan-1',
      databases: [],
      userId: 'user-1',
    });

    expect(result).toHaveLength(0);
    expect(prisma.pmsPlanVigilanceDb.deleteMany).toHaveBeenCalled();
    expect(prisma.pmsPlanVigilanceDb.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when plan does not exist', async () => {
    prisma = makePrisma({
      pmsPlan: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new ConfigureVigilanceDatabasesUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('generates unique IDs for each database record', async () => {
    await useCase.execute(validInput);

    const calls = prisma.pmsPlanVigilanceDb.create.mock.calls;
    const ids = calls.map((c: any) => c[0].data.id);

    expect(ids[0]).toBeDefined();
    expect(ids[1]).toBeDefined();
    expect(ids[0]).not.toBe(ids[1]);
  });
});
