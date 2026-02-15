import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError, UpstreamNotLockedError } from '../../../../shared/errors/index.js';

interface LinkUpstreamInput {
  cerVersionId: string;
  moduleType: string;
  moduleId: string;
  userId: string;
}

interface LinkUpstreamResult {
  linkId: string;
  cerVersionId: string;
  moduleType: string;
  moduleId: string;
  lockedAt: string;
}

const VALID_MODULE_TYPES = ['SLS', 'SOA', 'VALIDATION'] as const;

export class LinkUpstreamUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LinkUpstreamInput): Promise<LinkUpstreamResult> {
    const { cerVersionId, moduleType, moduleId, userId } = input;

    // Validate module type
    if (!VALID_MODULE_TYPES.includes(moduleType as (typeof VALID_MODULE_TYPES)[number])) {
      throw new ValidationError(`Invalid upstream module type: ${moduleType}`);
    }

    // Check CER version exists and is not locked
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true, status: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    if (cerVersion.status === 'LOCKED') {
      throw new ValidationError('Cannot link upstream module to a locked CER version');
    }

    // Verify the upstream module exists and is locked
    const module = await this.findLockedModule(moduleType, moduleId);

    if (!module) {
      throw new NotFoundError(moduleType, moduleId);
    }

    if (module.status !== 'LOCKED') {
      throw new UpstreamNotLockedError(moduleType);
    }

    // Check for duplicate link
    const existingLink = await (this.prisma as any).cerUpstreamLink.findFirst({
      where: {
        cerVersionId,
        moduleType,
        moduleId,
      },
    });

    if (existingLink) {
      throw new ValidationError(
        `Upstream module ${moduleType}:${moduleId} is already linked to this CER version`,
      );
    }

    // Create link
    const linkId = crypto.randomUUID();
    const lockedAt = new Date(module.lockedAt).toISOString();

    await (this.prisma as any).cerUpstreamLink.create({
      data: {
        id: linkId,
        cerVersionId,
        moduleType,
        moduleId,
        lockedAt,
      },
    });

    return {
      linkId,
      cerVersionId,
      moduleType,
      moduleId,
      lockedAt,
    };
  }

  private async findLockedModule(
    moduleType: string,
    moduleId: string,
  ): Promise<{ id: string; status: string; lockedAt: Date } | null> {
    switch (moduleType) {
      case 'SLS':
        return (this.prisma as any).slsSession.findUnique({
          where: { id: moduleId },
          select: { id: true, status: true, lockedAt: true },
        });
      case 'SOA':
        return (this.prisma as any).soaAnalysis.findUnique({
          where: { id: moduleId },
          select: { id: true, status: true, lockedAt: true },
        });
      case 'VALIDATION':
        return (this.prisma as any).validationStudy.findUnique({
          where: { id: moduleId },
          select: { id: true, status: true, lockedAt: true },
        });
      default:
        return null;
    }
  }
}
