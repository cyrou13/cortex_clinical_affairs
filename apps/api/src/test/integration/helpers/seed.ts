/**
 * Seed helpers for integration tests.
 *
 * Each function creates a minimal valid record in the test database.
 * Override fields via the `overrides` parameter.
 */
import type { PrismaClient } from '@prisma/client';
import { ADMIN_USER } from './test-server.js';

// ── Users ────────────────────────────────────────────────────────────

export async function seedAdminUser(prisma: PrismaClient) {
  return prisma.user.upsert({
    where: { id: ADMIN_USER.id },
    update: {},
    create: {
      id: ADMIN_USER.id,
      email: 'admin@cortex-test.com',
      name: 'Test Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
}

export async function seedUser(
  prisma: PrismaClient,
  role: string,
  overrides?: { id?: string; email?: string; name?: string },
) {
  const id = overrides?.id ?? `test-${role.toLowerCase()}-${Date.now()}`;
  const email = overrides?.email ?? `${role.toLowerCase()}@cortex-test.com`;
  const name = overrides?.name ?? `Test ${role}`;

  return prisma.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      email,
      name,
      role: role as any,
      isActive: true,
    },
  });
}

// ── Projects ─────────────────────────────────────────────────────────

export async function seedProject(
  prisma: PrismaClient,
  createdBy: string,
  overrides?: { id?: string; name?: string },
) {
  const id = overrides?.id ?? `test-project-${Date.now()}`;
  const name = overrides?.name ?? 'Test Project';

  return prisma.project.create({
    data: {
      id,
      name,
      deviceName: 'Test Device',
      deviceClass: 'IIb',
      regulatoryContext: 'CE_MDR',
      createdBy,
    },
  });
}

export async function seedProjectMembership(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  role = 'ADMIN',
) {
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: {
      projectId,
      userId,
      role,
    },
  });
}

// ── CEP ──────────────────────────────────────────────────────────────

export async function seedCep(
  prisma: PrismaClient,
  projectId: string,
  overrides?: { id?: string },
) {
  const id = overrides?.id ?? `test-cep-${Date.now()}`;

  return prisma.cep.upsert({
    where: { projectId },
    update: {},
    create: {
      id,
      projectId,
      scope: 'Test scope',
      objectives: 'Test objectives',
    },
  });
}

// ── SLS Sessions ─────────────────────────────────────────────────────

export async function seedSlsSession(
  prisma: PrismaClient,
  projectId: string,
  cepId: string,
  createdById: string,
  overrides?: { id?: string; name?: string; status?: string },
) {
  const id = overrides?.id ?? `test-sls-${Date.now()}`;
  const name = overrides?.name ?? 'Test SLS Session';
  const status = overrides?.status ?? 'DRAFT';

  return prisma.slsSession.create({
    data: {
      id,
      projectId,
      cepId,
      name,
      type: 'SOA_CLINICAL',
      status: status as any,
      createdById,
      ...(status === 'LOCKED' ? { lockedAt: new Date(), lockedById: createdById } : {}),
    },
  });
}

// ── Articles ─────────────────────────────────────────────────────────

export async function seedArticle(
  prisma: PrismaClient,
  sessionId: string,
  overrides?: { id?: string; title?: string; status?: string },
) {
  const id = overrides?.id ?? `test-article-${Date.now()}`;
  const title = overrides?.title ?? 'Test Article';
  const status = overrides?.status ?? 'PENDING';

  return prisma.article.create({
    data: {
      id,
      sessionId,
      title,
      abstract: 'Test abstract for integration testing',
      status: status as any,
      source: 'MANUAL',
      sourceDatabase: 'test',
    },
  });
}
