import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface LinkSlsSessionsInput {
  soaAnalysisId: string;
  slsSessionIds: string[];
}

interface LinkSlsSessionsResult {
  linkedCount: number;
  skippedCount: number;
}

export class LinkSlsSessionsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LinkSlsSessionsInput): Promise<LinkSlsSessionsResult> {
    if (input.slsSessionIds.length === 0) {
      throw new ValidationError('At least one SLS session ID is required');
    }

    const soa = await (this.prisma as any).soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true, projectId: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soa.status === 'LOCKED') {
      throw new ValidationError('Cannot link sessions to a locked SOA analysis');
    }

    const sessions = await (this.prisma as any).slsSession.findMany({
      where: {
        id: { in: input.slsSessionIds },
        projectId: soa.projectId,
        status: 'LOCKED',
      },
      select: { id: true },
    });

    const lockedIds = new Set(sessions.map((s: { id: string }) => s.id));
    const invalidIds = input.slsSessionIds.filter((id) => !lockedIds.has(id));
    if (invalidIds.length > 0) {
      throw new ValidationError(
        `Sessions not found or not locked: ${invalidIds.join(', ')}`,
      );
    }

    const existingLinks = await (this.prisma as any).soaSlsLink.findMany({
      where: { soaAnalysisId: input.soaAnalysisId },
      select: { slsSessionId: true },
    });

    const alreadyLinked = new Set(
      existingLinks.map((l: { slsSessionId: string }) => l.slsSessionId),
    );

    let linkedCount = 0;
    let skippedCount = 0;

    for (const sessionId of input.slsSessionIds) {
      if (alreadyLinked.has(sessionId)) {
        skippedCount++;
        continue;
      }
      await (this.prisma as any).soaSlsLink.create({
        data: {
          id: crypto.randomUUID(),
          soaAnalysisId: input.soaAnalysisId,
          slsSessionId: sessionId,
        },
      });
      linkedCount++;
    }

    return { linkedCount, skippedCount };
  }
}
