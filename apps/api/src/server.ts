import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import { PrismaClient } from '@prisma/client';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
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
    bodyLimit: 100 * 1024 * 1024, // 100MB for base64-encoded file uploads via GraphQL
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

  // REST endpoint to proxy PDFs from MinIO (avoids CORS issues with signed URLs)
  app.get<{ Params: { articleId: string } }>(
    '/api/articles/:articleId/pdf',
    {
      onSend: async (_request, reply, payload) => {
        // Remove X-Frame-Options so PDF can be embedded in iframes
        reply.raw.removeHeader('X-Frame-Options');
        reply.raw.removeHeader('x-frame-options');
        return payload;
      },
    },
    async (request, reply) => {
      const { articleId } = request.params;
      const userId = request.currentUser?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const article = await prisma.article.findUnique({ where: { id: articleId } });
      if (
        !article ||
        !article.pdfStorageKey ||
        !['FOUND', 'VERIFIED'].includes(article.pdfStatus ?? '')
      ) {
        return reply.status(404).send({ error: 'PDF not found' });
      }

      try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const endpoint = process.env['MINIO_ENDPOINT'] ?? 'localhost';
        const port = process.env['MINIO_PORT'] ?? '9000';
        const s3 = new S3Client({
          endpoint: `http://${endpoint}:${port}`,
          region: 'us-east-1',
          credentials: {
            accessKeyId: process.env['MINIO_ACCESS_KEY'] ?? 'cortex_minio',
            secretAccessKey: process.env['MINIO_SECRET_KEY'] ?? 'cortex_minio_secret',
          },
          forcePathStyle: true,
        });

        const result = await s3.send(
          new GetObjectCommand({
            Bucket: process.env['MINIO_BUCKET'] ?? 'cortex-documents',
            Key: article.pdfStorageKey,
          }),
        );

        void reply.header('content-type', 'application/pdf');
        void reply.header('content-disposition', `inline; filename="${articleId}.pdf"`);
        if (result.ContentLength) {
          void reply.header('Content-Length', result.ContentLength);
        }

        return reply.send(result.Body);
      } catch {
        return reply.status(500).send({ error: 'Failed to retrieve PDF' });
      }
    },
  );

  // FIX #2: Integrate auth middleware to populate request.currentUser
  if (!opts.skipAuth && config.JWT_SECRET && config.JWT_REFRESH_SECRET && config.REDIS_URL) {
    const redis = new Redis(config.REDIS_URL);
    const jwtService = new JwtService(config.JWT_SECRET, config.JWT_REFRESH_SECRET, redis, prisma);
    const authMiddleware = createAuthMiddleware(jwtService);
    app.addHook('onRequest', authMiddleware);
  }

  // Dev-mode: auto-authenticate as admin when no token is present
  if (config.NODE_ENV === 'development' && !opts.skipAuth) {
    const DEV_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

    // Ensure dev admin user exists in DB
    prisma.user
      .upsert({
        where: { id: DEV_ADMIN_ID },
        update: {},
        create: {
          id: DEV_ADMIN_ID,
          email: 'dev@cortex.local',
          name: 'Dev Admin',
          role: 'ADMIN',
        },
      })
      .then(() => logger.info('Dev admin user ready (dev@cortex.local)'))
      .catch((err: unknown) => logger.warn({ err }, 'Failed to upsert dev admin user'));

    app.addHook('onRequest', async (request) => {
      if (!request.currentUser) {
        request.currentUser = { id: DEV_ADMIN_ID, role: 'ADMIN' };
      }
    });
  }

  // WebSocket server for GraphQL subscriptions (graphql-ws)
  const wss = new WebSocketServer({ noServer: true });

  const DEV_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

  const wsCleanup = useServer(
    {
      schema,
      context: async (_ctx, _msg, _args): Promise<GraphQLContext> => ({
        prisma,
        // In dev mode, auto-authenticate subscriptions as admin
        user: config.NODE_ENV === 'development' ? { id: DEV_ADMIN_ID, role: 'ADMIN' } : null,
        requestId: randomUUID(),
        reply: null as never,
      }),
    },
    wss,
  );

  const apollo = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      fastifyApolloDrainPlugin(app),
      // Drain the WebSocket server on Apollo shutdown
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsCleanup.dispose();
            },
          };
        },
      },
    ],
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

  // Handle WebSocket upgrade on /graphql path
  app.server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url ?? '', `http://${request.headers.host}`);
    if (pathname === '/graphql') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
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
