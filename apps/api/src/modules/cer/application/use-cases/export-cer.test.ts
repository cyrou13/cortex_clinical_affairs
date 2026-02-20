import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportCerUseCase } from './export-cer.js';

const CER_VERSION_ID = 'cer-v1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';
const TASK_ID = 'task-1';

function makeTaskService() {
  return {
    enqueueTask: vi.fn().mockResolvedValue({ id: TASK_ID }),
  };
}

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sectionCount?: number;
}) {
  return {
    cerVersion: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.cerVersion !== undefined
            ? overrides.cerVersion
            : { id: CER_VERSION_ID, status: 'FINALIZED', projectId: PROJECT_ID },
        ),
    },
    cerSection: {
      count: vi
        .fn()
        .mockResolvedValue(overrides?.sectionCount !== undefined ? overrides.sectionCount : 14),
    },
  } as any;
}

describe('ExportCerUseCase', () => {
  let taskService: ReturnType<typeof makeTaskService>;

  beforeEach(() => {
    vi.clearAllMocks();
    taskService = makeTaskService();
  });

  it('enqueues export job with CER_MDR format', async () => {
    const prisma = makePrisma();
    const useCase = new ExportCerUseCase(prisma, taskService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      exportFormat: 'CER_MDR',
      userId: USER_ID,
    });

    expect(result.jobId).toBe(TASK_ID);
    expect(result.exportFormat).toBe('CER_MDR');
    expect(result.status).toBe('PENDING');
  });

  it('enqueues export job with CEP format', async () => {
    const prisma = makePrisma();
    const useCase = new ExportCerUseCase(prisma, taskService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      exportFormat: 'CEP',
      userId: USER_ID,
    });

    expect(result.exportFormat).toBe('CEP');
  });

  it('throws ValidationError for invalid export format', async () => {
    const prisma = makePrisma();
    const useCase = new ExportCerUseCase(prisma, taskService);

    await expect(
      useCase.execute({
        cerVersionId: CER_VERSION_ID,
        exportFormat: 'INVALID',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Invalid export format');
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new ExportCerUseCase(prisma, taskService);

    await expect(
      useCase.execute({
        cerVersionId: 'missing',
        exportFormat: 'CER_MDR',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when no sections exist', async () => {
    const prisma = makePrisma({ sectionCount: 0 });
    const useCase = new ExportCerUseCase(prisma, taskService);

    await expect(
      useCase.execute({
        cerVersionId: CER_VERSION_ID,
        exportFormat: 'CER_MDR',
        userId: USER_ID,
      }),
    ).rejects.toThrow('no sections');
  });

  it('passes correct job data to task service', async () => {
    const prisma = makePrisma();
    const useCase = new ExportCerUseCase(prisma, taskService);

    await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      exportFormat: 'GSPR_TABLE',
      userId: USER_ID,
    });

    expect(taskService.enqueueTask).toHaveBeenCalledWith(
      'cer.generate-docx',
      expect.objectContaining({
        cerVersionId: CER_VERSION_ID,
        exportFormat: 'GSPR_TABLE',
        projectId: PROJECT_ID,
      }),
      USER_ID,
    );
  });

  it('accepts PCCP export format', async () => {
    const prisma = makePrisma();
    const useCase = new ExportCerUseCase(prisma, taskService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      exportFormat: 'PCCP',
      userId: USER_ID,
    });

    expect(result.exportFormat).toBe('PCCP');
  });

  it('returns cerVersionId in result', async () => {
    const prisma = makePrisma();
    const useCase = new ExportCerUseCase(prisma, taskService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      exportFormat: 'CER_MDR',
      userId: USER_ID,
    });

    expect(result.cerVersionId).toBe(CER_VERSION_ID);
  });
});
