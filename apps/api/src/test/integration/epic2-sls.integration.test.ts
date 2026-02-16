/// <reference types="vitest" />
/**
 * Epic 2 — Systematic Literature Search (SLS) Integration Tests
 *
 * Tests the full SLS workflow through the GraphQL API layer:
 * session CRUD, query management, article import, exclusion codes,
 * screening, AI configuration, and end-to-end workflow.
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  createTestApp,
  getTestPrisma,
  disconnectPrisma,
  ADMIN_USER,
  CLINICAL_USER,
} from './helpers/test-server.js';
import { gql } from './helpers/graphql-client.js';
import { cleanDatabase } from './helpers/cleanup.js';
import {
  seedAdminUser,
  seedUser,
  seedProject,
  seedProjectMembership,
  seedCep,
} from './helpers/seed.js';

// ── Shared state across tests ──────────────────────────────────────

let app: FastifyInstance;
let noMemberApp: FastifyInstance;
let prisma: PrismaClient;

// Use proper UUIDs for all IDs (Zod schemas validate UUID format)
const PROJECT_UUID = randomUUID();
const CEP_UUID = randomUUID();

let projectId: string;
let sessionId: string;
let queryId: string;
let articleIds: string[] = [];
let exclusionCodeId: string;

// ── Setup & Teardown ───────────────────────────────────────────────

beforeAll(async () => {
  prisma = getTestPrisma();
  app = await createTestApp(ADMIN_USER);
  noMemberApp = await createTestApp(CLINICAL_USER);

  await cleanDatabase(prisma);

  // Seed admin user + clinical user
  await seedAdminUser(prisma);
  await seedUser(prisma, 'CLINICAL_SPECIALIST', {
    id: CLINICAL_USER.id,
    email: 'clinical@cortex-test.com',
    name: 'Clinical User',
  });

  // Seed project and membership for admin only (use UUID)
  const project = await seedProject(prisma, ADMIN_USER.id, {
    id: PROJECT_UUID,
    name: 'Epic 2 Test Project',
  });
  projectId = project.id;

  await seedProjectMembership(prisma, projectId, ADMIN_USER.id);

  // Seed a CEP (required by createSlsSession use case)
  await seedCep(prisma, projectId, { id: CEP_UUID });
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await disconnectPrisma();
});

// ── 1. Session CRUD ────────────────────────────────────────────────

describe('Session CRUD', () => {
  it('createSlsSession creates a session linked to a project', async () => {
    const result = await gql(
      app,
      `
      mutation CreateSession($name: String!, $type: String!, $projectId: String!) {
        createSlsSession(name: $name, type: $type, projectId: $projectId) {
          id
          name
          type
          status
          projectId
          createdById
          scopeFields
        }
      }
    `,
      {
        name: 'MDR Literature Review',
        type: 'SOA_CLINICAL',
        projectId,
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createSlsSession).toBeDefined();

    const session = result.data!.createSlsSession;
    expect(session.name).toBe('MDR Literature Review');
    expect(session.type).toBe('SOA_CLINICAL');
    expect(session.status).toBe('DRAFT');
    expect(session.projectId).toBe(projectId);
    expect(session.createdById).toBe(ADMIN_USER.id);
    expect(session.id).toBeTruthy();

    // Store for subsequent tests
    sessionId = session.id;
  });

  it('updateSlsSession updates name and scopeFields', async () => {
    const newScope = { population: 'Adults', intervention: 'Device X' };

    const result = await gql(
      app,
      `
      mutation UpdateSession($id: String!, $name: String, $scopeFields: JSON) {
        updateSlsSession(id: $id, name: $name, scopeFields: $scopeFields) {
          id
          name
          scopeFields
        }
      }
    `,
      {
        id: sessionId,
        name: 'Updated SLS Session',
        scopeFields: newScope,
      },
    );

    expect(result.errors).toBeUndefined();

    const session = result.data!.updateSlsSession;
    expect(session.name).toBe('Updated SLS Session');
    expect(session.scopeFields).toEqual(newScope);
  });

  it('cannot create session without project membership (non-admin user)', async () => {
    const result = await gql(
      noMemberApp,
      `
      mutation CreateSession($name: String!, $type: String!, $projectId: String!) {
        createSlsSession(name: $name, type: $type, projectId: $projectId) {
          id
        }
      }
    `,
      {
        name: 'Unauthorized Session',
        type: 'SOA_CLINICAL',
        projectId,
      },
    );

    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]!.message).toContain('Not a member');
  });
});

// ── 2. Query Management ────────────────────────────────────────────

describe('Query Management', () => {
  it('createQuery creates a query linked to a session', async () => {
    const result = await gql(
      app,
      `
      mutation CreateQuery($sessionId: String!, $name: String!, $queryString: String!) {
        createQuery(sessionId: $sessionId, name: $name, queryString: $queryString) {
          id
          sessionId
          name
          queryString
          version
          isActive
          createdById
        }
      }
    `,
      {
        sessionId,
        name: 'PubMed Safety Query',
        queryString: '(medical device) AND (safety)',
      },
    );

    expect(result.errors).toBeUndefined();

    const query = result.data!.createQuery;
    expect(query.sessionId).toBe(sessionId);
    expect(query.name).toBe('PubMed Safety Query');
    expect(query.queryString).toBe('(medical device) AND (safety)');
    expect(query.version).toBe(1);
    expect(query.isActive).toBe(true);
    expect(query.createdById).toBe(ADMIN_USER.id);

    queryId = query.id;
  });

  it('updateQuery modifies the queryString and bumps version', async () => {
    const result = await gql(
      app,
      `
      mutation UpdateQuery($id: String!, $queryString: String!) {
        updateQuery(id: $id, queryString: $queryString) {
          id
          queryString
          version
        }
      }
    `,
      {
        id: queryId,
        queryString: '(medical device) AND (safety OR adverse event)',
      },
    );

    expect(result.errors).toBeUndefined();

    const query = result.data!.updateQuery;
    expect(query.queryString).toBe('(medical device) AND (safety OR adverse event)');
    expect(query.version).toBe(2);
  });

  it('duplicateQuery creates a copy with same queryString', async () => {
    const result = await gql(
      app,
      `
      mutation DuplicateQuery($id: String!) {
        duplicateQuery(id: $id) {
          id
          sessionId
          queryString
          version
          isActive
          parentQueryId
        }
      }
    `,
      {
        id: queryId,
      },
    );

    expect(result.errors).toBeUndefined();

    const dup = result.data!.duplicateQuery;
    expect(dup.id).not.toBe(queryId);
    expect(dup.sessionId).toBe(sessionId);
    expect(dup.queryString).toBe('(medical device) AND (safety OR adverse event)');
    expect(dup.version).toBe(1);
    expect(dup.isActive).toBe(true);
    expect(dup.parentQueryId).toBe(queryId);
  });

  it('deleteQuery soft-deletes (sets isActive=false)', async () => {
    // Create a throwaway query to delete
    const createRes = await gql(
      app,
      `
      mutation CreateQuery($sessionId: String!, $name: String!, $queryString: String!) {
        createQuery(sessionId: $sessionId, name: $name, queryString: $queryString) {
          id
          isActive
        }
      }
    `,
      {
        sessionId,
        name: 'Query To Delete',
        queryString: '(device) AND (risk)',
      },
    );

    expect(createRes.errors).toBeUndefined();
    const tempQueryId = createRes.data!.createQuery.id;

    const result = await gql(
      app,
      `
      mutation DeleteQuery($id: String!) {
        deleteQuery(id: $id) {
          id
          isActive
        }
      }
    `,
      {
        id: tempQueryId,
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.deleteQuery.isActive).toBe(false);

    // Verify it no longer shows up in active queries list
    const listRes = await gql(
      app,
      `
      query ListQueries($sessionId: String!) {
        slsQueries(sessionId: $sessionId) {
          id
          isActive
        }
      }
    `,
      { sessionId },
    );

    const activeIds = listRes.data!.slsQueries.map((q: { id: string }) => q.id);
    expect(activeIds).not.toContain(tempQueryId);
  });

  it('cannot delete query in a LOCKED session', async () => {
    // Create a locked session with a query (use UUIDs)
    const lockedSessionId = randomUUID();
    const lockedQueryId = randomUUID();

    await prisma.slsSession.create({
      data: {
        id: lockedSessionId,
        projectId,
        cepId: CEP_UUID,
        name: 'Locked Session',
        type: 'SOA_CLINICAL',
        status: 'LOCKED',
        createdById: ADMIN_USER.id,
      },
    });

    await prisma.slsQuery.create({
      data: {
        id: lockedQueryId,
        sessionId: lockedSessionId,
        name: 'Locked Query',
        queryString: '(test) AND (locked)',
        version: 1,
        createdById: ADMIN_USER.id,
      },
    });

    const result = await gql(
      app,
      `
      mutation DeleteQuery($id: String!) {
        deleteQuery(id: $id) {
          id
        }
      }
    `,
      {
        id: lockedQueryId,
      },
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0]!.message).toContain('locked');
  });
});

// ── 3. Article Management ──────────────────────────────────────────

describe('Article Management', () => {
  it('importArticles creates articles in the session', async () => {
    // First create a query execution to reference (use UUID)
    const executionId = randomUUID();
    const execution = await prisma.queryExecution.create({
      data: {
        id: executionId,
        queryId,
        database: 'PUBMED',
        status: 'SUCCESS',
        articlesFound: 3,
        articlesImported: 0,
      },
    });

    const articles = [
      {
        title: 'Safety of cardiac implants: a systematic review',
        abstract: 'This study reviews the safety profile of cardiac devices.',
        authors: ['Doe J', 'Smith A'],
        doi: '10.1000/test-001',
        pmid: '12345001',
        sourceDatabase: 'PUBMED',
      },
      {
        title: 'Efficacy of neurostimulators in chronic pain',
        abstract: 'A meta-analysis of neurostimulator outcomes.',
        authors: ['Smith J', 'Brown B'],
        doi: '10.1000/test-002',
        pmid: '12345002',
        sourceDatabase: 'PUBMED',
      },
      {
        title: 'Post-market surveillance for Class III devices',
        abstract: 'Review of PMS requirements under MDR.',
        authors: ['Brown B', 'Lee C'],
        doi: '10.1000/test-003',
        pmid: '12345003',
        sourceDatabase: 'PUBMED',
      },
    ];

    const result = await gql(
      app,
      `
      mutation ImportArticles(
        $sessionId: String!,
        $queryId: String!,
        $executionId: String!,
        $articles: [JSON!]!
      ) {
        importArticles(
          sessionId: $sessionId,
          queryId: $queryId,
          executionId: $executionId,
          articles: $articles
        ) {
          importedCount
          duplicateCount
          stats {
            totalBefore
            totalAfter
            duplicatesByDoi
            duplicatesByPmid
            duplicatesByTitle
          }
        }
      }
    `,
      {
        sessionId,
        queryId,
        executionId: execution.id,
        articles,
      },
    );

    expect(result.errors).toBeUndefined();

    const importResult = result.data!.importArticles;
    expect(importResult.importedCount).toBe(3);
    expect(importResult.duplicateCount).toBe(0);
    expect(importResult.stats.totalAfter).toBe(3);

    // Fetch article IDs from DB for subsequent tests
    const dbArticles = await prisma.article.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    articleIds = dbArticles.map((a) => a.id);
    expect(articleIds.length).toBe(3);
  });

  it('updateArticleStatus transitions article from PENDING to SCORED', async () => {
    const result = await gql(
      app,
      `
      mutation UpdateStatus($id: String!, $status: String!) {
        updateArticleStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `,
      {
        id: articleIds[0],
        status: 'SCORED',
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.updateArticleStatus.status).toBe('SCORED');
  });

  it('invalid status transition returns error', async () => {
    // Article[0] is now SCORED; trying to go back to PENDING is invalid
    const result = await gql(
      app,
      `
      mutation UpdateStatus($id: String!, $status: String!) {
        updateArticleStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `,
      {
        id: articleIds[0],
        status: 'PENDING',
      },
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0]!.message).toContain('Invalid status transition');
  });
});

// ── 4. Exclusion Codes ─────────────────────────────────────────────

describe('Exclusion Codes', () => {
  let secondCodeId: string;

  it('addExclusionCode creates code for session', async () => {
    // shortCode must match pattern E1-E99
    // code must match ^[A-Za-z0-9_]+$
    const result = await gql(
      app,
      `
      mutation AddCode(
        $sessionId: String!,
        $code: String!,
        $label: String!,
        $shortCode: String!,
        $description: String
      ) {
        addExclusionCode(
          sessionId: $sessionId,
          code: $code,
          label: $label,
          shortCode: $shortCode,
          description: $description
        ) {
          id
          sessionId
          code
          label
          shortCode
          description
          isHidden
          displayOrder
        }
      }
    `,
      {
        sessionId,
        code: 'EC_001',
        label: 'Not relevant population',
        shortCode: 'E1',
        description: 'Study population does not match target',
      },
    );

    expect(result.errors).toBeUndefined();

    const code = result.data!.addExclusionCode;
    expect(code.sessionId).toBe(sessionId);
    expect(code.code).toBe('EC_001');
    expect(code.label).toBe('Not relevant population');
    expect(code.shortCode).toBe('E1');
    expect(code.description).toBe('Study population does not match target');
    expect(code.isHidden).toBe(false);
    expect(code.displayOrder).toBe(0);

    exclusionCodeId = code.id;
  });

  it('renameExclusionCode updates label', async () => {
    // shortCode must match E1-E99 pattern
    const result = await gql(
      app,
      `
      mutation RenameCode($id: String!, $label: String!, $shortCode: String) {
        renameExclusionCode(id: $id, label: $label, shortCode: $shortCode) {
          id
          label
          shortCode
        }
      }
    `,
      {
        id: exclusionCodeId,
        label: 'Irrelevant population',
        shortCode: 'E2',
      },
    );

    expect(result.errors).toBeUndefined();

    const code = result.data!.renameExclusionCode;
    expect(code.label).toBe('Irrelevant population');
    expect(code.shortCode).toBe('E2');
  });

  it('hideExclusionCode sets hidden flag', async () => {
    // Create a second code to hide (keep the first for screening tests)
    const createRes = await gql(
      app,
      `
      mutation AddCode(
        $sessionId: String!,
        $code: String!,
        $label: String!,
        $shortCode: String!
      ) {
        addExclusionCode(
          sessionId: $sessionId,
          code: $code,
          label: $label,
          shortCode: $shortCode
        ) {
          id
          isHidden
        }
      }
    `,
      {
        sessionId,
        code: 'EC_HIDE',
        label: 'To be hidden',
        shortCode: 'E3',
      },
    );

    expect(createRes.errors).toBeUndefined();
    const hideCodeId = createRes.data!.addExclusionCode.id;

    const result = await gql(
      app,
      `
      mutation HideCode($id: String!) {
        hideExclusionCode(id: $id) {
          id
          isHidden
        }
      }
    `,
      {
        id: hideCodeId,
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.hideExclusionCode.isHidden).toBe(true);

    // Verify hidden code does not appear in exclusionCodes query
    const listRes = await gql(
      app,
      `
      query ListCodes($sessionId: String!) {
        exclusionCodes(sessionId: $sessionId) {
          id
        }
      }
    `,
      { sessionId },
    );

    const visibleIds = listRes.data!.exclusionCodes.map((c: { id: string }) => c.id);
    expect(visibleIds).not.toContain(hideCodeId);
  });

  it('reorderExclusionCodes updates order', async () => {
    // Create a third code for reorder test
    const createRes = await gql(
      app,
      `
      mutation AddCode(
        $sessionId: String!,
        $code: String!,
        $label: String!,
        $shortCode: String!
      ) {
        addExclusionCode(
          sessionId: $sessionId,
          code: $code,
          label: $label,
          shortCode: $shortCode
        ) {
          id
        }
      }
    `,
      {
        sessionId,
        code: 'EC_002',
        label: 'Wrong device type',
        shortCode: 'E4',
      },
    );

    expect(createRes.errors).toBeUndefined();
    secondCodeId = createRes.data!.addExclusionCode.id;

    // Reorder: put secondCode first, then first code
    const result = await gql(
      app,
      `
      mutation Reorder($sessionId: String!, $orderedIds: [String!]!) {
        reorderExclusionCodes(sessionId: $sessionId, orderedIds: $orderedIds) {
          id
          displayOrder
        }
      }
    `,
      {
        sessionId,
        orderedIds: [secondCodeId, exclusionCodeId],
      },
    );

    expect(result.errors).toBeUndefined();

    const codes = result.data!.reorderExclusionCodes;
    const reorderedMap = new Map(
      codes.map((c: { id: string; displayOrder: number }) => [c.id, c.displayOrder]),
    );
    expect(reorderedMap.get(secondCodeId)).toBe(0);
    expect(reorderedMap.get(exclusionCodeId)).toBe(1);
  });
});

// ── 5. Screening ───────────────────────────────────────────────────

describe('Screening', () => {
  it('screenArticle records a screening decision', async () => {
    // Article[0] is SCORED from the earlier test — screen it as INCLUDED
    const result = await gql(
      app,
      `
      mutation Screen(
        $articleId: String!,
        $decision: String!,
        $reason: String!
      ) {
        screenArticle(
          articleId: $articleId,
          decision: $decision,
          reason: $reason
        ) {
          id
          status
        }
      }
    `,
      {
        articleId: articleIds[0],
        decision: 'INCLUDED',
        reason: 'Directly relevant to the clinical evaluation scope',
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.screenArticle.status).toBe('INCLUDED');

    // Verify a screening decision record was created
    const decisions = await prisma.screeningDecision.findMany({
      where: { articleId: articleIds[0] },
    });
    expect(decisions.length).toBeGreaterThanOrEqual(1);

    const latestDecision = decisions[decisions.length - 1]!;
    expect(latestDecision.decision).toBe('INCLUDED');
    expect(latestDecision.reason).toBe('Directly relevant to the clinical evaluation scope');
    expect(latestDecision.previousStatus).toBe('SCORED');
    expect(latestDecision.newStatus).toBe('INCLUDED');
  });

  it('bulkScreenArticles processes multiple articles', async () => {
    // First transition article[1] and article[2] to SCORED
    await prisma.article.updateMany({
      where: { id: { in: [articleIds[1]!, articleIds[2]!] } },
      data: { status: 'SCORED' },
    });

    const result = await gql(
      app,
      `
      mutation BulkScreen(
        $sessionId: String!,
        $articleIds: [String!]!,
        $decision: String!,
        $exclusionCodeId: String,
        $reason: String!
      ) {
        bulkScreenArticles(
          sessionId: $sessionId,
          articleIds: $articleIds,
          decision: $decision,
          exclusionCodeId: $exclusionCodeId,
          reason: $reason
        ) {
          successCount
          totalRequested
        }
      }
    `,
      {
        sessionId,
        articleIds: [articleIds[1], articleIds[2]],
        decision: 'EXCLUDED',
        exclusionCodeId,
        reason: 'Population not matching the clinical scope',
      },
    );

    expect(result.errors).toBeUndefined();

    const bulkResult = result.data!.bulkScreenArticles;
    expect(bulkResult.successCount).toBe(2);
    expect(bulkResult.totalRequested).toBe(2);

    // Verify articles are now EXCLUDED
    const updatedArticles = await prisma.article.findMany({
      where: { id: { in: [articleIds[1]!, articleIds[2]!] } },
    });
    for (const a of updatedArticles) {
      expect(a.status).toBe('EXCLUDED');
    }
  });
});

// ── 6. AI Configuration ───────────────────────────────────────────

describe('AI Configuration', () => {
  it('configureRelevanceThresholds sets thresholds on session', async () => {
    const result = await gql(
      app,
      `
      mutation ConfigThresholds(
        $sessionId: String!,
        $likelyRelevantThreshold: Int!,
        $uncertainLowerThreshold: Int!
      ) {
        configureRelevanceThresholds(
          sessionId: $sessionId,
          likelyRelevantThreshold: $likelyRelevantThreshold,
          uncertainLowerThreshold: $uncertainLowerThreshold
        ) {
          likelyRelevantThreshold
          uncertainLowerThreshold
        }
      }
    `,
      {
        sessionId,
        likelyRelevantThreshold: 80,
        uncertainLowerThreshold: 45,
      },
    );

    expect(result.errors).toBeUndefined();

    const thresholds = result.data!.configureRelevanceThresholds;
    expect(thresholds.likelyRelevantThreshold).toBe(80);
    expect(thresholds.uncertainLowerThreshold).toBe(45);

    // Verify via query
    const queryRes = await gql(
      app,
      `
      query GetThresholds($sessionId: String!) {
        relevanceThresholds(sessionId: $sessionId) {
          likelyRelevantThreshold
          uncertainLowerThreshold
        }
      }
    `,
      { sessionId },
    );

    expect(queryRes.data!.relevanceThresholds.likelyRelevantThreshold).toBe(80);
    expect(queryRes.data!.relevanceThresholds.uncertainLowerThreshold).toBe(45);
  });

  it('createCustomAiFilter creates filter for session', async () => {
    const result = await gql(
      app,
      `
      mutation CreateFilter(
        $sessionId: String!,
        $name: String!,
        $criterion: String!
      ) {
        createCustomAiFilter(
          sessionId: $sessionId,
          name: $name,
          criterion: $criterion
        ) {
          id
          sessionId
          name
          criterion
          isActive
        }
      }
    `,
      {
        sessionId,
        name: 'Human Studies Only',
        criterion: 'Include only if the study involves human subjects',
      },
    );

    expect(result.errors).toBeUndefined();

    const filter = result.data!.createCustomAiFilter;
    expect(filter.sessionId).toBe(sessionId);
    expect(filter.name).toBe('Human Studies Only');
    expect(filter.criterion).toBe('Include only if the study involves human subjects');
    expect(filter.isActive).toBe(true);

    // Verify via query
    const queryRes = await gql(
      app,
      `
      query ListFilters($sessionId: String!) {
        customAiFilters(sessionId: $sessionId) {
          id
          name
        }
      }
    `,
      { sessionId },
    );

    const filterNames = queryRes.data!.customAiFilters.map((f: { name: string }) => f.name);
    expect(filterNames).toContain('Human Studies Only');
  });
});

// ── 7. End-to-End Workflow ─────────────────────────────────────────

describe('End-to-End Workflow', () => {
  let e2eSessionId: string;
  let e2eQueryId: string;
  let e2eArticleIds: string[];

  it('full workflow: create session -> create query -> import articles -> screen -> verify counts', async () => {
    // Step 1: Create a fresh session
    const sessionRes = await gql(
      app,
      `
      mutation CreateSession($name: String!, $type: String!, $projectId: String!) {
        createSlsSession(name: $name, type: $type, projectId: $projectId) {
          id
          name
          status
        }
      }
    `,
      {
        name: 'E2E Workflow Session',
        type: 'PMS_UPDATE',
        projectId,
      },
    );

    expect(sessionRes.errors).toBeUndefined();
    e2eSessionId = sessionRes.data!.createSlsSession.id;
    expect(sessionRes.data!.createSlsSession.status).toBe('DRAFT');

    // Step 2: Create a query
    const queryRes = await gql(
      app,
      `
      mutation CreateQuery($sessionId: String!, $name: String!, $queryString: String!) {
        createQuery(sessionId: $sessionId, name: $name, queryString: $queryString) {
          id
          name
          queryString
          version
        }
      }
    `,
      {
        sessionId: e2eSessionId,
        name: 'E2E PubMed Query',
        queryString: '(implant) AND (complication)',
      },
    );

    expect(queryRes.errors).toBeUndefined();
    e2eQueryId = queryRes.data!.createQuery.id;
    expect(queryRes.data!.createQuery.version).toBe(1);

    // Step 3: Create a query execution reference (use UUID)
    const e2eExecId = randomUUID();
    const execution = await prisma.queryExecution.create({
      data: {
        id: e2eExecId,
        queryId: e2eQueryId,
        database: 'PUBMED',
        status: 'SUCCESS',
        articlesFound: 5,
        articlesImported: 0,
      },
    });

    // Step 4: Import 5 articles
    const articlesToImport = Array.from({ length: 5 }, (_, i) => ({
      title: `E2E Article ${i + 1}: Implant complication study`,
      abstract: `Abstract for article ${i + 1} about implant complications.`,
      authors: [`Author${i + 1} A`],
      doi: `10.9999/e2e-${String(i + 1).padStart(3, '0')}`,
      pmid: `99990${i + 1}`,
      sourceDatabase: 'PUBMED',
    }));

    const importRes = await gql(
      app,
      `
      mutation ImportArticles(
        $sessionId: String!,
        $queryId: String!,
        $executionId: String!,
        $articles: [JSON!]!
      ) {
        importArticles(
          sessionId: $sessionId,
          queryId: $queryId,
          executionId: $executionId,
          articles: $articles
        ) {
          importedCount
          duplicateCount
        }
      }
    `,
      {
        sessionId: e2eSessionId,
        queryId: e2eQueryId,
        executionId: execution.id,
        articles: articlesToImport,
      },
    );

    expect(importRes.errors).toBeUndefined();
    expect(importRes.data!.importArticles.importedCount).toBe(5);

    // Get article IDs
    const dbArticles = await prisma.article.findMany({
      where: { sessionId: e2eSessionId },
      orderBy: { createdAt: 'asc' },
    });
    e2eArticleIds = dbArticles.map((a) => a.id);
    expect(e2eArticleIds.length).toBe(5);

    // Step 5: Transition all articles to SCORED (simulating AI scoring)
    await prisma.article.updateMany({
      where: { sessionId: e2eSessionId },
      data: { status: 'SCORED' },
    });

    // Step 6: Add an exclusion code (use valid shortCode pattern E1-E99)
    const codeRes = await gql(
      app,
      `
      mutation AddCode(
        $sessionId: String!,
        $code: String!,
        $label: String!,
        $shortCode: String!
      ) {
        addExclusionCode(
          sessionId: $sessionId,
          code: $code,
          label: $label,
          shortCode: $shortCode
        ) {
          id
        }
      }
    `,
      {
        sessionId: e2eSessionId,
        code: 'E2E_EC1',
        label: 'Off-topic',
        shortCode: 'E5',
      },
    );

    expect(codeRes.errors).toBeUndefined();
    const e2eExclusionCodeId = codeRes.data!.addExclusionCode.id;

    // Step 7: Screen articles — include 3, exclude 2
    // Include articles 0, 1, 2
    for (let i = 0; i < 3; i++) {
      const screenRes = await gql(
        app,
        `
        mutation Screen($articleId: String!, $decision: String!, $reason: String!) {
          screenArticle(articleId: $articleId, decision: $decision, reason: $reason) {
            id
            status
          }
        }
      `,
        {
          articleId: e2eArticleIds[i],
          decision: 'INCLUDED',
          reason: 'Relevant to the clinical evaluation',
        },
      );

      expect(screenRes.errors).toBeUndefined();
      expect(screenRes.data!.screenArticle.status).toBe('INCLUDED');
    }

    // Exclude articles 3, 4 via bulk screen
    const bulkRes = await gql(
      app,
      `
      mutation BulkScreen(
        $sessionId: String!,
        $articleIds: [String!]!,
        $decision: String!,
        $exclusionCodeId: String,
        $reason: String!
      ) {
        bulkScreenArticles(
          sessionId: $sessionId,
          articleIds: $articleIds,
          decision: $decision,
          exclusionCodeId: $exclusionCodeId,
          reason: $reason
        ) {
          successCount
          totalRequested
        }
      }
    `,
      {
        sessionId: e2eSessionId,
        articleIds: [e2eArticleIds[3], e2eArticleIds[4]],
        decision: 'EXCLUDED',
        exclusionCodeId: e2eExclusionCodeId,
        reason: 'Does not match study scope',
      },
    );

    expect(bulkRes.errors).toBeUndefined();
    expect(bulkRes.data!.bulkScreenArticles.successCount).toBe(2);

    // Step 8: Verify counts via articleCountByStatus query
    const countRes = await gql(
      app,
      `
      query Counts($sessionId: String!) {
        articleCountByStatus(sessionId: $sessionId) {
          counts
        }
      }
    `,
      { sessionId: e2eSessionId },
    );

    expect(countRes.errors).toBeUndefined();

    const counts = countRes.data!.articleCountByStatus.counts;
    expect(counts.INCLUDED).toBe(3);
    expect(counts.EXCLUDED).toBe(2);

    // Step 9: Verify articles paginated query works
    const articlesRes = await gql(
      app,
      `
      query Articles($sessionId: String!) {
        articles(sessionId: $sessionId, limit: 10) {
          items {
            id
            title
            status
          }
          total
        }
      }
    `,
      { sessionId: e2eSessionId },
    );

    expect(articlesRes.errors).toBeUndefined();
    expect(articlesRes.data!.articles.total).toBe(5);
    expect(articlesRes.data!.articles.items.length).toBe(5);

    // Step 10: Verify session can be queried
    const sessionDetail = await gql(
      app,
      `
      query GetSession($id: String!) {
        slsSession(id: $id) {
          id
          name
          status
          metrics {
            articleCount
            queryCount
          }
        }
      }
    `,
      { id: e2eSessionId },
    );

    expect(sessionDetail.errors).toBeUndefined();
    expect(sessionDetail.data!.slsSession.name).toBe('E2E Workflow Session');
  });
});
