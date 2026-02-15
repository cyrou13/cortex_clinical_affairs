import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadEvaluatorCvUseCase } from './upload-evaluator-cv.js';

const EVALUATOR_ID = 'eval-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  evaluator?: Record<string, unknown> | null;
}) {
  return {
    evaluator: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.evaluator !== undefined
          ? overrides.evaluator
          : { id: EVALUATOR_ID },
      ),
      update: vi.fn().mockResolvedValue({ id: EVALUATOR_ID }),
    },
  } as any;
}

describe('UploadEvaluatorCvUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a PDF CV successfully', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    const result = await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      filename: 'cv.pdf',
      size: 1024 * 1024,
      mimetype: 'application/pdf',
      filePath: '/uploads/cv.pdf',
      userId: USER_ID,
    });

    expect(result.evaluatorId).toBe(EVALUATOR_ID);
    expect(result.cvFilename).toBe('cv.pdf');
    expect(result.cvUploadedAt).toBeDefined();
  });

  it('uploads a DOCX CV successfully', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    const result = await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      filename: 'cv.docx',
      size: 512 * 1024,
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filePath: '/uploads/cv.docx',
      userId: USER_ID,
    });

    expect(result.cvFilename).toBe('cv.docx');
  });

  it('throws ValidationError for invalid file type', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        filename: 'cv.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
        filePath: '/uploads/cv.jpg',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Invalid file type');
  });

  it('throws ValidationError when file exceeds 10MB', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        filename: 'cv.pdf',
        size: 11 * 1024 * 1024,
        mimetype: 'application/pdf',
        filePath: '/uploads/cv.pdf',
        userId: USER_ID,
      }),
    ).rejects.toThrow('exceeds maximum');
  });

  it('throws ValidationError when file size is 0', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        filename: 'cv.pdf',
        size: 0,
        mimetype: 'application/pdf',
        filePath: '/uploads/cv.pdf',
        userId: USER_ID,
      }),
    ).rejects.toThrow('must be greater than 0');
  });

  it('throws ValidationError for empty filename', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        filename: '',
        size: 1024,
        mimetype: 'application/pdf',
        filePath: '/uploads/cv.pdf',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Filename is required');
  });

  it('throws NotFoundError when evaluator does not exist', async () => {
    const prisma = makePrisma({ evaluator: null });
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: 'missing',
        filename: 'cv.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        filePath: '/uploads/cv.pdf',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('updates evaluator record with file details', async () => {
    const prisma = makePrisma();
    const useCase = new UploadEvaluatorCvUseCase(prisma);

    await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      filename: 'cv.pdf',
      size: 2048,
      mimetype: 'application/pdf',
      filePath: '/uploads/cv.pdf',
      userId: USER_ID,
    });

    expect(prisma.evaluator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVALUATOR_ID },
        data: expect.objectContaining({
          cvFilename: 'cv.pdf',
          cvFilePath: '/uploads/cv.pdf',
          cvMimetype: 'application/pdf',
          cvSize: 2048,
        }),
      }),
    );
  });
});
