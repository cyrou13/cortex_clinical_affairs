// RabbitMQ connection configuration
// Implementation in Story 1.10 (Async Task Infrastructure)

export interface RabbitMQConfig {
  url: string;
}

export function getRabbitMQConfig(): RabbitMQConfig {
  return {
    url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
  };
}
