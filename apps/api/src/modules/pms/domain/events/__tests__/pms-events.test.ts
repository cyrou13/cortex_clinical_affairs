import { describe, it, expect } from 'vitest';
import {
  createPmsPlanCreatedEvent,
  createPmsPlanApprovedEvent,
  createPmsPlanActivatedEvent,
  createPmsCycleCreatedEvent,
  createPmsCycleActivatedEvent,
  createPmsCycleCompletedEvent,
  createActivityStartedEvent,
  createActivityCompletedEvent,
  createComplaintsImportedEvent,
  createCerUpdateDecisionFinalizedEvent,
  createCerUpdateRequiredEvent,
} from '../pms-events.js';

const planData = { pmsPlanId: 'plan-1', projectId: 'proj-1', status: 'DRAFT' };
const cycleData = { pmsCycleId: 'cycle-1', pmsPlanId: 'plan-1', status: 'CREATED' };
const activityData = { activityId: 'act-1', pmsCycleId: 'cycle-1', activityType: 'PMCF_SURVEY', status: 'IN_PROGRESS' };
const complaintsData = { pmsCycleId: 'cycle-1', imported: 42, skipped: 3, source: 'MAUDE' };
const decisionData = { decisionId: 'dec-1', pmsCycleId: 'cycle-1', conclusion: 'UPDATE_REQUIRED', projectId: 'proj-1' };

describe('PMS Plan Events', () => {
  describe('createPmsPlanCreatedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createPmsPlanCreatedEvent(planData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.plan.created');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createPmsPlanCreatedEvent(planData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('plan-1');
      expect(event.aggregateType).toBe('PmsPlan');
    });

    it('includes data payload', () => {
      const event = createPmsPlanCreatedEvent(planData, 'user-1', 'corr-1');
      expect(event.data).toEqual(planData);
    });

    it('sets metadata with userId, correlationId, and timestamp', () => {
      const event = createPmsPlanCreatedEvent(planData, 'user-42', 'corr-99');
      expect(event.metadata.userId).toBe('user-42');
      expect(event.metadata.correlationId).toBe('corr-99');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });

  describe('createPmsPlanApprovedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createPmsPlanApprovedEvent(planData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.plan.approved');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createPmsPlanApprovedEvent(planData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('plan-1');
      expect(event.aggregateType).toBe('PmsPlan');
    });

    it('includes data payload', () => {
      const event = createPmsPlanApprovedEvent(planData, 'user-1', 'corr-1');
      expect(event.data).toEqual(planData);
    });

    it('sets metadata', () => {
      const event = createPmsPlanApprovedEvent(planData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });

  describe('createPmsPlanActivatedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createPmsPlanActivatedEvent(planData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.plan.activated');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createPmsPlanActivatedEvent(planData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('plan-1');
      expect(event.aggregateType).toBe('PmsPlan');
    });

    it('includes data payload', () => {
      const event = createPmsPlanActivatedEvent(planData, 'user-1', 'corr-1');
      expect(event.data).toEqual(planData);
    });

    it('sets metadata', () => {
      const event = createPmsPlanActivatedEvent(planData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });
});

describe('PMS Cycle Events', () => {
  describe('createPmsCycleCreatedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createPmsCycleCreatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.cycle.created');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createPmsCycleCreatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('cycle-1');
      expect(event.aggregateType).toBe('PmsCycle');
    });

    it('includes data payload', () => {
      const event = createPmsCycleCreatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.data).toEqual(cycleData);
    });

    it('sets metadata', () => {
      const event = createPmsCycleCreatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });

  describe('createPmsCycleActivatedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createPmsCycleActivatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.cycle.activated');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createPmsCycleActivatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('cycle-1');
      expect(event.aggregateType).toBe('PmsCycle');
    });

    it('includes data payload', () => {
      const event = createPmsCycleActivatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.data).toEqual(cycleData);
    });

    it('sets metadata', () => {
      const event = createPmsCycleActivatedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });

  describe('createPmsCycleCompletedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createPmsCycleCompletedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.cycle.completed');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createPmsCycleCompletedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('cycle-1');
      expect(event.aggregateType).toBe('PmsCycle');
    });

    it('includes data payload', () => {
      const event = createPmsCycleCompletedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.data).toEqual(cycleData);
    });

    it('sets metadata', () => {
      const event = createPmsCycleCompletedEvent(cycleData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });
});

describe('PMS Activity Events', () => {
  describe('createActivityStartedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createActivityStartedEvent(activityData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.activity.started');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createActivityStartedEvent(activityData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('act-1');
      expect(event.aggregateType).toBe('PmcfActivity');
    });

    it('includes data payload', () => {
      const event = createActivityStartedEvent(activityData, 'user-1', 'corr-1');
      expect(event.data).toEqual(activityData);
    });

    it('sets metadata', () => {
      const event = createActivityStartedEvent(activityData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });

  describe('createActivityCompletedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createActivityCompletedEvent(activityData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.activity.completed');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createActivityCompletedEvent(activityData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('act-1');
      expect(event.aggregateType).toBe('PmcfActivity');
    });

    it('includes data payload', () => {
      const event = createActivityCompletedEvent(activityData, 'user-1', 'corr-1');
      expect(event.data).toEqual(activityData);
    });

    it('sets metadata', () => {
      const event = createActivityCompletedEvent(activityData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });
});

describe('PMS Complaints Events', () => {
  describe('createComplaintsImportedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createComplaintsImportedEvent(complaintsData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.complaints.imported');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createComplaintsImportedEvent(complaintsData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('cycle-1');
      expect(event.aggregateType).toBe('PmsCycle');
    });

    it('includes data payload', () => {
      const event = createComplaintsImportedEvent(complaintsData, 'user-1', 'corr-1');
      expect(event.data).toEqual(complaintsData);
    });

    it('sets metadata', () => {
      const event = createComplaintsImportedEvent(complaintsData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });
});

describe('PMS CER Update Decision Events', () => {
  describe('createCerUpdateDecisionFinalizedEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createCerUpdateDecisionFinalizedEvent(decisionData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.update-decision.finalized');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createCerUpdateDecisionFinalizedEvent(decisionData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('dec-1');
      expect(event.aggregateType).toBe('CerUpdateDecision');
    });

    it('includes data payload', () => {
      const event = createCerUpdateDecisionFinalizedEvent(decisionData, 'user-1', 'corr-1');
      expect(event.data).toEqual(decisionData);
    });

    it('sets metadata', () => {
      const event = createCerUpdateDecisionFinalizedEvent(decisionData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });

  describe('createCerUpdateRequiredEvent', () => {
    it('creates event with correct eventType', () => {
      const event = createCerUpdateRequiredEvent(decisionData, 'user-1', 'corr-1');
      expect(event.eventType).toBe('pms.cer-update-required');
    });

    it('sets aggregateId and aggregateType', () => {
      const event = createCerUpdateRequiredEvent(decisionData, 'user-1', 'corr-1');
      expect(event.aggregateId).toBe('dec-1');
      expect(event.aggregateType).toBe('CerUpdateDecision');
    });

    it('includes data payload', () => {
      const event = createCerUpdateRequiredEvent(decisionData, 'user-1', 'corr-1');
      expect(event.data).toEqual(decisionData);
    });

    it('sets metadata', () => {
      const event = createCerUpdateRequiredEvent(decisionData, 'user-1', 'corr-1');
      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.correlationId).toBe('corr-1');
      expect(event.metadata.version).toBe(1);
      expect(event.metadata.timestamp).toBeTruthy();
    });
  });
});
