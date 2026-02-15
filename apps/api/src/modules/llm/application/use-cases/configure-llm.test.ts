import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureLlmUseCase } from './configure-llm.js';

function makePrisma() {
  return {
    llmConfig: {
      create: vi.fn().mockResolvedValue({
        id: 'config-uuid-1',
        level: 'SYSTEM',
        projectId: null,
        taskType: null,
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'config-uuid-1',
        level: 'SYSTEM',
        projectId: null,
        taskType: null,
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: 'config-uuid-1',
        level: 'SYSTEM',
        projectId: null,
        taskType: null,
        provider: 'openai',
        model: 'gpt-4o',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ConfigureLlmUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ConfigureLlmUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ConfigureLlmUseCase(prisma);
  });

  describe('create', () => {
    it('creates a system-level LLM config', async () => {
      const result = await useCase.create({
        level: 'SYSTEM',
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
      }, 'user-1');

      expect(result.id).toBe('config-uuid-1');
      expect(prisma.llmConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: 'SYSTEM',
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
          }),
        }),
      );
    });

    it('creates a project-level LLM config', async () => {
      await useCase.create({
        level: 'PROJECT',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        provider: 'openai',
        model: 'gpt-4o',
      }, 'user-1');

      expect(prisma.llmConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: 'PROJECT',
            projectId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        }),
      );
    });

    it('creates a task-level LLM config', async () => {
      await useCase.create({
        level: 'TASK',
        taskType: 'scoring',
        provider: 'claude',
        model: 'claude-haiku-4-20250414',
      }, 'user-1');

      expect(prisma.llmConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: 'TASK',
            taskType: 'scoring',
          }),
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.create({
        level: 'SYSTEM',
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
      }, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            action: 'llm_config.created',
            targetType: 'llm_config',
          }),
        }),
      );
    });

    it('rejects invalid provider', async () => {
      await expect(
        useCase.create({
          level: 'SYSTEM',
          provider: 'gemini',
          model: 'gemini-pro',
        }, 'user-1'),
      ).rejects.toThrow();
    });

    it('rejects PROJECT level without projectId', async () => {
      await expect(
        useCase.create({
          level: 'PROJECT',
          provider: 'claude',
          model: 'claude-sonnet-4-20250514',
        }, 'user-1'),
      ).rejects.toThrow();
    });

    it('rejects TASK level without taskType', async () => {
      await expect(
        useCase.create({
          level: 'TASK',
          provider: 'claude',
          model: 'claude-sonnet-4-20250514',
        }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('updates an existing config', async () => {
      const result = await useCase.update('config-uuid-1', {
        provider: 'openai',
        model: 'gpt-4o',
      }, 'user-1');

      expect(result.provider).toBe('openai');
      expect(prisma.llmConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-uuid-1' },
          data: expect.objectContaining({
            provider: 'openai',
            model: 'gpt-4o',
          }),
        }),
      );
    });

    it('creates audit log for update', async () => {
      await useCase.update('config-uuid-1', { provider: 'openai' }, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'llm_config.updated',
          }),
        }),
      );
    });

    it('throws when config not found', async () => {
      prisma.llmConfig.findUnique.mockResolvedValue(null);

      await expect(
        useCase.update('nonexistent', { provider: 'openai' }, 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('rejects empty update', async () => {
      await expect(
        useCase.update('config-uuid-1', {}, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('softDelete', () => {
    it('soft deletes a config by setting isActive to false', async () => {
      prisma.llmConfig.update.mockResolvedValue({
        id: 'config-uuid-1',
        isActive: false,
      });

      const result = await useCase.softDelete('config-uuid-1', 'user-1');

      expect(prisma.llmConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-uuid-1' },
          data: { isActive: false },
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it('creates audit log for deletion', async () => {
      prisma.llmConfig.update.mockResolvedValue({ id: 'config-uuid-1', isActive: false });

      await useCase.softDelete('config-uuid-1', 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'llm_config.deleted',
          }),
        }),
      );
    });

    it('throws when config not found', async () => {
      prisma.llmConfig.findUnique.mockResolvedValue(null);

      await expect(
        useCase.softDelete('nonexistent', 'user-1'),
      ).rejects.toThrow('not found');
    });
  });
});
