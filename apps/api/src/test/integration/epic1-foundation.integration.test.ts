/// <reference types="vitest" />
/**
 * Epic 1 — Foundation Integration Tests
 *
 * Tests the core foundation features against a real PostgreSQL test database:
 *  - Health / server endpoints
 *  - User management (CRUD, RBAC)
 *  - Project management (create, update, membership)
 *  - Audit trail
 *  - Role-based access control
 */
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  createTestApp,
  getTestPrisma,
  disconnectPrisma,
  ADMIN_USER,
  RA_MANAGER_USER,
  CLINICAL_USER,
} from './helpers/test-server.js';
import { gql } from './helpers/graphql-client.js';
import { cleanDatabase } from './helpers/cleanup.js';
import { seedAdminUser, seedUser } from './helpers/seed.js';

// ── Shared state across all test groups ──────────────────────────────
let adminApp: FastifyInstance;
let noAuthApp: FastifyInstance;
let clinicalApp: FastifyInstance;
let raManagerApp: FastifyInstance;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = getTestPrisma();
  await cleanDatabase(prisma);

  // Build four app instances: admin, unauthenticated, clinical, RA manager
  [adminApp, noAuthApp, clinicalApp, raManagerApp] = await Promise.all([
    createTestApp(ADMIN_USER),
    createTestApp(), // no user injected
    createTestApp(CLINICAL_USER),
    createTestApp(RA_MANAGER_USER),
  ]);

  // Seed the admin user row so FK constraints on audit_logs.userId are met
  await seedAdminUser(prisma);
  // Seed the RA_MANAGER and CLINICAL_SPECIALIST user rows too
  await seedUser(prisma, 'RA_MANAGER', {
    id: RA_MANAGER_USER.id,
    email: 'ra@cortex-test.com',
    name: 'RA Manager',
  });
  await seedUser(prisma, 'CLINICAL_SPECIALIST', {
    id: CLINICAL_USER.id,
    email: 'clinical@cortex-test.com',
    name: 'Clinical Specialist',
  });
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await Promise.all([
    adminApp.close(),
    noAuthApp.close(),
    clinicalApp.close(),
    raManagerApp.close(),
  ]);
  await disconnectPrisma();
});

// =====================================================================
// 1. Health & Server
// =====================================================================
describe('Health & Server', () => {
  it('GET /health returns { status: "ok" }', async () => {
    const res = await adminApp.inject({ method: 'GET', url: '/health' });
    const body = JSON.parse(res.payload);

    expect(res.statusCode).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GraphQL health query returns "ok"', async () => {
    const { data, errors } = await gql(adminApp, `query { health }`);

    expect(errors).toBeUndefined();
    expect(data?.health).toBe('ok');
  });

  it('GraphQL serverInfo query returns version 0.1.0', async () => {
    const { data, errors } = await gql(
      adminApp,
      `query { serverInfo { status timestamp version } }`,
    );

    expect(errors).toBeUndefined();
    expect(data?.serverInfo.status).toBe('ok');
    expect(data?.serverInfo.version).toBe('0.1.0');
    expect(data?.serverInfo.timestamp).toBeDefined();
  });
});

