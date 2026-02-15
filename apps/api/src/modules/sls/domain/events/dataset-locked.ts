import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface DatasetLockedData {
  sessionId: string;
  projectId: string;
  articleCount: number;
  includedCount: number;
  excludedCount: number;
}

export function createDatasetLockedEvent(
  data: DatasetLockedData,
  userId: string,
  correlationId: string,
): DomainEvent<DatasetLockedData> {
  return {
    eventType: 'sls.dataset.locked',
    aggregateId: data.sessionId,
    aggregateType: 'SlsSession',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}
