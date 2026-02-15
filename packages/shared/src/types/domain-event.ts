export interface DomainEvent<T = unknown> {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  data: T;
  metadata: {
    userId: string;
    timestamp: string;
    correlationId: string;
    version: number;
  };
}
