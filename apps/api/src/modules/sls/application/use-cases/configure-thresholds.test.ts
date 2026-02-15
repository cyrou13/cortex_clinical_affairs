import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureThresholdsUseCase } from './configure-thresholds.js';

function makePrisma(overrides?: {
  sessionResult?: unknown;
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : {
              id: 'session-1',
              projectId: 'project-1',
              likelyRelevantThreshold: 75,
              uncertainLowerThreshold: 40,
            },
      ),
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'session-1',
          ...args.data,
        }),
      ),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ConfigureThresholdsUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ConfigureThresholdsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ConfigureThresholdsUseCase(prisma);
  });

  describe('configureThresholds', () => {
    it('updates thresholds successfully', async () => {
      const result = await useCase.configureThresholds('session-1', 80, 30, 'user-1');

      expect(result.likelyRelevantThreshold).toBe(80);
      expect(result.uncertainLowerThreshold).toBe(30);
      expect(prisma.slsSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: {
            likelyRelevantThreshold: 80,
            uncertainLowerThreshold: 30,
          },
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.configureThresholds('session-1', 80, 30, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            action: 'sls.session.thresholdsConfigured',
            targetType: 'slsSession',
            targetId: 'session-1',
          }),
        }),
      );
    });

    it('throws NotFoundError when session does not exist', async () => {
      prisma = makePrisma({ sessionResult: null });
      useCase = new ConfigureThresholdsUseCase(prisma);

      await expect(
        useCase.configureThresholds('session-1', 80, 30, 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when lower >= upper', async () => {
      await expect(
        useCase.configureThresholds('session-1', 50, 50, 'user-1'),
      ).rejects.toThrow();
    });

    it('throws ValidationError when lower > upper', async () => {
      await expect(
        useCase.configureThresholds('session-1', 30, 60, 'user-1'),
      ).rejects.toThrow();
    });

    it('throws ValidationError for out-of-range values', async () => {
      await expect(
        useCase.configureThresholds('session-1', 101, 40, 'user-1'),
      ).rejects.toThrow();
    });

    it('throws ValidationError for negative values', async () => {
      await expect(
        useCase.configureThresholds('session-1', 75, -1, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('getThresholds', () => {
    it('returns current thresholds', async () => {
      const result = await useCase.getThresholds('session-1');

      expect(result.likelyRelevantThreshold).toBe(75);
      expect(result.uncertainLowerThreshold).toBe(40);
    });

    it('throws NotFoundError when session does not exist', async () => {
      prisma = makePrisma({ sessionResult: null });
      useCase = new ConfigureThresholdsUseCase(prisma);

      await expect(
        useCase.getThresholds('session-1'),
      ).rejects.toThrow('not found');
    });
  });
});
