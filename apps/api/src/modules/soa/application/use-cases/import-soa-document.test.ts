import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportSoaDocumentUseCase } from './import-soa-document.js';

function makePrisma(overrides?: { project?: Record<string, unknown> | null }) {
  return {
    project: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.project !== undefined
            ? overrides.project
            : { id: 'proj-1', name: 'My Project' },
        ),
    },
    soaImport: {
      create: vi.fn().mockResolvedValue({ id: 'import-1' }),
      update: vi.fn().mockResolvedValue({ id: 'import-1' }),
    },
    asyncTask: {
      create: vi.fn().mockResolvedValue({ id: 'task-1' }),
    },
  } as any;
}

function makeEnqueueJob() {
  return vi.fn().mockResolvedValue('job-123');
}

describe('ImportSoaDocumentUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates import, async task, and enqueues job', async () => {
    const prisma = makePrisma();
    const enqueueJob = makeEnqueueJob();
    const useCase = new ImportSoaDocumentUseCase(prisma, enqueueJob);

    const fileContent = Buffer.from('fake pdf content').toString('base64');

    const result = await useCase.execute({
      projectId: 'proj-1',
      fileName: 'report.pdf',
      fileContent,
      fileFormat: 'PDF',
      userId: 'user-1',
    });

    expect(result.importId).toBeDefined();
    expect(result.taskId).toBeDefined();

    expect(prisma.soaImport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj-1',
          status: 'PROCESSING',
          sourceFileName: 'report.pdf',
          sourceFormat: 'PDF',
          createdById: 'user-1',
        }),
      }),
    );

    expect(prisma.asyncTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'soa.import-document',
          status: 'PENDING',
          progress: 0,
          createdBy: 'user-1',
        }),
      }),
    );

    expect(prisma.soaImport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taskId: expect.any(String) }),
      }),
    );

    expect(enqueueJob).toHaveBeenCalledWith(
      'soa.import-document',
      expect.objectContaining({
        type: 'soa.import-document',
        createdBy: 'user-1',
        metadata: expect.objectContaining({
          projectId: 'proj-1',
          sourceFormat: 'PDF',
          fileName: 'report.pdf',
        }),
      }),
    );
  });

  it('works with DOCX format', async () => {
    const prisma = makePrisma();
    const enqueueJob = makeEnqueueJob();
    const useCase = new ImportSoaDocumentUseCase(prisma, enqueueJob);

    const fileContent = Buffer.from('fake docx content').toString('base64');

    const result = await useCase.execute({
      projectId: 'proj-1',
      fileName: 'report.docx',
      fileContent,
      fileFormat: 'DOCX',
      userId: 'user-1',
    });

    expect(result.importId).toBeDefined();
    expect(prisma.soaImport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceFormat: 'DOCX' }),
      }),
    );
    expect(enqueueJob).toHaveBeenCalledWith(
      'soa.import-document',
      expect.objectContaining({
        metadata: expect.objectContaining({ sourceFormat: 'DOCX' }),
      }),
    );
  });

  it('throws ValidationError for invalid file format', async () => {
    const prisma = makePrisma();
    const enqueueJob = makeEnqueueJob();
    const useCase = new ImportSoaDocumentUseCase(prisma, enqueueJob);

    const fileContent = Buffer.from('some content').toString('base64');

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        fileName: 'report.txt',
        fileContent,
        fileFormat: 'TXT' as any,
        userId: 'user-1',
      }),
    ).rejects.toThrow('fileFormat must be PDF or DOCX');

    expect(prisma.project.findUnique).not.toHaveBeenCalled();
    expect(prisma.soaImport.create).not.toHaveBeenCalled();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when project does not exist', async () => {
    const prisma = makePrisma({ project: null });
    const enqueueJob = makeEnqueueJob();
    const useCase = new ImportSoaDocumentUseCase(prisma, enqueueJob);

    const fileContent = Buffer.from('some content').toString('base64');

    await expect(
      useCase.execute({
        projectId: 'missing-project',
        fileName: 'report.pdf',
        fileContent,
        fileFormat: 'PDF',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');

    expect(prisma.soaImport.create).not.toHaveBeenCalled();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('throws ValidationError when file content is empty', async () => {
    const prisma = makePrisma();
    const enqueueJob = makeEnqueueJob();
    const useCase = new ImportSoaDocumentUseCase(prisma, enqueueJob);

    // Empty base64 string decodes to a zero-length buffer
    const emptyContent = '';

    await expect(
      useCase.execute({
        projectId: 'proj-1',
        fileName: 'report.pdf',
        fileContent: emptyContent,
        fileFormat: 'PDF',
        userId: 'user-1',
      }),
    ).rejects.toThrow('File content is empty');

    expect(prisma.soaImport.create).not.toHaveBeenCalled();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('storage key includes projectId, importId, and correct extension', async () => {
    const prisma = makePrisma();
    const enqueueJob = makeEnqueueJob();
    const useCase = new ImportSoaDocumentUseCase(prisma, enqueueJob);

    const fileContent = Buffer.from('content').toString('base64');

    await useCase.execute({
      projectId: 'proj-42',
      fileName: 'doc.pdf',
      fileContent,
      fileFormat: 'PDF',
      userId: 'user-1',
    });

    const createCall = prisma.soaImport.create.mock.calls[0][0];
    expect(createCall.data.sourceStorageKey).toMatch(/^imports\/proj-42\/.+\/source\.pdf$/);
  });
});
