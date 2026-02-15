import { DomainError } from './domain-error.js';

export class NotFoundError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super(`${entityType} with id ${entityId} not found`, 'NOT_FOUND', {
      entityType,
      entityId,
    });
  }
}
