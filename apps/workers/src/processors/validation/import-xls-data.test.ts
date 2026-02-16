import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { ImportXlsDataProcessor, type ImportXlsJobData } from './import-xls-data.js';

// Mock Prisma
const mockPrisma = {
  validationStudy: {
    findUnique: async () => null,
  },
  dataImport: {
    findFirst: async () => null,
    create: async (args: any) => args.data,
    updateMany: async () => ({ count: 0 }),
  },
} as unknown as PrismaClient;

// Mock Redis connection
const mockRedis = {
  publish: async () => 1,
  get: async () => null,
} as any;

describe('ImportXlsDataProcessor', () => {
  let processor: ImportXlsDataProcessor;

  beforeEach(() => {
    processor = new ImportXlsDataProcessor(mockRedis);
    processor.setPrisma(mockPrisma);
    vi.clearAllMocks();
  });

  it('should throw error if study not found', async () => {
    mockPrisma.validationStudy.findUnique = vi.fn().mockResolvedValue(null);

    const job = {
      data: {
        taskId: 'task-123',
        metadata: {
          validationStudyId: 'study-123',
          fileName: 'test.xlsx',
          headers: ['subject_id', 'ground_truth', 'prediction', 'confidence'],
          rawRows: [['S001', '1', '1', '0.95']],
          userId: 'user-1',
        },
      },
      updateProgress: async () => {},
    } as unknown as Job<ImportXlsJobData>;

    await expect(processor.process(job)).rejects.toThrow('ValidationStudy not found');
  });

  it('should throw error if study is locked', async () => {
    mockPrisma.validationStudy.findUnique = vi.fn().mockResolvedValue({
      id: 'study-123',
      status: 'LOCKED',
      type: 'STANDALONE',
    } as any);

    const job = {
      data: {
        taskId: 'task-123',
        metadata: {
          validationStudyId: 'study-123',
          fileName: 'test.xlsx',
          headers: ['subject_id', 'ground_truth', 'prediction', 'confidence'],
          rawRows: [['S001', '1', '1', '0.95']],
          userId: 'user-1',
        },
      },
      updateProgress: async () => {},
    } as unknown as Job<ImportXlsJobData>;

    await expect(processor.process(job)).rejects.toThrow(
      'Cannot import data for locked validation study',
    );
  });

  it('should successfully import valid XLS data', async () => {
    let createdImport: any = null;
    let deactivatedCount = 0;

    mockPrisma.validationStudy.findUnique = vi.fn().mockResolvedValue({
      id: 'study-123',
      status: 'DRAFT',
      type: 'STANDALONE',
    } as any);

    mockPrisma.dataImport.findFirst = vi.fn().mockResolvedValue(null);

    mockPrisma.dataImport.create = vi.fn().mockImplementation(async (args: any) => {
      createdImport = args.data;
      return args.data as any;
    });

    mockPrisma.dataImport.updateMany = vi.fn().mockImplementation(async () => {
      deactivatedCount++;
      return { count: 1 } as any;
    });

    const job = {
      data: {
        taskId: 'task-123',
        metadata: {
          validationStudyId: 'study-123',
          fileName: 'test.xlsx',
          headers: ['subject_id', 'ground_truth', 'prediction', 'confidence'],
          rawRows: [
            ['S001', 1, 1, 0.95],
            ['S002', 0, 0, 0.88],
          ],
          userId: 'user-1',
        },
      },
      updateProgress: async () => {},
    } as unknown as Job<ImportXlsJobData>;

    const result = await processor.process(job);

    expect(result.taskId).toBe('task-123');
    expect(result.version).toBe(1);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(4);
    expect(createdImport).not.toBeNull();
    expect(createdImport.validationStudyId).toBe('study-123');
    expect(createdImport.isActive).toBe(true);
    expect(createdImport.status).toBe('VALIDATED');
    expect(deactivatedCount).toBe(1);
  });

  it('should auto-increment version number', async () => {
    let createdImport: any = null;

    mockPrisma.validationStudy.findUnique = vi.fn().mockResolvedValue({
      id: 'study-123',
      status: 'DRAFT',
      type: 'STANDALONE',
    } as any);

    mockPrisma.dataImport.findFirst = vi.fn().mockResolvedValue({
      version: 2,
    } as any);

    mockPrisma.dataImport.create = vi.fn().mockImplementation(async (args: any) => {
      createdImport = args.data;
      return args.data as any;
    });

    mockPrisma.dataImport.updateMany = vi.fn().mockResolvedValue({ count: 0 } as any);

    const job = {
      data: {
        taskId: 'task-123',
        metadata: {
          validationStudyId: 'study-123',
          fileName: 'test.xlsx',
          headers: ['subject_id', 'ground_truth', 'prediction', 'confidence'],
          rawRows: [['S001', 1, 1, 0.95]],
          userId: 'user-1',
        },
      },
      updateProgress: async () => {},
    } as unknown as Job<ImportXlsJobData>;

    const result = await processor.process(job);

    expect(result.version).toBe(3);
    expect(createdImport.version).toBe(3);
  });
});
