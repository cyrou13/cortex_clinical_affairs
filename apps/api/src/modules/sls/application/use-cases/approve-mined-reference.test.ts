import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApproveMinedReferenceUseCase } from './approve-mined-reference.js';

function makePrisma(reference: Record<string, unknown> | null = {
  id: 'ref-1',
  sessionId: 'sess-1',
  title: 'Reference Article',
  authors: [{ firstName: 'Jane', lastName: 'Doe' }],
  year: 2023,
  journal: 'J Med',
  doi: '10.5678/ref',
  pmid: null,
  approvalStatus: 'PENDING',
}) {
  return {
    minedReference: {
      findUnique: vi.fn().mockResolvedValue(reference),
      update: vi.fn().mockResolvedValue({ ...reference, approvalStatus: 'APPROVED' }),
    },
    article: {
      create: vi.fn().mockResolvedValue({ id: 'art-from-ref', status: 'PENDING' }),
    },
  } as any;
}

describe('ApproveMinedReferenceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves reference and creates article', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveMinedReferenceUseCase(prisma);

    const result = await useCase.approve({ referenceId: 'ref-1', userId: 'user-1' });

    expect(result.status).toBe('APPROVED');
    expect(result.articleId).toBe('art-from-ref');
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          sourceDatabase: 'REFERENCE_MINING',
        }),
      }),
    );
  });

  it('rejects reference with reason', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveMinedReferenceUseCase(prisma);

    const result = await useCase.reject({
      referenceId: 'ref-1',
      userId: 'user-1',
      reason: 'Not relevant',
    });

    expect(result.status).toBe('REJECTED');
    expect(prisma.minedReference.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalStatus: 'REJECTED',
          rejectionReason: 'Not relevant',
        }),
      }),
    );
  });

  it('throws NotFoundError for missing reference', async () => {
    const prisma = makePrisma(null);
    const useCase = new ApproveMinedReferenceUseCase(prisma);

    await expect(
      useCase.approve({ referenceId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when already approved', async () => {
    const prisma = makePrisma({ ...makePrisma().minedReference.findUnique(), approvalStatus: 'APPROVED' } as any);
    // Override findUnique to return APPROVED reference
    prisma.minedReference.findUnique.mockResolvedValue({
      id: 'ref-1',
      approvalStatus: 'APPROVED',
    });
    const useCase = new ApproveMinedReferenceUseCase(prisma);

    await expect(
      useCase.approve({ referenceId: 'ref-1', userId: 'user-1' }),
    ).rejects.toThrow('already approved');
  });

  it('sets approved by and timestamp', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveMinedReferenceUseCase(prisma);

    await useCase.approve({ referenceId: 'ref-1', userId: 'user-1' });

    expect(prisma.minedReference.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvedById: 'user-1',
          approvedAt: expect.any(Date),
        }),
      }),
    );
  });
});
