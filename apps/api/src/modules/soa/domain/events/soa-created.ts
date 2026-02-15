import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface SoaCreatedData {
  soaAnalysisId: string;
  projectId: string;
  type: string;
  name: string;
  linkedSessionIds: string[];
}

export function createSoaCreatedEvent(
  data: SoaCreatedData,
  userId: string,
  correlationId: string,
): DomainEvent<SoaCreatedData> {
  return {
    eventType: 'soa.analysis.created',
    aggregateId: data.soaAnalysisId,
    aggregateType: 'SoaAnalysis',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}
