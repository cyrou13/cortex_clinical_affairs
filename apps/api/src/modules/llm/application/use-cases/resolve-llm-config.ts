import type { PrismaClient } from '@prisma/client';

interface ResolvedConfig {
  id: string;
  level: string;
  projectId: string | null;
  taskType: string | null;
  provider: string;
  model: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ResolveLlmConfigUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves the LLM config using a 3-level override strategy:
   * 1. TASK level (taskType match) — highest priority
   * 2. PROJECT level (projectId match)
   * 3. SYSTEM level — default fallback
   */
  async execute(taskType: string, projectId?: string): Promise<ResolvedConfig | null> {
    // Level 1: Task-level config (most specific)
    if (taskType) {
      const taskConfig = await this.prisma.llmConfig.findFirst({
        where: {
          level: 'TASK',
          taskType,
          isActive: true,
          ...(projectId ? { projectId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      if (taskConfig) return taskConfig;
    }

    // Level 2: Project-level config
    if (projectId) {
      const projectConfig = await this.prisma.llmConfig.findFirst({
        where: {
          level: 'PROJECT',
          projectId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (projectConfig) return projectConfig;
    }

    // Level 3: System-level config (default)
    const systemConfig = await this.prisma.llmConfig.findFirst({
      where: {
        level: 'SYSTEM',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return systemConfig ?? null;
  }
}
