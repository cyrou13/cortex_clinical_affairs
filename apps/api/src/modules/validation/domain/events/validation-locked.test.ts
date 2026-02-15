import { describe, it, expect } from 'vitest';
import { createValidationLockedEvent } from './validation-locked.js';

describe('ValidationLockedEvent', () => {
  it('creates event with correct eventType', () => {
    const event = createValidationLockedEvent(
      { validationStudyId: 'study-1', projectId: 'proj-1', studyType: 'STANDALONE' },
      'user-1',
      'corr-1',
    );
    expect(event.eventType).toBe('validation.study.locked');
  });

  it('sets aggregateId to validationStudyId', () => {
    const event = createValidationLockedEvent(
      { validationStudyId: 'study-1', projectId: 'proj-1', studyType: 'STANDALONE' },
      'user-1',
      'corr-1',
    );
    expect(event.aggregateId).toBe('study-1');
  });

  it('sets aggregateType to ValidationStudy', () => {
    const event = createValidationLockedEvent(
      { validationStudyId: 'study-1', projectId: 'proj-1', studyType: 'STANDALONE' },
      'user-1',
      'corr-1',
    );
    expect(event.aggregateType).toBe('ValidationStudy');
  });

  it('includes data payload', () => {
    const event = createValidationLockedEvent(
      { validationStudyId: 'study-1', projectId: 'proj-1', studyType: 'MRMC' },
      'user-1',
      'corr-1',
    );
    expect(event.data.validationStudyId).toBe('study-1');
    expect(event.data.projectId).toBe('proj-1');
    expect(event.data.studyType).toBe('MRMC');
  });

  it('sets metadata with userId and correlationId', () => {
    const event = createValidationLockedEvent(
      { validationStudyId: 'study-1', projectId: 'proj-1', studyType: 'STANDALONE' },
      'user-42',
      'corr-99',
    );
    expect(event.metadata.userId).toBe('user-42');
    expect(event.metadata.correlationId).toBe('corr-99');
    expect(event.metadata.version).toBe(1);
    expect(event.metadata.timestamp).toBeTruthy();
  });
});
