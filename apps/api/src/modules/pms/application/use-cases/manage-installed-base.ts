import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface InstalledBaseInput {
  pmsCycleId: string;
  periodStart: string;
  periodEnd: string;
  totalUnitsShipped: number;
  activeDevices: number;
  regionBreakdown?: Record<string, number>;
  userId: string;
}

interface InstalledBaseResult {
  id: string;
  pmsCycleId: string;
  periodStart: Date;
  periodEnd: Date;
  totalUnitsShipped: number;
  activeDevices: number;
  regionBreakdown: unknown;
}

export class ManageInstalledBaseUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: InstalledBaseInput): Promise<InstalledBaseResult> {
    const cycle = await (this.prisma as any).pmsCycle.findUnique({
      where: { id: input.pmsCycleId },
      select: { id: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', input.pmsCycleId);
    }

    if (input.totalUnitsShipped < 0 || input.activeDevices < 0) {
      throw new ValidationError('Unit counts must be non-negative');
    }

    const entry = await (this.prisma as any).installedBaseEntry.create({
      data: {
        id: crypto.randomUUID(),
        pmsCycleId: input.pmsCycleId,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        totalUnitsShipped: input.totalUnitsShipped,
        activeDevices: input.activeDevices,
        regionBreakdown: input.regionBreakdown ?? null,
        source: 'MANUAL',
      },
    });

    return entry;
  }

  async update(entryId: string, input: Partial<InstalledBaseInput>): Promise<InstalledBaseResult> {
    const entry = await (this.prisma as any).installedBaseEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('InstalledBaseEntry', entryId);
    }

    const updateData: Record<string, unknown> = {};
    if (input.periodStart !== undefined) updateData.periodStart = new Date(input.periodStart);
    if (input.periodEnd !== undefined) updateData.periodEnd = new Date(input.periodEnd);
    if (input.totalUnitsShipped !== undefined) updateData.totalUnitsShipped = input.totalUnitsShipped;
    if (input.activeDevices !== undefined) updateData.activeDevices = input.activeDevices;
    if (input.regionBreakdown !== undefined) updateData.regionBreakdown = input.regionBreakdown;

    return (this.prisma as any).installedBaseEntry.update({
      where: { id: entryId },
      data: updateData,
    });
  }

  async delete(entryId: string): Promise<{ deleted: boolean }> {
    await (this.prisma as any).installedBaseEntry.delete({
      where: { id: entryId },
    });
    return { deleted: true };
  }

  async list(pmsCycleId: string): Promise<InstalledBaseResult[]> {
    return (this.prisma as any).installedBaseEntry.findMany({
      where: { pmsCycleId },
      orderBy: { periodStart: 'asc' },
    });
  }
}
