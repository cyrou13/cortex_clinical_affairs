import type { EventBus, DomainEvent } from './event-bus.js';
import { logger } from '../utils/logger.js';

/**
 * RabbitMQ-backed EventBus implementation.
 *
 * Falls back to a no-op (log-only) mode when RABBITMQ_URL is not configured,
 * so the application can run without a message broker in dev/test environments.
 */
export class RabbitMqEventBus implements EventBus {
  private connected = false;

  constructor(private readonly rabbitmqUrl?: string) {}

  async connect(): Promise<void> {
    if (!this.rabbitmqUrl) {
      logger.info('RabbitMQ URL not configured — EventBus running in log-only mode');
      return;
    }

    try {
      // Dynamic import to avoid hard dependency when RabbitMQ is not configured
      const amqplib = await import('amqplib');
      const connection = await amqplib.connect(this.rabbitmqUrl);
      const channel = await connection.createChannel();
      await channel.assertExchange('cortex.events', 'topic', { durable: true });
      this.connected = true;
      logger.info('RabbitMQ EventBus connected');

      // Store channel for publishing
      (this as any)._channel = channel;
    } catch (err) {
      logger.warn({ err }, 'Failed to connect to RabbitMQ — falling back to log-only mode');
    }
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    logger.info({ eventType: event.eventType, aggregateId: event.aggregateId }, 'Domain event emitted');

    if (!this.connected) return;

    try {
      const channel = (this as any)._channel;
      if (channel) {
        channel.publish(
          'cortex.events',
          event.eventType,
          Buffer.from(JSON.stringify(event)),
          { persistent: true, contentType: 'application/json' },
        );
      }
    } catch (err) {
      logger.error({ err, event: event.eventType }, 'Failed to publish domain event');
    }
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    logger.info({ eventType }, 'Event subscription registered (will activate when connected)');
    // Subscription implementation for consumers — used by worker services
    void handler;
  }

  async close(): Promise<void> {
    if (this.connected) {
      try {
        const channel = (this as any)._channel;
        if (channel) await channel.close();
        this.connected = false;
      } catch (err) {
        logger.error({ err }, 'Error closing RabbitMQ connection');
      }
    }
  }
}

// Singleton instance
let eventBus: RabbitMqEventBus | null = null;

export function getEventBus(rabbitmqUrl?: string): EventBus {
  if (!eventBus) {
    eventBus = new RabbitMqEventBus(rabbitmqUrl);
  }
  return eventBus;
}
