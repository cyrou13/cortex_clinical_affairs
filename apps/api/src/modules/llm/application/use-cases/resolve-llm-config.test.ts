import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolveLlmConfigUseCase } from './resolve-llm-config.js';

function makePrisma() {
  return {
    llmConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  } as any;
}

const systemConfig = {
  id: 'system-1',
  level: 'SYSTEM',
  projectId: null,
  taskType: null,
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const projectConfig = {
  id: 'project-1',
  level: 'PROJECT',
  projectId: 'proj-123',
  taskType: null,
  provider: 'openai',
  model: 'gpt-4o',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const taskConfig = {
  id: 'task-1',
  level: 'TASK',
  projectId: null,
  taskType: 'scoring',
  provider: 'claude',
  model: 'claude-haiku-4-20250414',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ResolveLlmConfigUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ResolveLlmConfigUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ResolveLlmConfigUseCase(prisma);
  });

  it('resolves task-level config with highest priority', async () => {
    prisma.llmConfig.findFirst.mockResolvedValueOnce(taskConfig);

    const result = await useCase.execute('scoring');

    expect(result).toEqual(taskConfig);
    expect(result!.level).toBe('TASK');
  });

  it('falls back to project-level when no task config', async () => {
    prisma.llmConfig.findFirst
      .mockResolvedValueOnce(null) // Task level miss
      .mockResolvedValueOnce(projectConfig); // Project level hit

    const result = await useCase.execute('scoring', 'proj-123');

    expect(result).toEqual(projectConfig);
    expect(result!.level).toBe('PROJECT');
  });

  it('falls back to system-level when no task or project config', async () => {
    prisma.llmConfig.findFirst
      .mockResolvedValueOnce(null) // Task level miss
      .mockResolvedValueOnce(null) // Project level miss
      .mockResolvedValueOnce(systemConfig); // System level hit

    const result = await useCase.execute('scoring', 'proj-123');

    expect(result).toEqual(systemConfig);
    expect(result!.level).toBe('SYSTEM');
  });

  it('skips project level when no projectId', async () => {
    prisma.llmConfig.findFirst
      .mockResolvedValueOnce(null) // Task level miss
      .mockResolvedValueOnce(systemConfig); // System level hit

    const result = await useCase.execute('scoring');

    expect(result).toEqual(systemConfig);
    // Should have been called twice (task, system) not three times
    expect(prisma.llmConfig.findFirst).toHaveBeenCalledTimes(2);
  });

  it('returns null when no config exists at any level', async () => {
    prisma.llmConfig.findFirst.mockResolvedValue(null);

    const result = await useCase.execute('scoring');
    expect(result).toBeNull();
  });

  it('queries with correct where clause for task level', async () => {
    prisma.llmConfig.findFirst.mockResolvedValueOnce(taskConfig);

    await useCase.execute('scoring');

    expect(prisma.llmConfig.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          level: 'TASK',
          taskType: 'scoring',
          isActive: true,
        }),
      }),
    );
  });

  it('queries with correct where clause for project level', async () => {
    prisma.llmConfig.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(projectConfig);

    await useCase.execute('extraction', 'proj-123');

    expect(prisma.llmConfig.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          level: 'PROJECT',
          projectId: 'proj-123',
          isActive: true,
        }),
      }),
    );
  });
});
