import type { PrismaClient } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  UpstreamNotLockedError,
} from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { isValidContext } from '../../domain/value-objects/regulatory-context.js';
import {
  isValidVersionType,
  getNextVersionNumber,
} from '../../domain/value-objects/version-type.js';
import type { VersionType } from '../../domain/value-objects/version-type.js';
import { createCerCreatedEvent } from '../../domain/events/cer-created.js';

interface CreateCerInput {
  projectId: string;
  regulatoryContext: string;
  versionType: string;
  currentVersion?: string;
  userId: string;
}

interface CreateCerResult {
  cerVersionId: string;
  versionNumber: string;
  regulatoryContext: string;
  upstreamLinksCount: number;
}

export class CreateCerUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateCerInput): Promise<CreateCerResult> {
    const { projectId, regulatoryContext, versionType, currentVersion, userId } = input;

    // Validate inputs
    if (!isValidContext(regulatoryContext)) {
      throw new ValidationError(`Invalid regulatory context: ${regulatoryContext}`);
    }

    if (!isValidVersionType(versionType)) {
      throw new ValidationError(`Invalid version type: ${versionType}`);
    }

    // Check project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Verify upstream modules are locked
    const slsSessions = await this.prisma.slsSession.findMany({
      where: { projectId, status: 'LOCKED' },
      select: { id: true, lockedAt: true },
    });

    if (slsSessions.length === 0) {
      throw new UpstreamNotLockedError('SLS');
    }

    const soaAnalyses = await this.prisma.soaAnalysis.findMany({
      where: { projectId, status: 'LOCKED' },
      select: { id: true, lockedAt: true },
    });

    if (soaAnalyses.length === 0) {
      throw new UpstreamNotLockedError('SOA');
    }

    const validationStudies = await this.prisma.validationStudy.findMany({
      where: { projectId, status: 'LOCKED' },
      select: { id: true, lockedAt: true },
    });

    if (validationStudies.length === 0) {
      throw new UpstreamNotLockedError('VALIDATION');
    }

    // Calculate version number
    const versionNumber = getNextVersionNumber(
      currentVersion ?? '0.0.0',
      versionType as VersionType,
    );

    // Create CER version
    const cerVersionId = crypto.randomUUID();
    await this.prisma.cerVersion.create({
      data: {
        id: cerVersionId,
        projectId,
        regulatoryContext,
        versionType,
        versionNumber,
        status: 'DRAFT',
        createdById: userId,
      },
    });

    // Create upstream links
    const upstreamLinks: Array<{ moduleType: string; moduleId: string; lockedAt: string }> = [];

    for (const sls of slsSessions) {
      upstreamLinks.push({
        moduleType: 'SLS',
        moduleId: sls.id,
        lockedAt: new Date(sls.lockedAt).toISOString(),
      });
    }

    for (const soa of soaAnalyses) {
      upstreamLinks.push({
        moduleType: 'SOA',
        moduleId: soa.id,
        lockedAt: new Date(soa.lockedAt).toISOString(),
      });
    }

    for (const val of validationStudies) {
      upstreamLinks.push({
        moduleType: 'VALIDATION',
        moduleId: val.id,
        lockedAt: new Date(val.lockedAt).toISOString(),
      });
    }

    for (const link of upstreamLinks) {
      await this.prisma.cerUpstreamLink.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId,
          moduleType: link.moduleType,
          moduleId: link.moduleId,
          lockedAt: link.lockedAt,
        },
      });
    }

    // Emit event
    const event = createCerCreatedEvent(cerVersionId, projectId, regulatoryContext, userId);
    void this.eventBus.publish(event);

    return {
      cerVersionId,
      versionNumber,
      regulatoryContext,
      upstreamLinksCount: upstreamLinks.length,
    };
  }
}