// =====================================================================
// 2. User Management (Admin)
// =====================================================================
describe('User Management', () => {
  const CREATE_USER = `
    mutation CreateUser($email: String!, $name: String!, $role: String!) {
      createUser(email: $email, name: $name, role: $role) {
        id email name role isActive
      }
    }
  `;

  const LIST_USERS = `
    query ListUsers {
      users { users { id email name role isActive } total }
    }
  `;

  it('createUser mutation creates a user in DB', async () => {
    const { data, errors } = await gql(adminApp, CREATE_USER, {
      email: 'newuser@cortex-test.com',
      name: 'New User',
      role: 'RA_MANAGER',
    });

    expect(errors).toBeUndefined();
    expect(data?.createUser).toBeDefined();
    expect(data.createUser.email).toBe('newuser@cortex-test.com');
    expect(data.createUser.name).toBe('New User');
    expect(data.createUser.role).toBe('RA_MANAGER');
    expect(data.createUser.isActive).toBe(true);

    // Verify directly in DB
    const dbUser = await prisma.user.findUnique({
      where: { email: 'newuser@cortex-test.com' },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.role).toBe('RA_MANAGER');
  });

  it('createUser with invalid role returns error', async () => {
    const { data, errors } = await gql(adminApp, CREATE_USER, {
      email: 'badrole@cortex-test.com',
      name: 'Bad Role',
      role: 'SUPER_ADMIN',
    });

    expect(errors).toBeDefined();
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0]!.message).toContain('Invalid role');
    expect(data?.createUser).toBeNull();
  });

  it('unauthenticated request gets permission denied', async () => {
    const { errors } = await gql(noAuthApp, CREATE_USER, {
      email: 'anon@cortex-test.com',
      name: 'Anon',
      role: 'ADMIN',
    });

    expect(errors).toBeDefined();
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0]!.message).toContain('Authentication required');
  });

  it('CLINICAL_SPECIALIST cannot create users (users:admin denied)', async () => {
    const { errors } = await gql(clinicalApp, CREATE_USER, {
      email: 'shouldfail@cortex-test.com',
      name: 'Should Fail',
      role: 'RA_MANAGER',
    });

    expect(errors).toBeDefined();
    expect(errors!.length).toBeGreaterThan(0);
    // CLINICAL_SPECIALIST has no 'admin' action on 'users' module
    expect(errors![0]!.message).toMatch(/cannot perform|permission|denied/i);
  });

  it('listUsers query returns created users', async () => {
    const { data, errors } = await gql(adminApp, LIST_USERS);

    expect(errors).toBeUndefined();
    expect(data?.users).toBeDefined();
    // At least the seeded admin + RA + clinical + the newuser from earlier test
    expect(data.users.total).toBeGreaterThanOrEqual(4);
    expect(data.users.users.length).toBeGreaterThanOrEqual(4);

    const emails = data.users.users.map((u: { email: string }) => u.email);
    expect(emails).toContain('admin@cortex-test.com');
    expect(emails).toContain('newuser@cortex-test.com');
  });
});

