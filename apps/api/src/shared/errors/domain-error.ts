export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly extensions?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
