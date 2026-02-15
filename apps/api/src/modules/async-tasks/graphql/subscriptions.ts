import { Redis } from 'ioredis';
import { builder } from '../../../graphql/builder.js';
import { TaskProgressEventType } from './types.js';
import { getRedisUrl } from '../../../config/redis.js';

interface ProgressEvent {
  taskId: string;
  type: string;
  status: string;
  progress: number;
  total: number | undefined;
  current: number | undefined;
  eta: number | undefined;
  message: string | undefined;
}

/**
 * Creates an async iterator that subscribes to Redis pub/sub for task progress
 * events for a specific user. The iterator yields TaskProgressEvent objects
 * as they are published to the `task:progress:{userId}` channel.
 */
export async function* createTaskProgressIterator(
  userId: string,
  redisUrl?: string,
): AsyncGenerator<ProgressEvent> {
  const url = redisUrl ?? getRedisUrl();
  // Create a dedicated subscriber connection (Redis pub/sub requires a separate connection)
  const subscriber = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  const channel = `task:progress:${userId}`;
  const messageQueue: ProgressEvent[] = [];
  let resolve: (() => void) | null = null;
  let done = false;

  subscriber.on('message', (_ch: string, message: string) => {
    try {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      const event: ProgressEvent = {
        taskId: parsed['taskId'] as string,
        type: parsed['type'] as string,
        status: parsed['status'] as string,
        progress: parsed['progress'] as number,
        total: parsed['total'] as number | undefined,
        current: parsed['current'] as number | undefined,
        eta: parsed['eta'] as number | undefined,
        message: parsed['message'] as string | undefined,
      };
      messageQueue.push(event);
      if (resolve) {
        resolve();
        resolve = null;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  try {
    await subscriber.connect();
    await subscriber.subscribe(channel);

    while (!done) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        await new Promise<void>((r) => {
          resolve = r;
        });
      }
    }
  } finally {
    done = true;
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
  }
}

builder.subscriptionField('onTaskProgress', (t) =>
  t.field({
    type: TaskProgressEventType,
    description: 'Subscribe to real-time task progress events for the current user',
    subscribe: async function* (_parent, _args, ctx) {
      if (!ctx.user) {
        throw new Error('Authentication required');
      }
      yield* createTaskProgressIterator(ctx.user.id);
    },
    resolve: (event: ProgressEvent) => event,
  }),
);
