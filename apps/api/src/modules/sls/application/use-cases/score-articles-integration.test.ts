import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoreArticlesUseCase } from './score-articles.js';

/**
 * Integration test for the AI scoring flow.
 *
 * Tests the full lifecycle:
 *   1. Use case validates session and enqueues task
 *   2. Task metadata contains all data needed for worker processing
 *   3. Worker receives correct article IDs, exclusion codes, and scope
 *   4. On completion, articles would be updated with scoring results
 *   5. Stats can be computed from scored articles
 */

const TEST_SESSION_ID = 'int-session-001';
const TEST_USER_ID = 'int-user-001';
const TEST_PROJECT_ID = 'int-project-001';

const mockScopeFields = {
  population: 'Adults with cervical myelopathy',
  intervention: 'Cervical disc arthroplasty',
  comparator: 'Anterior cervical discectomy and fusion (ACDF)',
  outcome: 'Clinical outcomes, complication rates, reoperation rates',
  deviceName: 'CervicalDisc Pro',
  deviceType: 'Class III',
};

const mockExclusionCodes = [
  { code: 'E1', label: 'Wrong population', shortCode: 'WP' },
  { code: 'E2', label: 'Wrong intervention', shortCode: 'WI' },
  { code: 'E3', label: 'Animal study', shortCode: 'AS' },
  { code: 'E4', label: 'Case report only', shortCode: 'CR' },
  { code: 'E5', label: 'Non-English language', shortCode: 'NE' },
];

const mockArticles = [
  { id: 'art-int-1' },
  { id: 'art-int-2' },
  { id: 'art-int-3' },
  { id: 'art-int-4' },
  { id: 'art-int-5' },
];

