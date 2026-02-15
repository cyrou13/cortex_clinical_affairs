import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface CerCreatedData {
  cerVersionId: string;
  projectId: string;
  regulatoryContext: string;
}

export function createCerCreatedEvent(
  cerVersionId: string,
  projectId: string,
  regulatoryContext: string,
  userId: string,
  correlationId?: string,
): DomainEvent<CerCreatedData> {
  return {
    eventType: 'cer.version.created',
    aggregateId: cerVersionId,
    aggregateType: 'CerVersion',
    data: {
      cerVersionId,
      projectId,
      regulatoryContext,
    },
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? crypto.randomUUID(),
      version: 1,
    },
  };
}
