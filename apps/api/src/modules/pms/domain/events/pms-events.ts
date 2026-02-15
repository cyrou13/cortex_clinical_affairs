import type { DomainEvent } from '../../../../shared/events/event-bus.js';

export interface PmsPlanEventData {
  pmsPlanId: string;
  projectId: string;
  status: string;
}

export function createPmsPlanCreatedEvent(data: PmsPlanEventData, userId: string, correlationId: string): DomainEvent<PmsPlanEventData> {
  return { eventType: 'pms.plan.created', aggregateId: data.pmsPlanId, aggregateType: 'PmsPlan', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export function createPmsPlanApprovedEvent(data: PmsPlanEventData, userId: string, correlationId: string): DomainEvent<PmsPlanEventData> {
  return { eventType: 'pms.plan.approved', aggregateId: data.pmsPlanId, aggregateType: 'PmsPlan', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export function createPmsPlanActivatedEvent(data: PmsPlanEventData, userId: string, correlationId: string): DomainEvent<PmsPlanEventData> {
  return { eventType: 'pms.plan.activated', aggregateId: data.pmsPlanId, aggregateType: 'PmsPlan', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export interface PmsCycleEventData {
  pmsCycleId: string;
  pmsPlanId: string;
  status: string;
}

export function createPmsCycleCreatedEvent(data: PmsCycleEventData, userId: string, correlationId: string): DomainEvent<PmsCycleEventData> {
  return { eventType: 'pms.cycle.created', aggregateId: data.pmsCycleId, aggregateType: 'PmsCycle', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export function createPmsCycleActivatedEvent(data: PmsCycleEventData, userId: string, correlationId: string): DomainEvent<PmsCycleEventData> {
  return { eventType: 'pms.cycle.activated', aggregateId: data.pmsCycleId, aggregateType: 'PmsCycle', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export function createPmsCycleCompletedEvent(data: PmsCycleEventData, userId: string, correlationId: string): DomainEvent<PmsCycleEventData> {
  return { eventType: 'pms.cycle.completed', aggregateId: data.pmsCycleId, aggregateType: 'PmsCycle', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export interface PmsActivityEventData {
  activityId: string;
  pmsCycleId: string;
  activityType: string;
  status: string;
}

export function createActivityStartedEvent(data: PmsActivityEventData, userId: string, correlationId: string): DomainEvent<PmsActivityEventData> {
  return { eventType: 'pms.activity.started', aggregateId: data.activityId, aggregateType: 'PmcfActivity', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export function createActivityCompletedEvent(data: PmsActivityEventData, userId: string, correlationId: string): DomainEvent<PmsActivityEventData> {
  return { eventType: 'pms.activity.completed', aggregateId: data.activityId, aggregateType: 'PmcfActivity', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export interface PmsComplaintsImportedData {
  pmsCycleId: string;
  imported: number;
  skipped: number;
  source: string;
}

export function createComplaintsImportedEvent(data: PmsComplaintsImportedData, userId: string, correlationId: string): DomainEvent<PmsComplaintsImportedData> {
  return { eventType: 'pms.complaints.imported', aggregateId: data.pmsCycleId, aggregateType: 'PmsCycle', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export interface PmsCerUpdateDecisionData {
  decisionId: string;
  pmsCycleId: string;
  conclusion: string;
  projectId: string;
}

export function createCerUpdateDecisionFinalizedEvent(data: PmsCerUpdateDecisionData, userId: string, correlationId: string): DomainEvent<PmsCerUpdateDecisionData> {
  return { eventType: 'pms.update-decision.finalized', aggregateId: data.decisionId, aggregateType: 'CerUpdateDecision', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}

export function createCerUpdateRequiredEvent(data: PmsCerUpdateDecisionData, userId: string, correlationId: string): DomainEvent<PmsCerUpdateDecisionData> {
  return { eventType: 'pms.cer-update-required', aggregateId: data.decisionId, aggregateType: 'CerUpdateDecision', data, metadata: { userId, timestamp: new Date().toISOString(), correlationId, version: 1 } };
}