// =====================================================================
// 3. Project Management
// =====================================================================
describe('Project Management', () => {
  const CREATE_PROJECT = `
    mutation CreateProject($name: String!, $deviceName: String!, $deviceClass: String!, $regulatoryContext: String!) {
      createProject(name: $name, deviceName: $deviceName, deviceClass: $deviceClass, regulatoryContext: $regulatoryContext) {
        id name deviceName deviceClass regulatoryContext status
        cep { id projectId }
      }
    }
  `;

  const UPDATE_PROJECT = `
    mutation UpdateProject($id: String!, $name: String, $deviceName: String) {
      updateProject(id: $id, name: $name, deviceName: $deviceName) {
        id name deviceName
      }
    }
  `;

  const ASSIGN_USER = `
    mutation AssignUser($userId: String!, $projectId: String!) {
      assignUserToProject(userId: $userId, projectId: $projectId) {
        userId projectId role
      }
    }
  `;

  const REMOVE_USER = `
    mutation RemoveUser($userId: String!, $projectId: String!) {
      removeUserFromProject(userId: $userId, projectId: $projectId)
    }
  `;

  const LIST_PROJECTS = `
    query ListProjects { projects { id name deviceName } }
  `;

  let projectId: string;

  it('createProject mutation creates project with CEP', async () => {
    const { data, errors } = await gql(adminApp, CREATE_PROJECT, {
      name: 'Integration Test Device',
      deviceName: 'CardioStent Pro',
      deviceClass: 'IIb',
      regulatoryContext: 'CE_MDR',
    });

    expect(errors).toBeUndefined();
    expect(data?.createProject).toBeDefined();
    expect(data.createProject.name).toBe('Integration Test Device');
    expect(data.createProject.deviceName).toBe('CardioStent Pro');
    expect(data.createProject.deviceClass).toBe('IIb');
    expect(data.createProject.regulatoryContext).toBe('CE_MDR');
    // CEP auto-created
    expect(data.createProject.cep).toBeDefined();
    expect(data.createProject.cep.projectId).toBe(data.createProject.id);

    projectId = data.createProject.id;
  });

  it('updateProject mutation updates fields', async () => {
    const { data, errors } = await gql(adminApp, UPDATE_PROJECT, {
      id: projectId,
      name: 'Updated Device Name',
      deviceName: 'CardioStent Pro V2',
    });

    expect(errors).toBeUndefined();
    expect(data?.updateProject.name).toBe('Updated Device Name');
    expect(data.updateProject.deviceName).toBe('CardioStent Pro V2');

    // Verify in DB
    const dbProject = await prisma.project.findUnique({
      where: { id: projectId },
    });
    expect(dbProject!.name).toBe('Updated Device Name');
  });

  it('assignUserToProject creates membership', async () => {
    const { data, errors } = await gql(adminApp, ASSIGN_USER, {
      userId: CLINICAL_USER.id,
      projectId,
    });

    expect(errors).toBeUndefined();
    expect(data?.assignUserToProject).toBeDefined();
    expect(data.assignUserToProject.userId).toBe(CLINICAL_USER.id);
    expect(data.assignUserToProject.projectId).toBe(projectId);

    // Verify in DB
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: CLINICAL_USER.id },
      },
    });
    expect(membership).not.toBeNull();
  });

  it('removeUserFromProject removes membership', async () => {
    const { data, errors } = await gql(adminApp, REMOVE_USER, {
      userId: CLINICAL_USER.id,
      projectId,
    });

    expect(errors).toBeUndefined();
    expect(data?.removeUserFromProject).toBe(true);

    // Verify removed in DB
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: CLINICAL_USER.id },
      },
    });
    expect(membership).toBeNull();
  });

  it('non-member cannot access project details (membership check)', async () => {
    // CLINICAL_USER was removed from the project above. RA_MANAGER is also
    // not a member. Access to project query with membership check should fail.
    const GET_PROJECT = `
      query GetProject($id: String!) {
        project(id: $id) { id name }
      }
    `;

    const { errors } = await gql(raManagerApp, GET_PROJECT, {
      id: projectId,
    });

    expect(errors).toBeDefined();
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0]!.message).toMatch(/not a member|membership|denied/i);
  });

  it('projects query returns created projects (admin sees all)', async () => {
    const { data, errors } = await gql(adminApp, LIST_PROJECTS);

    expect(errors).toBeUndefined();
    expect(data?.projects).toBeDefined();
    expect(data.projects.length).toBeGreaterThanOrEqual(1);

    const names = data.projects.map((p: { name: string }) => p.name);
    expect(names).toContain('Updated Device Name');
  });
});

