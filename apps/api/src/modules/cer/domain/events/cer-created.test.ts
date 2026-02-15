import { describe, it, expect } from 'vitest';
import { createCerCreatedEvent } from './cer-created.js';

describe('CerCreatedEvent', () => {
  it('creates event with correct eventType', () => {
    const event = createCerCreatedEvent('cer-1', 'proj-1', 'CE_MDR', 'user-1');
    expect(event.eventType).toBe('cer.version.created');
  });

  it('sets aggregateId to cerVersionId', () => {
    const event = createCerCreatedEvent('cer-1', 'proj-1', 'CE_MDR', 'user-1');
    expect(event.aggregateId).toBe('cer-1');
  });

  it('sets aggregateType to CerVersion', () => {
    const event = createCerCreatedEvent('cer-1', 'proj-1', 'CE_MDR', 'user-1');
    expect(event.aggregateType).toBe('CerVersion');
  });

  it('includes data payload', () => {
    const event = createCerCreatedEvent('cer-1', 'proj-1', 'FDA_510K', 'user-1');
    expect(event.data.cerVersionId).toBe('cer-1');
    expect(event.data.projectId).toBe('proj-1');
    expect(event.data.regulatoryContext).toBe('FDA_510K');
  });

  it('sets metadata with userId and correlationId', () => {
    const event = createCerCreatedEvent('cer-1', 'proj-1', 'CE_MDR', 'user-42', 'corr-99');
    expect(event.metadata.userId).toBe('user-42');
    expect(event.metadata.correlationId).toBe('corr-99');
    expect(event.metadata.version).toBe(1);
    expect(event.metadata.timestamp).toBeTruthy();
  });

  it('generates correlationId when not provided', () => {
    const event = createCerCreatedEvent('cer-1', 'proj-1', 'CE_MDR', 'user-1');
    expect(event.metadata.correlationId).toBeTruthy();
  });
});
