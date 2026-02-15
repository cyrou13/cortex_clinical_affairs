import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface PopulateGapRegistryResult {
  pmsPlanId: string;
  populated: number;
  duplicates: number;
  totalGaps: number;
}

export class PopulateGapRegistryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(pmsPlanId: string, _userId: string): Promise<PopulateGapRegistryResult> {
    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: pmsPlanId },
      select: { id: true, cerVersionId: true },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', pmsPlanId);
    }

    let populated = 0;
    let duplicates = 0;

    const existingGaps = await this.prisma.gapRegistryEntry.findMany({
      where: { pmsPlanId },
      select: { sourceModule: true, sourceId: true },
    });

    const existingKeys = new Set(
      existingGaps.map(
        (g: { sourceModule: string; sourceId: string }) => `${g.sourceModule}:${g.sourceId}`,
      ),
    );

    const soaOpenQuestions =
      (await this.prisma.soaOpenQuestion?.findMany?.({
        where: { cerVersionId: plan.cerVersionId },
      })) ?? [];

    for (const question of soaOpenQuestions) {
      const key = `SOA:${question.id}`;
      if (existingKeys.has(key)) {
        duplicates++;
        continue;
      }
      await this.prisma.gapRegistryEntry.create({
        data: {
          id: crypto.randomUUID(),
          pmsPlanId,
          sourceModule: 'SOA',
          sourceId: question.id,
          description: question.description ?? 'SOA open question',
          severity: 'MEDIUM',
          recommendedActivity: 'LITERATURE_UPDATE',
          status: 'OPEN',
          manuallyCreated: false,
        },
      });
      populated++;
    }

    const totalGaps = await this.prisma.gapRegistryEntry.count({
      where: { pmsPlanId },
    });

    return { pmsPlanId, populated, duplicates, totalGaps };
  }
}
