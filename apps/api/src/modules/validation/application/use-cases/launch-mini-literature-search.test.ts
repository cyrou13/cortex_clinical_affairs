import { describe, it, expect, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { LaunchMiniLiteratureSearchUseCase } from './launch-mini-literature-search.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// Mock Prisma
const mockPrisma = {
  validationStudy: {
    findUnique: async () => null as any,
    update: async (args: any) => args.data as any,
  },
  slsSession: {
    create: async (args: any) => args.data as any,
  },
} as unknown as PrismaClient;

describe('LaunchMiniLiteratureSearchUseCase', () => {
  let useCase: LaunchMiniLiteratureSearchUseCase;

  beforeEach(() => {
    useCase = new LaunchMiniLiteratureSearchUseCase(mockPrisma);
  });

  it('should throw NotFoundError if study does not exist', async () => {
    (mockPrisma.validationStudy.findUnique as any) = async () => null as any;

    await expect(
      useCase.execute({
        validationStudyId: 'study-123',
        userId: 'user-1',
        searchTerm: 'MRMC methodology',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError if study is not MRMC type', async () => {
    mockPrisma.validationStudy.findUnique = (async () =>
      ({
        id: 'study-123',
        type: 'STANDALONE',
        status: 'DRAFT',
        projectId: 'project-1',
      }) as any) as any;

    await expect(
      useCase.execute({
        validationStudyId: 'study-123',
        userId: 'user-1',
        searchTerm: 'MRMC methodology',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if study is locked', async () => {
    mockPrisma.validationStudy.findUnique = (async () =>
      ({
        id: 'study-123',
        type: 'MRMC',
        status: 'LOCKED',
        projectId: 'project-1',
      }) as any) as any;

    await expect(
      useCase.execute({
        validationStudyId: 'study-123',
        userId: 'user-1',
        searchTerm: 'MRMC methodology',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should create SLS session and link to validation study for MRMC study', async () => {
    const slsSessionData: any = { id: '', data: {} };
    const updateData: any = { data: {} };

    mockPrisma.validationStudy.findUnique = (async () =>
      ({
        id: 'study-123',
        type: 'MRMC',
        status: 'DRAFT',
        projectId: 'project-1',
      }) as any) as any;

    (mockPrisma as any).slsSession.create = async (args: any) => {
      slsSessionData.id = args.data.id;
      slsSessionData.data = args.data;
      return args.data;
    };

    (mockPrisma.validationStudy.update as any) = async (args: any) => {
      updateData.data = args.data;
      return { id: 'study-123', ...args.data } as any;
    };

    const result = await useCase.execute({
      validationStudyId: 'study-123',
      userId: 'user-1',
      searchTerm: 'MRMC methodology',
    });

    expect(result.slsSessionId).toBeDefined();
    expect(result.validationStudyId).toBe('study-123');
    expect(slsSessionData.data.type).toBe('ad_hoc');
    expect(slsSessionData.data.searchTerm).toBe('MRMC methodology');
    expect(updateData.data.slsSessionId).toBe(result.slsSessionId);
  });
});
