import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import {
  parseVersion,
  incrementMinor,
  formatVersion,
} from '../../domain/value-objects/protocol-version.js';

interface AmendProtocolInput {
  protocolId: string;
  reason: string;
  userId: string;
  summary?: string;
  endpoints?: string;
  sampleSizeJustification?: string;
  statisticalStrategy?: string;
}

interface AmendProtocolResult {
  protocolId: string;
  fromVersion: string;
  toVersion: string;
  amendmentId: string;
  status: string;
}

export class AmendProtocolUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: AmendProtocolInput): Promise<AmendProtocolResult> {
    const { protocolId, reason, userId } = input;

    if (!reason.trim()) {
      throw new ValidationError('Amendment reason is required');
    }

    const protocol = await this.prisma.protocol.findUnique({
      where: { id: protocolId },
      select: {
        id: true,
        version: true,
        status: true,
        validationStudyId: true,
        summary: true,
        endpoints: true,
        sampleSizeJustification: true,
        statisticalStrategy: true,
      },
    });

    if (!protocol) {
      throw new NotFoundError('Protocol', protocolId);
    }

    if (protocol.status !== 'APPROVED' && protocol.status !== 'AMENDED') {
      throw new ValidationError('Only approved or previously amended protocols can be amended');
    }

    // Verify the parent study is not locked
    const study = await this.prisma.validationStudy.findUnique({
      where: { id: protocol.validationStudyId },
      select: { id: true, status: true },
    });

    if (study && study.status === 'LOCKED') {
      throw new ValidationError('Cannot amend protocol for a locked validation study');
    }

    const currentVersion = parseVersion(protocol.version);
    const newVersion = incrementMinor(currentVersion);
    const newVersionStr = formatVersion(newVersion);

    // Update protocol
    await this.prisma.protocol.update({
      where: { id: protocolId },
      data: {
        version: newVersionStr,
        status: 'AMENDED',
        summary: input.summary ?? protocol.summary,
        endpoints: input.endpoints ?? protocol.endpoints,
        sampleSizeJustification: input.sampleSizeJustification ?? protocol.sampleSizeJustification,
        statisticalStrategy: input.statisticalStrategy ?? protocol.statisticalStrategy,
        updatedAt: new Date(),
      },
    });

    // Create amendment record
    const amendmentId = crypto.randomUUID();
    await this.prisma.protocolAmendment.create({
      data: {
        id: amendmentId,
        protocolId,
        fromVersion: protocol.version,
        toVersion: newVersionStr,
        reason: reason.trim(),
        createdById: userId,
      },
    });

    return {
      protocolId,
      fromVersion: protocol.version,
      toVersion: newVersionStr,
      amendmentId,
      status: 'AMENDED',
    };
  }
}
