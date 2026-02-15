import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import { PrismaClient } from '@prisma/client';
import { schema } from './graphql/schema.js';
import type { GraphQLContext } from './graphql/context.js';
import { logger } from './shared/utils/logger.js';
import { getEnvConfig, type EnvConfig } from './config/env.js';
import { createAuthMiddleware } from './shared/middleware/auth-middleware.js';
import { JwtService } from './modules/auth/infrastructure/services/jwt-service.js';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';

export interface BuildServerOptions {
  prisma?: PrismaClient;
  config?: Partial<EnvConfig>;
  skipAuth?: boolean;
}

export async function buildServer(options?: BuildServerOptions | PrismaClient) {
  // Support legacy signature: buildServer(prisma)
  const opts: BuildServerOptions =
    options instanceof PrismaClient ? { prisma: options } : (options ?? {});

  let config: EnvConfig;
  try {
    config = getEnvConfig();
  } catch {
    // Fallback for test environments without full env
    config = {
      NODE_ENV: 'test',
      PORT: 4000,
      LOG_LEVEL: 'error',
      DATABASE_URL: 'postgresql://localhost:5432/test',
      CORS_ORIGIN: ['http://localhost:5173'],
      JWT_SECRET: 'test-secret-at-least-16-chars',
      JWT_REFRESH_SECRET: 'test-refresh-at-least-16-chars',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_USE_SSL: false,
      LLM_PROVIDER: 'anthropic',
      ...opts.config,
    } as EnvConfig;
  }

  const prisma = opts.prisma ?? new PrismaClient();

  const app = Fastify({
    logger: false,
    genReqId: () => randomUUID(),
    requestTimeout: 30_000,
  });

  // FIX #1: CORS restricted to configured origins
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // FIX #2: Integrate auth middleware to populate request.currentUser
  if (!opts.skipAuth && config.JWT_SECRET && config.JWT_REFRESH_SECRET && config.REDIS_URL) {
    const redis = new Redis(config.REDIS_URL);
    const jwtService = new JwtService(config.JWT_SECRET, config.JWT_REFRESH_SECRET, redis, prisma);
    const authMiddleware = createAuthMiddleware(jwtService);
    app.addHook('onRequest', authMiddleware);
  }

  const apollo = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [fastifyApolloDrainPlugin(app)],
    // FIX #7: Use validated config instead of raw process.env
    introspection: config.NODE_ENV !== 'production',
    formatError: (formattedError) => {
      if (config.NODE_ENV === 'production' && !formattedError.extensions?.code) {
        return { ...formattedError, message: 'Internal server error' };
      }
      return formattedError;
    },
  });

  await apollo.start();

  await app.register(fastifyApollo(apollo), {
    // FIX #2: Populate user from auth middleware instead of always null
    context: async (request, reply): Promise<GraphQLContext> => ({
      prisma,
      user: request.currentUser ?? null,
      requestId: (request.id as string) ?? randomUUID(),
      reply,
    }),
  });

  return app;
}

async function main() {
  const config = getEnvConfig();

  const app = await buildServer();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info({ port: config.PORT }, 'Cortex API server started');
}

const isMainModule =
  typeof import.meta.url === 'string' &&
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  main().catch((err: unknown) => {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  });
}
