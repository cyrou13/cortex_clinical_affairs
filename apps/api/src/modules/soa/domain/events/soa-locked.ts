import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface SoaLockedData {
  soaAnalysisId: string;
  projectId: string;
  sectionCount: number;
}

export function createSoaLockedEvent(
  data: SoaLockedData,
  userId: string,
  correlationId: string,
): DomainEvent<SoaLockedData> {
  return {
    eventType: 'soa.analysis.locked',
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
