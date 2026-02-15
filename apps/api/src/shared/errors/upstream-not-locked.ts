import { DomainError } from './domain-error.js';

export class UpstreamNotLockedError extends DomainError {
  constructor(upstreamModule: string) {
    super(
      `Upstream module ${upstreamModule} must be locked before proceeding`,
      'UPSTREAM_NOT_LOCKED',
      { upstreamModule },
    );
  }
}
