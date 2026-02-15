import { DomainError } from './domain-error.js';

export class TraceabilityViolationError extends DomainError {
  constructor(message: string) {
    super(message, 'TRACEABILITY_VIOLATION');
  }
}
