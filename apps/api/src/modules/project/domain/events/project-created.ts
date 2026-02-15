import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface ProjectCreatedData {
  projectId: string;
  name: string;
  deviceName: string;
  regulatoryContext: string;
  createdBy: string;
}

export function createProjectCreatedEvent(
  data: ProjectCreatedData,
  correlationId: string,
): DomainEvent<ProjectCreatedData> {
  return {
    eventType: 'project.project.created',
    aggregateId: data.projectId,
    aggregateType: 'Project',
    data,
    metadata: {
      userId: data.createdBy,
      timestamp: new Date().toISOString(),
      correlationId,
      version: 1,
    },
  };
}
