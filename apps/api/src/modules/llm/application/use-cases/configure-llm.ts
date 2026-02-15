import type { PrismaClient, Prisma } from '@prisma/client';
import { CreateLlmConfigInput, UpdateLlmConfigInput } from '@cortex/shared';
import { ValidationError } from '../../../../shared/errors/index.js';

export class ConfigureLlmUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: unknown, userId: string) {
    const parsed = CreateLlmConfigInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { level, projectId, taskType, provider, model } = parsed.data;

    const config = await this.prisma.llmConfig.create({
      data: {
        level,
        projectId: projectId ?? null,
        taskType: taskType ?? null,
        provider,
        model,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'llm_config.created',
        targetType: 'llm_config',
        targetId: config.id,
        after: { level, projectId, taskType, provider, model } as unknown as Prisma.InputJsonValue,
      },
    });

    return config;
  }

  async update(id: string, input: unknown, userId: string) {
    const parsed = UpdateLlmConfigInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const existing = await this.prisma.llmConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError(`LLM config with id '${id}' not found`);
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.provider !== undefined) data.provider = parsed.data.provider;
    if (parsed.data.model !== undefined) data.model = parsed.data.model;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    const updated = await this.prisma.llmConfig.update({
      where: { id },
      data,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'llm_config.updated',
        targetType: 'llm_config',
        targetId: id,
        before: { provider: existing.provider, model: existing.model, isActive: existing.isActive } as Prisma.InputJsonValue,
        after: data as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async softDelete(id: string, userId: string) {
    const existing = await this.prisma.llmConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError(`LLM config with id '${id}' not found`);
    }

    const deleted = await this.prisma.llmConfig.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'llm_config.deleted',
        targetType: 'llm_config',
        targetId: id,
        before: { isActive: true } as Prisma.InputJsonValue,
        after: { isActive: false } as Prisma.InputJsonValue,
      },
    });

    return deleted;
  }
}
