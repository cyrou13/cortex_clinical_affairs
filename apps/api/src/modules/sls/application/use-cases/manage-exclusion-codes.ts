import type { PrismaClient, Prisma } from '@prisma/client';
import { AddExclusionCodeInput, RenameExclusionCodeInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export class ManageExclusionCodesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async addExclusionCode(sessionId: string, input: unknown, userId: string) {
    const parsed = AddExclusionCodeInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { code, label, shortCode, description } = parsed.data;

    // Validate session exists
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Validate code uniqueness within session
    const existingCode = await (this.prisma as any).exclusionCode.findFirst({
      where: { sessionId, code },
    });

    if (existingCode) {
      throw new ValidationError(`Exclusion code '${code}' already exists in this session`);
    }

    // Validate shortCode uniqueness within session
    const existingShortCode = await (this.prisma as any).exclusionCode.findFirst({
      where: { sessionId, shortCode },
    });

    if (existingShortCode) {
      throw new ValidationError(`Short code '${shortCode}' already exists in this session`);
    }

    // Get max displayOrder
    const maxOrderResult = await (this.prisma as any).exclusionCode.findFirst({
      where: { sessionId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const displayOrder = (maxOrderResult?.displayOrder ?? -1) + 1;

    const created = await (this.prisma as any).exclusionCode.create({
      data: {
        sessionId,
        code,
        label,
        shortCode,
        description: description ?? null,
        displayOrder,
      },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.exclusionCode.added',
        targetType: 'exclusionCode',
        targetId: created.id,
        after: { code, label, shortCode, description, sessionId } as unknown as Prisma.InputJsonValue,
      },
    });

    return created;
  }

  async renameExclusionCode(codeId: string, input: unknown, userId: string) {
    const parsed = RenameExclusionCodeInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { label, shortCode } = parsed.data;

    // Find existing code
    const existing = await (this.prisma as any).exclusionCode.findUnique({
      where: { id: codeId },
    });

    if (!existing) {
      throw new NotFoundError('ExclusionCode', codeId);
    }

    // Validate shortCode uniqueness if changing it
    if (shortCode && shortCode !== existing.shortCode) {
      const existingShortCode = await (this.prisma as any).exclusionCode.findFirst({
        where: {
          sessionId: existing.sessionId,
          shortCode,
          id: { not: codeId },
        },
      });

      if (existingShortCode) {
        throw new ValidationError(`Short code '${shortCode}' already exists in this session`);
      }
    }

    const updateData: Record<string, unknown> = { label };
    if (shortCode !== undefined) {
      updateData.shortCode = shortCode;
    }

    const updated = await (this.prisma as any).exclusionCode.update({
      where: { id: codeId },
      data: updateData,
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.exclusionCode.renamed',
        targetType: 'exclusionCode',
        targetId: codeId,
        before: { label: existing.label, shortCode: existing.shortCode } as unknown as Prisma.InputJsonValue,
        after: { label, shortCode: shortCode ?? existing.shortCode } as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async hideExclusionCode(codeId: string, userId: string) {
    const existing = await (this.prisma as any).exclusionCode.findUnique({
      where: { id: codeId },
    });

    if (!existing) {
      throw new NotFoundError('ExclusionCode', codeId);
    }

    const updated = await (this.prisma as any).exclusionCode.update({
      where: { id: codeId },
      data: { isHidden: true },
    });

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.exclusionCode.hidden',
        targetType: 'exclusionCode',
        targetId: codeId,
        before: { isHidden: false } as unknown as Prisma.InputJsonValue,
        after: { isHidden: true } as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async reorderExclusionCodes(sessionId: string, orderedIds: string[], userId: string) {
    // Validate session exists
    const session = await (this.prisma as any).slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Validate all IDs belong to this session
    const codes = await (this.prisma as any).exclusionCode.findMany({
      where: { sessionId, id: { in: orderedIds } },
    });

    if (codes.length !== orderedIds.length) {
      throw new ValidationError('Some exclusion code IDs do not belong to this session');
    }

    // Update displayOrder for each code
    const updates = orderedIds.map((id, index) =>
      (this.prisma as any).exclusionCode.update({
        where: { id },
        data: { displayOrder: index },
      }),
    );

    await Promise.all(updates);

    // Audit log
    void this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.exclusionCodes.reordered',
        targetType: 'slsSession',
        targetId: sessionId,
        after: { orderedIds } as unknown as Prisma.InputJsonValue,
      },
    });

    // Return updated codes sorted by displayOrder
    return (this.prisma as any).exclusionCode.findMany({
      where: { sessionId },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