// =====================================================================
// 4. Audit Trail
// =====================================================================
describe('Audit Trail', () => {
  const AUDIT_LOGS = `
    query AuditLogs($targetType: String, $action: String, $limit: Int) {
      auditLogs(targetType: $targetType, action: $action, limit: $limit) {
        id userId action targetType targetId
      }
    }
  `;

  it('createUser mutation generates audit log entry', async () => {
    const { data, errors } = await gql(adminApp, AUDIT_LOGS, {
      action: 'user.created',
      limit: 10,
    });

    expect(errors).toBeUndefined();
    expect(data?.auditLogs).toBeDefined();
    expect(data.auditLogs.length).toBeGreaterThanOrEqual(1);

    const log = data.auditLogs[0];
    expect(log.action).toBe('user.created');
    expect(log.targetType).toBe('user');
    expect(log.userId).toBe(ADMIN_USER.id);
  });

  it('createProject mutation generates audit log entry', async () => {
    const { data, errors } = await gql(adminApp, AUDIT_LOGS, {
      action: 'project.created',
      limit: 10,
    });

    expect(errors).toBeUndefined();
    expect(data?.auditLogs).toBeDefined();
    expect(data.auditLogs.length).toBeGreaterThanOrEqual(1);

    const log = data.auditLogs[0];
    expect(log.action).toBe('project.created');
    expect(log.targetType).toBe('project');
    expect(log.userId).toBe(ADMIN_USER.id);
    expect(log.targetId).toBeDefined();
  });

  it('assignUserToProject generates audit log entry', async () => {
    const { data, errors } = await gql(adminApp, AUDIT_LOGS, {
      action: 'project.member.assigned',
      limit: 10,
    });

    expect(errors).toBeUndefined();
    expect(data?.auditLogs).toBeDefined();
    expect(data.auditLogs.length).toBeGreaterThanOrEqual(1);

    const log = data.auditLogs[0];
    expect(log.action).toBe('project.member.assigned');
    expect(log.targetType).toBe('project');
  });
});

// =====================================================================
// 5. RBAC
// =====================================================================
describe('RBAC', () => {
  it('ADMIN can access everything (users, projects, audit)', async () => {
    // Users
    const usersRes = await gql(adminApp, `query { users { total } }`);
    expect(usersRes.errors).toBeUndefined();

    // Projects
    const projectsRes = await gql(adminApp, `query { projects { id } }`);
    expect(projectsRes.errors).toBeUndefined();

    // Audit logs
    const auditRes = await gql(adminApp, `query { auditLogs(limit: 1) { id } }`);
    expect(auditRes.errors).toBeUndefined();
  });

  it('RA_MANAGER can read users and write projects', async () => {
    // users:read is allowed for RA_MANAGER
    const usersRes = await gql(raManagerApp, `query { users { total } }`);
    expect(usersRes.errors).toBeUndefined();

    // project:write is allowed -- create a project
    const { data, errors } = await gql(
      raManagerApp,
      `mutation {
        createProject(
          name: "RA Manager Project"
          deviceName: "Test Device RA"
          deviceClass: "IIa"
          regulatoryContext: "CE_MDR"
        ) { id name }
      }`,
    );
    expect(errors).toBeUndefined();
    expect(data?.createProject.name).toBe('RA Manager Project');
  });

  it('RA_MANAGER cannot admin users (createUser denied)', async () => {
    const { errors } = await gql(
      raManagerApp,
      `mutation {
        createUser(email: "ra-attempt@cortex-test.com", name: "Attempt", role: "ADMIN") {
          id
        }
      }`,
    );

    expect(errors).toBeDefined();
    expect(errors![0]!.message).toMatch(/cannot perform|permission|denied/i);
  });

  it('CLINICAL_SPECIALIST can read projects but not create users', async () => {
    // project:read is allowed for CLINICAL_SPECIALIST
    const projectsRes = await gql(clinicalApp, `query { projects { id name } }`);
    expect(projectsRes.errors).toBeUndefined();

    // users:admin is NOT allowed for CLINICAL_SPECIALIST
    const { errors } = await gql(
      clinicalApp,
      `mutation {
        createUser(email: "clin-attempt@cortex-test.com", name: "Attempt", role: "ADMIN") {
          id
        }
      }`,
    );
    expect(errors).toBeDefined();
    expect(errors![0]!.message).toMatch(/cannot perform|permission|denied/i);
  });

  it('CLINICAL_SPECIALIST cannot read audit logs', async () => {
    // audit:read is NOT in CLINICAL_SPECIALIST permissions
    const { errors } = await gql(clinicalApp, `query { auditLogs(limit: 1) { id } }`);

    expect(errors).toBeDefined();
    expect(errors![0]!.message).toMatch(/cannot perform|permission|denied/i);
  });
});
