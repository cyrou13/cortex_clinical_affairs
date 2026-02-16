/**
 * Database cleanup helper for integration tests.
 *
 * Truncates all tables in reverse-FK order so tests start with a clean slate.
 * Uses TRUNCATE CASCADE for speed.
 */
import type { PrismaClient } from '@prisma/client';

/**
 * Truncate all application tables (preserves schema/migrations).
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Get all table names from the public schema (excluding Prisma migration tables)
  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma_%'
  `);

  if (tables.length === 0) return;

  const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE`);
}
