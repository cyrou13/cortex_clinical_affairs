import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureCustomFilterUseCase } from './configure-custom-filter.js';

function makePrisma(overrides?: {
  sessionResult?: unknown;
  filterResult?: unknown;
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : { id: 'session-1', projectId: 'project-1' },
      ),
    },
    customAiFilter: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.filterResult !== undefined
          ? overrides.filterResult
          : {
              id: 'filter-1',
              sessionId: 'session-1',
              name: 'Pediatric filter',
              criterion: 'Include only pediatric studies',
              isActive: true,
            },
      ),
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'new-filter-1',
          isActive: true,
          ...args.data,
        }),
      ),
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'filter-1',
          sessionId: 'session-1',
          name: 'Pediatric filter',
          criterion: 'Include only pediatric studies',
          isActive: true,
          ...args.data,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'filter-1' }),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({
        id: 'task-1',
        type: 'sls:custom-filter-score',
        status: 'PENDING',
        progress: 0,
        metadata: {},
        createdBy: 'user-1',
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeMockRedis() {
  return {
    publish: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
  } as any;
}

describe('ConfigureCustomFilterUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeMockRedis>;
  let useCase: ConfigureCustomFilterUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    redis = makeMockRedis();
    useCase = new ConfigureCustomFilterUseCase(prisma, redis);
  });

  describe('createCustomFilter', () => {
    const validInput = {
      name: 'Pediatric filter',
      criterion: 'Include only pediatric studies',
    };

    it('creates a custom AI filter successfully', async () => {
      const result = await useCase.createCustomFilter('session-1', validInput, 'user-1');

      expect(result.name).toBe('Pediatric filter');
      expect(prisma.customAiFilter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-1',
            name: 'Pediatric filter',
            criterion: 'Include only pediatric studies',
          }),
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.createCustomFilter('session-1', validInput, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.customAiFilter.created',
          }),
        }),
      );
    });

    it('throws NotFoundError when session does not exist', async () => {
      prisma = makePrisma({ sessionResult: null });
      useCase = new ConfigureCustomFilterUseCase(prisma, redis);

      await expect(
        useCase.createCustomFilter('session-1', validInput, 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError for invalid input', async () => {
      await expect(
        useCase.createCustomFilter('session-1', { name: '' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('updateCustomFilter', () => {
    it('updates a custom AI filter successfully', async () => {
      const result = await useCase.updateCustomFilter('filter-1', { name: 'Updated' }, 'user-1');

      expect(prisma.customAiFilter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'filter-1' },
          data: expect.objectContaining({ name: 'Updated' }),
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.updateCustomFilter('filter-1', { isActive: false }, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.customAiFilter.updated',
          }),
        }),
      );
    });

    it('throws NotFoundError when filter does not exist', async () => {
      prisma = makePrisma({ filterResult: null });
      useCase = new ConfigureCustomFilterUseCase(prisma, redis);

      await expect(
        useCase.updateCustomFilter('filter-1', { name: 'Updated' }, 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError for invalid input', async () => {
      await expect(
        useCase.updateCustomFilter('filter-1', { name: '' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('deleteCustomFilter', () => {
    it('deletes a custom AI filter successfully', async () => {
      const result = await useCase.deleteCustomFilter('filter-1', 'user-1');

      expect(prisma.customAiFilter.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'filter-1' },
        }),
      );
      expect(result.id).toBe('filter-1');
    });

    it('creates an audit log entry', async () => {
      await useCase.deleteCustomFilter('filter-1', 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.customAiFilter.deleted',
          }),
        }),
      );
    });

    it('throws NotFoundError when filter does not exist', async () => {
      prisma = makePrisma({ filterResult: null });
      useCase = new ConfigureCustomFilterUseCase(prisma, redis);

      await expect(
        useCase.deleteCustomFilter('filter-1', 'user-1'),
      ).rejects.toThrow('not found');
    });
  });

  describe('launchCustomFilterScoring', () => {
    it('enqueues a scoring task successfully', async () => {
      const result = await useCase.launchCustomFilterScoring('session-1', 'filter-1', 'user-1');

      expect(result.taskId).toBe('task-1');
      expect(prisma.asyncTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'sls:custom-filter-score',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.launchCustomFilterScoring('session-1', 'filter-1', 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.customAiFilter.scoringLaunched',
          }),
        }),
      );
    });

    it('throws NotFoundError when session does not exist', async () => {
      prisma = makePrisma({ sessionResult: null });
      useCase = new ConfigureCustomFilterUseCase(prisma, redis);

      await expect(
        useCase.launchCustomFilterScoring('session-1', 'filter-1', 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws NotFoundError when filter does not exist', async () => {
      prisma = makePrisma({ filterResult: null });
      useCase = new ConfigureCustomFilterUseCase(prisma, redis);

      await expect(
        useCase.launchCustomFilterScoring('session-1', 'filter-1', 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when filter does not belong to session', async () => {
      prisma = makePrisma({
        filterResult: {
          id: 'filter-1',
          sessionId: 'other-session',
          name: 'Filter',
          criterion: 'criterion',
          isActive: true,
        },
      });
      useCase = new ConfigureCustomFilterUseCase(prisma, redis);

      await expect(
        useCase.launchCustomFilterScoring('session-1', 'filter-1', 'user-1'),
      ).rejects.toThrow('does not belong');
    });
  });
});
