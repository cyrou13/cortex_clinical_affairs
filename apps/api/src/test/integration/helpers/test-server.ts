/**
 * Test Server Helper
 *
 * Creates Fastify+Apollo test instances with injected user context.
 * Uses `app.inject()` for zero-network-overhead GraphQL testing.
 */
import { PrismaClient } from '@prisma/client';
import { buildServer } from '../../../server.js';
import type { FastifyInstance } from 'fastify';

// ── Test user constants ──────────────────────────────────────────────

export const ADMIN_USER = {
  id: 'test-admin-001',
  role: 'ADMIN',
};

export const RA_MANAGER_USER = {
  id: 'test-ra-manager-001',
  role: 'RA_MANAGER',
};

export const CLINICAL_USER = {
  id: 'test-clinical-001',
  role: 'CLINICAL_SPECIALIST',
};

// ── Shared Prisma client for integration tests ───────────────────────

const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://cortex:cortex_test_secret@localhost:5433/cortex_test';

let sharedPrisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!sharedPrisma) {
    sharedPrisma = new PrismaClient({
      datasourceUrl: TEST_DATABASE_URL,
      log: [],
    });
  }
  return sharedPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (sharedPrisma) {
    await sharedPrisma.$disconnect();
    sharedPrisma = null;
  }
}

// ── App factory ──────────────────────────────────────────────────────

/**
 * Build a Fastify+Apollo test app.
 *
 * @param user — if provided, every GraphQL request will run as this user.
 *               If omitted, requests are unauthenticated (ctx.user = null).
 */
export async function createTestApp(user?: { id: string; role: string }): Promise<FastifyInstance> {
  const prisma = getTestPrisma();

  const app = await buildServer({
    prisma,
    skipAuth: true,
    config: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
    },
  });

  // Inject user into every request via onRequest hook
  if (user) {
    app.addHook('onRequest', async (request) => {
      (request as any).currentUser = user;
    });
  }

  await app.ready();
  return app;
}
