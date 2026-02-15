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

export interface EventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
  close(): Promise<void>;
}
