import { DomainError } from './domain-error.js';

export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message, 'VALIDATION_ERROR', fieldErrors ? { fieldErrors } : undefined);
  }
}