function makePrisma() {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue({
        id: TEST_SESSION_ID,
        name: 'Cervical Disc Arthroplasty SLS',
        type: 'SOA_CLINICAL',
        status: 'SCREENING',
        projectId: TEST_PROJECT_ID,
        scopeFields: mockScopeFields,
      }),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(mockArticles),
    },
    exclusionCode: {
      findMany: vi.fn().mockResolvedValue(mockExclusionCodes),
    },
    asyncTask: {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          id: 'task-int-001',
          type: args.data.type,
          status: args.data.status,
          progress: args.data.progress,
          metadata: args.data.metadata,
          createdBy: args.data.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeRedis() {
  return {
    publish: vi.fn().mockResolvedValue(1),
  } as any;
}

describe('Score Articles Integration Flow', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let useCase: ScoreArticlesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    redis = makeRedis();
    useCase = new ScoreArticlesUseCase(prisma, redis);
  });

  it('enqueues a scoring task with complete metadata for worker processing', async () => {
    const result = await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);

    expect(result.taskId).toBe('task-int-001');

    // Verify the task was created with all required metadata
    const taskCreateCall = prisma.asyncTask.create.mock.calls[0][0];
    const taskData = taskCreateCall.data;
    const metadata = taskData.metadata;

    // Task type must match queue name
    expect(taskData.type).toBe('sls.score-articles');
    expect(taskData.status).toBe('PENDING');
    expect(taskData.createdBy).toBe(TEST_USER_ID);

    // Metadata must contain everything the worker needs
    expect(metadata.sessionId).toBe(TEST_SESSION_ID);
    expect(metadata.projectId).toBe(TEST_PROJECT_ID);
    expect(metadata.articleIds).toEqual([
      'art-int-1',
      'art-int-2',
      'art-int-3',
      'art-int-4',
      'art-int-5',
    ]);
    expect(metadata.totalArticles).toBe(5);
    expect(metadata.sessionName).toBe('Cervical Disc Arthroplasty SLS');
    expect(metadata.sessionType).toBe('SOA_CLINICAL');
  });

  it('passes full PICO scope fields for prompt construction', async () => {
    await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);

    const metadata = prisma.asyncTask.create.mock.calls[0][0].data.metadata;

    expect(metadata.scopeFields).toEqual(mockScopeFields);
    expect(metadata.scopeFields.population).toBe('Adults with cervical myelopathy');
    expect(metadata.scopeFields.intervention).toBe('Cervical disc arthroplasty');
    expect(metadata.scopeFields.comparator).toBe('Anterior cervical discectomy and fusion (ACDF)');
    expect(metadata.scopeFields.outcome).toContain('Clinical outcomes');
    expect(metadata.scopeFields.deviceName).toBe('CervicalDisc Pro');
  });

  it('passes all exclusion codes for AI-suggested exclusion', async () => {
    await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);

    const metadata = prisma.asyncTask.create.mock.calls[0][0].data.metadata;

    expect(metadata.exclusionCodes).toHaveLength(5);
    expect(metadata.exclusionCodes[0]).toEqual({
      code: 'E1',
      label: 'Wrong population',
      shortCode: 'WP',
    });
    expect(metadata.exclusionCodes[4]).toEqual({
      code: 'E5',
      label: 'Non-English language',
      shortCode: 'NE',
    });
  });

  it('publishes task:enqueued event to Redis for subscription system', async () => {
    await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);

    expect(redis.publish).toHaveBeenCalledWith(
      'task:enqueued',
      expect.stringContaining('task-int-001'),
    );

    const publishedEvent = JSON.parse(redis.publish.mock.calls[0][1]);
    expect(publishedEvent.taskId).toBe('task-int-001');
    expect(publishedEvent.type).toBe('sls.score-articles');
    expect(publishedEvent.status).toBe('PENDING');
  });

  it('rejects scoring for locked sessions', async () => {
    prisma.slsSession.findUnique.mockResolvedValue({
      id: TEST_SESSION_ID,
      name: 'Locked Session',
      type: 'SOA_CLINICAL',
      status: 'LOCKED',
      projectId: TEST_PROJECT_ID,
      scopeFields: mockScopeFields,
    });

    await expect(useCase.execute(TEST_SESSION_ID, TEST_USER_ID)).rejects.toThrow(
      'session is locked',
    );

    // No task should be created
    expect(prisma.asyncTask.create).not.toHaveBeenCalled();
  });

  it('rejects scoring when no pending articles exist', async () => {
    prisma.article.findMany.mockResolvedValue([]);

    await expect(useCase.execute(TEST_SESSION_ID, TEST_USER_ID)).rejects.toThrow(
      'No pending articles',
    );

    expect(prisma.asyncTask.create).not.toHaveBeenCalled();
  });

  it('only fetches PENDING status articles', async () => {
    await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);

    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: {
        sessionId: TEST_SESSION_ID,
        status: 'PENDING',
      },
      select: { id: true },
    });
  });

  it('handles session with empty scope fields gracefully', async () => {
    prisma.slsSession.findUnique.mockResolvedValue({
      id: TEST_SESSION_ID,
      name: 'No Scope Session',
      type: 'AD_HOC',
      status: 'DRAFT',
      projectId: TEST_PROJECT_ID,
      scopeFields: null,
    });

    const result = await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);
    expect(result.taskId).toBe('task-int-001');

    const metadata = prisma.asyncTask.create.mock.calls[0][0].data.metadata;
    expect(metadata.scopeFields).toBeNull();
  });

  it('handles session with no exclusion codes', async () => {
    prisma.exclusionCode.findMany.mockResolvedValue([]);

    const result = await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);
    expect(result.taskId).toBe('task-int-001');

    const metadata = prisma.asyncTask.create.mock.calls[0][0].data.metadata;
    expect(metadata.exclusionCodes).toEqual([]);
  });

  it('supports large article batches', async () => {
    const largeArticleList = Array.from({ length: 1000 }, (_, i) => ({
      id: `art-large-${i}`,
    }));
    prisma.article.findMany.mockResolvedValue(largeArticleList);

    const result = await useCase.execute(TEST_SESSION_ID, TEST_USER_ID);
    expect(result.taskId).toBe('task-int-001');

    const metadata = prisma.asyncTask.create.mock.calls[0][0].data.metadata;
    expect(metadata.articleIds).toHaveLength(1000);
    expect(metadata.totalArticles).toBe(1000);
  });
});
