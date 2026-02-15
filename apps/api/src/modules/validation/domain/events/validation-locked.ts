import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface ValidationLockedData {
  validationStudyId: string;
  projectId: string;
  studyType: string;
}

export function createValidationLockedEvent(
  data: ValidationLockedData,
  userId: string,
  correlationId: string,
): DomainEvent<ValidationLockedData> {
  return {
    eventType: 'validation.study.locked',
    aggregateId: data.validationStudyId,
    aggregateType: 'ValidationStudy',
    data,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}
