import { ValidationError } from '../../../../shared/errors/index.js';
import {
  createInitialVersion,
  incrementMinor,
  formatVersion,
  parseVersion,
} from '../value-objects/protocol-version.js';

export const PROTOCOL_STATUSES = ['DRAFT', 'APPROVED', 'AMENDED'] as const;
export type ProtocolStatus = (typeof PROTOCOL_STATUSES)[number];

const VALID_PROTOCOL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['AMENDED'],
  AMENDED: ['APPROVED'],
};

export interface ProtocolData {
  id: string;
  validationStudyId: string;
  version: string;
  status: ProtocolStatus;
  summary: string | null;
  endpoints: string | null;
  sampleSizeJustification: string | null;
  statisticalStrategy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolAmendmentData {
  id: string;
  protocolId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  createdAt: string;
  createdById: string;
}

export function canProtocolTransition(from: ProtocolStatus, to: ProtocolStatus): boolean {
  return (VALID_PROTOCOL_TRANSITIONS[from] ?? []).includes(to);
}

export function createProtocol(params: {
  id: string;
  validationStudyId: string;
  summary?: string | null;
  endpoints?: string | null;
  sampleSizeJustification?: string | null;
  statisticalStrategy?: string | null;
}): ProtocolData {
  const now = new Date().toISOString();
  const initialVersion = createInitialVersion();
  return {
    id: params.id,
    validationStudyId: params.validationStudyId,
    version: formatVersion(initialVersion),
    status: 'DRAFT',
    summary: params.summary ?? null,
    endpoints: params.endpoints ?? null,
    sampleSizeJustification: params.sampleSizeJustification ?? null,
    statisticalStrategy: params.statisticalStrategy ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionProtocolStatus(
  protocol: ProtocolData,
  newStatus: ProtocolStatus,
): ProtocolData {
  if (!canProtocolTransition(protocol.status, newStatus)) {
    throw new ValidationError(`Cannot transition protocol from ${protocol.status} to ${newStatus}`);
  }
  return {
    ...protocol,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function amendProtocol(
  protocol: ProtocolData,
  reason: string,
  userId: string,
): { protocol: ProtocolData; amendment: ProtocolAmendmentData } {
  if (protocol.status !== 'APPROVED' && protocol.status !== 'AMENDED') {
    throw new ValidationError('Only approved or previously amended protocols can be amended');
  }

  if (!reason.trim()) {
    throw new ValidationError('Amendment reason is required');
  }

  const currentVersion = parseVersion(protocol.version);
  const newVersion = incrementMinor(currentVersion);

  const amendedProtocol: ProtocolData = {
    ...protocol,
    version: formatVersion(newVersion),
    status: 'AMENDED',
    updatedAt: new Date().toISOString(),
  };

  const amendment: ProtocolAmendmentData = {
    id: crypto.randomUUID(),
    protocolId: protocol.id,
    fromVersion: protocol.version,
    toVersion: formatVersion(newVersion),
    reason: reason.trim(),
    createdAt: new Date().toISOString(),
    createdById: userId,
  };

  return { protocol: amendedProtocol, amendment };
}
