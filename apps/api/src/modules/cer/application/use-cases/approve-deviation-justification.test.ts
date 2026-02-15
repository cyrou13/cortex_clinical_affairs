import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApproveDeviationJustificationUseCase } from './approve-deviation-justification.js';

const DEVIATION_ID = 'dev-1';
const CER_VERSION_ID = 'cer-v1';
const APPROVER_ID = 'approver-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides?: {
  deviation?: Record<string, unknown> | null;
}) {
  return {
    pccpDeviation: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.deviation !== undefined
          ? overrides.deviation
          : {
              id: DEVIATION_ID,
              cerVersionId: CER_VERSION_ID,
              status: 'IDENTIFIED',
              justification: 'Valid justification text',
              significance: 'HIGH',
            },
      ),
      update: vi.fn().mockResolvedValue({
        id: DEVIATION_ID,
        status: 'APPROVED',
        justificationApproved: true,
      }),
    },
  } as any;
}

describe('ApproveDeviationJustificationUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('approves deviation justification with valid RA_MANAGER role', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    const result = await useCase.execute({
      deviationId: DEVIATION_ID,
      approverId: APPROVER_ID,
      approverRole: 'RA_MANAGER',
    });

    expect(result.status).toBe('APPROVED');
    expect(result.justificationApproved).toBe(true);
    expect(result.approvedById).toBe(APPROVER_ID);
    expect(result.approvedAt).toBeDefined();
  });

  it('approves with ADMIN role', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    const result = await useCase.execute({
      deviationId: DEVIATION_ID,
      approverId: APPROVER_ID,
      approverRole: 'ADMIN',
    });

    expect(result.status).toBe('APPROVED');
  });

  it('throws PermissionDeniedError for invalid role', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        deviationId: DEVIATION_ID,
        approverId: APPROVER_ID,
        approverRole: 'VIEWER',
      }),
    ).rejects.toThrow('Permission denied');
  });

  it('throws NotFoundError when deviation does not exist', async () => {
    const prisma = makePrisma({ deviation: null });
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        deviationId: 'missing',
        approverId: APPROVER_ID,
        approverRole: 'RA_MANAGER',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when deviation has no justification', async () => {
    const prisma = makePrisma({
      deviation: {
        id: DEVIATION_ID,
        cerVersionId: CER_VERSION_ID,
        status: 'IDENTIFIED',
        justification: null,
        significance: 'HIGH',
      },
    });
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        deviationId: DEVIATION_ID,
        approverId: APPROVER_ID,
        approverRole: 'RA_MANAGER',
      }),
    ).rejects.toThrow('without justification');
  });

  it('throws ValidationError when deviation is already APPROVED', async () => {
    const prisma = makePrisma({
      deviation: {
        id: DEVIATION_ID,
        cerVersionId: CER_VERSION_ID,
        status: 'APPROVED',
        justification: 'Some justification',
        significance: 'HIGH',
      },
    });
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        deviationId: DEVIATION_ID,
        approverId: APPROVER_ID,
        approverRole: 'RA_MANAGER',
      }),
    ).rejects.toThrow('Cannot approve deviation in APPROVED status');
  });

  it('emits cer.pccp-deviation.approved event', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    await useCase.execute({
      deviationId: DEVIATION_ID,
      approverId: APPROVER_ID,
      approverRole: 'RA_MANAGER',
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'cer.pccp-deviation.approved',
        aggregateType: 'PccpDeviation',
        data: expect.objectContaining({
          deviationId: DEVIATION_ID,
          cerVersionId: CER_VERSION_ID,
          approverId: APPROVER_ID,
        }),
      }),
    );
  });

  it('updates deviation status and approver fields', async () => {
    const prisma = makePrisma();
    const useCase = new ApproveDeviationJustificationUseCase(prisma, eventBus);

    await useCase.execute({
      deviationId: DEVIATION_ID,
      approverId: APPROVER_ID,
      approverRole: 'RA_MANAGER',
    });

    expect(prisma.pccpDeviation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DEVIATION_ID },
        data: expect.objectContaining({
          status: 'APPROVED',
          justificationApproved: true,
          approvedById: APPROVER_ID,
        }),
      }),
    );
  });
});
