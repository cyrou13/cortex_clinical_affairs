import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetrievePdfsUseCase } from './retrieve-pdfs.js';

const SESSION_ID = 'sess-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  session?: Record<string, unknown> | null;
  articles?: Array<Record<string, unknown>>;
}) {
  const session =
    overrides?.session !== undefined ? overrides.session : { id: SESSION_ID, status: 'SCREENING' };

  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(session),
    },
    article: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.articles ?? [{ id: 'art-1' }, { id: 'art-2' }, { id: 'art-3' }],
        ),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({ id: 'task-1' }),
    },
  } as any;
}

describe('RetrievePdfsUseCase', () => {
  let mockEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueue = vi.fn().mockResolvedValue('job-1');
  });

  it('creates async task and enqueues job', async () => {
    const prisma = makePrisma();
    const useCase = new RetrievePdfsUseCase(prisma, mockEnqueue);

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(result.taskId).toBe('task-1');
    expect(result.articleCount).toBe(3);
    expect(mockEnqueue).toHaveBeenCalledWith(
      'sls.retrieve-pdfs',
      expect.objectContaining({
        sessionId: SESSION_ID,
        taskId: 'task-1',
        articleIds: ['art-1', 'art-2', 'art-3'],
      }),
    );
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma({ session: null });
    const useCase = new RetrievePdfsUseCase(prisma, mockEnqueue);

    await expect(useCase.execute({ sessionId: 'missing', userId: USER_ID })).rejects.toThrow(
      'not found',
    );
  });

  it('throws ValidationError when no articles need PDFs', async () => {
    const prisma = makePrisma({ articles: [] });
    const useCase = new RetrievePdfsUseCase(prisma, mockEnqueue);

    await expect(useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })).rejects.toThrow(
      'No articles need PDF retrieval',
    );
  });

  it('updates article statuses to RETRIEVING', async () => {
    const prisma = makePrisma();
    const useCase = new RetrievePdfsUseCase(prisma, mockEnqueue);

    await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(prisma.article.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['art-1', 'art-2', 'art-3'] } },
      data: { pdfStatus: 'RETRIEVING' },
    });
  });

  it('queries only INCLUDED articles without PDFs', async () => {
    const prisma = makePrisma();
    const useCase = new RetrievePdfsUseCase(prisma, mockEnqueue);

    await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID });

    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: {
        sessionId: SESSION_ID,
        status: { in: ['INCLUDED', 'FINAL_INCLUDED'] },
        OR: [{ pdfStatus: 'NONE' }, { pdfStatus: null }, { pdfStatus: 'RETRIEVING' }],
      },
      select: { id: true },
    });
  });
});
