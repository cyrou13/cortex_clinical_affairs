import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface LinkFindingToSectionInput {
  findingId: string;
  cerSectionId: string;
  userId: string;
}

interface LinkFindingToSectionResult {
  linkId: string;
  findingId: string;
  cerSectionId: string;
}

export class LinkFindingToSectionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LinkFindingToSectionInput): Promise<LinkFindingToSectionResult> {
    const { findingId, cerSectionId, userId } = input;

    // Verify finding exists
    const finding = await (this.prisma as any).vigilanceFinding.findUnique({
      where: { id: findingId },
      select: { id: true },
    });

    if (!finding) {
      throw new NotFoundError('VigilanceFinding', findingId);
    }

    // Verify section exists
    const section = await this.prisma.cerSection.findUnique({
      where: { id: cerSectionId },
      select: {
        id: true,
        cerVersion: { select: { id: true, status: true } },
      },
    });

    if (!section) {
      throw new NotFoundError('CerSection', cerSectionId);
    }

    if (section.cerVersion?.status === 'LOCKED') {
      throw new ValidationError('Cannot link finding to a section on a locked CER version');
    }

    // Check for duplicate
    const existingLink = await (this.prisma as any).vigilanceFindingSectionLink.findFirst({
      where: { findingId, cerSectionId },
    });

    if (existingLink) {
      throw new ValidationError('Finding is already linked to this section');
    }

    // Create link
    const linkId = crypto.randomUUID();

    await (this.prisma as any).vigilanceFindingSectionLink.create({
      data: {
        id: linkId,
        findingId,
        cerSectionId,
        createdById: userId,
      },
    });

    return {
      linkId,
      findingId,
      cerSectionId,
    };
  }
}
