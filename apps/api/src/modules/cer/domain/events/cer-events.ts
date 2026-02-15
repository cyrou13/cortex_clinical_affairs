import type { DomainEvent } from '../../../../shared/events/event-bus.js';

// ── PCCP Deviation Events ──────────────────────────────────────────────

export interface PccpDeviationCreatedData {
  deviationId: string;
  cerVersionId: string;
  pccpSection: string;
  significance: string;
}

export function createPccpDeviationCreatedEvent(
  data: PccpDeviationCreatedData,
  userId: string,
  correlationId: string,
): DomainEvent<PccpDeviationCreatedData> {
  return {
    eventType: 'cer.pccp-deviation.created',
    aggregateId: data.deviationId,
    aggregateType: 'PccpDeviation',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}

export interface PccpDeviationApprovedData {
  deviationId: string;
  cerVersionId: string;
  approverId: string;
}

export function createPccpDeviationApprovedEvent(
  data: PccpDeviationApprovedData,
  userId: string,
  correlationId: string,
): DomainEvent<PccpDeviationApprovedData> {
  return {
    eventType: 'cer.pccp-deviation.approved',
    aggregateId: data.deviationId,
    aggregateType: 'PccpDeviation',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}

// ── E-Signature Events ─────────────────────────────────────────────────

export interface DocumentSignedData {
  cerVersionId: string;
  userId: string;
  documentHash: string;
  action: string;
}

export function createDocumentSignedEvent(
  data: DocumentSignedData,
  userId: string,
  correlationId: string,
): DomainEvent<DocumentSignedData> {
  return {
    eventType: 'cer.document.signed',
    aggregateId: data.cerVersionId,
    aggregateType: 'CerVersion',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}

// ── Version Events ─────────────────────────────────────────────────────

export interface CerVersionCreatedData {
  cerVersionId: string;
  projectId: string;
  versionType: string;
  versionNumber: string;
  previousVersionId?: string;
}

export function createCerVersionCreatedEvent(
  data: CerVersionCreatedData,
  userId: string,
  correlationId: string,
): DomainEvent<CerVersionCreatedData> {
  return {
    eventType: 'cer.version.created',
    aggregateId: data.cerVersionId,
    aggregateType: 'CerVersion',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}

export interface CerVersionLockedData {
  cerVersionId: string;
  projectId: string;
  versionNumber: string;
}

export function createCerVersionLockedEvent(
  data: CerVersionLockedData,
  userId: string,
  correlationId: string,
): DomainEvent<CerVersionLockedData> {
  return {
    eventType: 'cer.version.locked',
    aggregateId: data.cerVersionId,
    aggregateType: 'CerVersion',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}
