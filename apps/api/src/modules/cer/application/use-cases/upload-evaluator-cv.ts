import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadCvInput {
  evaluatorId: string;
  filename: string;
  size: number;
  mimetype: string;
  filePath: string;
  userId: string;
}

export interface UploadCvResult {
  evaluatorId: string;
  cvFilename: string;
  cvFilePath: string;
  cvUploadedAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class UploadEvaluatorCvUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UploadCvInput): Promise<UploadCvResult> {
    // Validate file type
    if (!ALLOWED_MIMETYPES.includes(input.mimetype)) {
      throw new ValidationError(`Invalid file type: ${input.mimetype}. Allowed types: PDF, DOCX`);
    }

    // Validate file size
    if (input.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size ${(input.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 10MB`,
      );
    }

    if (input.size <= 0) {
      throw new ValidationError('File size must be greater than 0');
    }

    // Validate filename
    if (!input.filename.trim()) {
      throw new ValidationError('Filename is required');
    }

    // Verify evaluator exists
    const evaluator = await this.prisma.evaluator.findUnique({
      where: { id: input.evaluatorId },
      select: { id: true },
    });

    if (!evaluator) {
      throw new NotFoundError('Evaluator', input.evaluatorId);
    }

    const now = new Date();

    await this.prisma.evaluator.update({
      where: { id: input.evaluatorId },
      data: {
        cvFilename: input.filename,
        cvFilePath: input.filePath,
        cvMimetype: input.mimetype,
        cvSize: input.size,
        cvUploadedAt: now,
      } as any,
    });

    return {
      evaluatorId: input.evaluatorId,
      cvFilename: input.filename,
      cvFilePath: input.filePath,
      cvUploadedAt: now.toISOString(),
    };
  }
}
