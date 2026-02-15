import { DomainError } from './domain-error.js';

export class LockConflictError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super(`${entityType} ${entityId} is locked and cannot be modified`, 'LOCK_CONFLICT', {
      entityType,
      entityId,
    });
  }
}
