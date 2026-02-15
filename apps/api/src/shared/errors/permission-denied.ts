import { DomainError } from './domain-error.js';

export class PermissionDeniedError extends DomainError {
  constructor(action?: string) {
    super(
      action ? `Permission denied: ${action}` : 'Permission denied',
      'PERMISSION_DENIED',
      action ? { action } : undefined,
    );
  }
}
