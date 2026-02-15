import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface ConfigureVigilanceDbInput {
  pmsPlanId: string;
  databases: Array<{
    databaseName: string;
    enabled: boolean;
    searchKeywords: string[];
  }>;
  userId: string;
}

interface VigilanceDbResult {
  id: string;
  pmsPlanId: string;
  databaseName: string;
  enabled: boolean;
  searchKeywords: unknown;
}

export class ConfigureVigilanceDatabasesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ConfigureVigilanceDbInput): Promise<VigilanceDbResult[]> {
    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: input.pmsPlanId },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', input.pmsPlanId);
    }

    await this.prisma.pmsPlanVigilanceDb.deleteMany({
      where: { pmsPlanId: input.pmsPlanId },
    });

    const results: VigilanceDbResult[] = [];

    for (const db of input.databases) {
      const record = await this.prisma.pmsPlanVigilanceDb.create({
        data: {
          id: crypto.randomUUID(),
          pmsPlanId: input.pmsPlanId,
          databaseName: db.databaseName,
          enabled: db.enabled,
          searchKeywords: db.searchKeywords,
        },
      });
      results.push(record);
    }

    return results;
  }
}
