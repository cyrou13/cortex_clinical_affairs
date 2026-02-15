import { describe, it, expect } from 'vitest';
import {
  DomainError,
  NotFoundError,
  PermissionDeniedError,
  LockConflictError,
  ValidationError,
  UpstreamNotLockedError,
  TraceabilityViolationError,
} from './index.js';

describe('DomainError', () => {
  it('should create with message and code', () => {
    const error = new DomainError('test error', 'TEST_CODE');
    expect(error.message).toBe('test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('DomainError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include extensions', () => {
    const error = new DomainError('test', 'CODE', { key: 'value' });
    expect(error.extensions).toEqual({ key: 'value' });
  });
});

describe('NotFoundError', () => {
  it('should create with entity info', () => {
    const error = new NotFoundError('Project', '123');
    expect(error.message).toBe('Project with id 123 not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.extensions).toEqual({ entityType: 'Project', entityId: '123' });
    expect(error.name).toBe('NotFoundError');
  });
});

describe('PermissionDeniedError', () => {
  it('should create without action', () => {
    const error = new PermissionDeniedError();
    expect(error.message).toBe('Permission denied');
    expect(error.code).toBe('PERMISSION_DENIED');
  });

  it('should create with action', () => {
    const error = new PermissionDeniedError('delete project');
    expect(error.message).toBe('Permission denied: delete project');
    expect(error.extensions).toEqual({ action: 'delete project' });
  });
});

describe('LockConflictError', () => {
  it('should create with entity info', () => {
    const error = new LockConflictError('CER', 'abc');
    expect(error.message).toBe('CER abc is locked and cannot be modified');
    expect(error.code).toBe('LOCK_CONFLICT');
  });
});

describe('ValidationError', () => {
  it('should create with field errors', () => {
    const error = new ValidationError('Invalid input', { name: ['required'] });
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors).toEqual({ name: ['required'] });
  });

  it('should create without field errors', () => {
    const error = new ValidationError('Bad data');
    expect(error.fieldErrors).toBeUndefined();
  });
});

describe('UpstreamNotLockedError', () => {
  it('should create with module name', () => {
    const error = new UpstreamNotLockedError('SLS');
    expect(error.message).toBe('Upstream module SLS must be locked before proceeding');
    expect(error.code).toBe('UPSTREAM_NOT_LOCKED');
  });
});

describe('TraceabilityViolationError', () => {
  it('should create with message', () => {
    const error = new TraceabilityViolationError('Orphaned CER claim detected');
    expect(error.message).toBe('Orphaned CER claim detected');
    expect(error.code).toBe('TRACEABILITY_VIOLATION');
  });
});
