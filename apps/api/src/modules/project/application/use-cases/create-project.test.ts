import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../shared/utils/uuid.js', () => ({
  generateId: vi.fn()
    .mockReturnValueOnce('project-uuid-1')
    .mockReturnValueOnce('cep-uuid-1')
    .mockReturnValueOnce('member-uuid-1'),
}));

import { CreateProjectUseCase } from './create-project.js';

function makePrisma() {
  return {
    project: {
      create: vi.fn().mockResolvedValue({
        id: 'project-uuid-1',
        name: 'CSpine Evaluation',
        deviceName: 'CINA CSpine',
        deviceClass: 'IIa',
        regulatoryContext: 'CE_MDR',
        status: 'ACTIVE',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        cep: { id: 'cep-uuid-1', projectId: 'project-uuid-1' },
        members: [{ id: 'member-uuid-1', userId: 'user-1', role: 'OWNER' }],
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CreateProjectUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let useCase: CreateProjectUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    eventBus = makeEventBus();
    useCase = new CreateProjectUseCase(prisma, eventBus);
  });

  it('creates a project with CEP and member', async () => {
    const result = await useCase.execute(
      {
        name: 'CSpine Evaluation',
        deviceName: 'CINA CSpine',
        deviceClass: 'IIa',
        regulatoryContext: 'CE_MDR',
      },
      'user-1',
      'req-1',
    );

    expect(result.id).toBe('project-uuid-1');
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'CSpine Evaluation',
          deviceName: 'CINA CSpine',
          deviceClass: 'IIa',
          regulatoryContext: 'CE_MDR',
          createdBy: 'user-1',
        }),
        include: expect.objectContaining({
          cep: true,
        }),
      }),
    );
  });

  it('emits project.project.created domain event', async () => {
    await useCase.execute(
      {
        name: 'CSpine Evaluation',
        deviceName: 'CINA CSpine',
        deviceClass: 'IIa',
        regulatoryContext: 'CE_MDR',
      },
      'user-1',
      'req-1',
    );

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'project.project.created',
        aggregateType: 'Project',
        data: expect.objectContaining({
          name: 'CSpine Evaluation',
          createdBy: 'user-1',
        }),
      }),
    );
  });

  it('creates an audit log entry', async () => {
    await useCase.execute(
      {
        name: 'CSpine Evaluation',
        deviceName: 'CINA CSpine',
        deviceClass: 'IIa',
        regulatoryContext: 'CE_MDR',
      },
      'user-1',
      'req-1',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'project.created',
          targetType: 'project',
        }),
      }),
    );
  });

  it('rejects invalid input (name too short)', async () => {
    await expect(
      useCase.execute(
        { name: 'AB', deviceName: 'Device', deviceClass: 'I', regulatoryContext: 'CE_MDR' },
        'user-1',
        'req-1',
      ),
    ).rejects.toThrow('at least 3 characters');
  });

  it('rejects invalid device class', async () => {
    await expect(
      useCase.execute(
        { name: 'Valid Name', deviceName: 'Device', deviceClass: 'IV', regulatoryContext: 'CE_MDR' },
        'user-1',
        'req-1',
      ),
    ).rejects.toThrow();
  });

  it('rejects missing required fields', async () => {
    await expect(
      useCase.execute({ name: 'Valid Name' }, 'user-1', 'req-1'),
    ).rejects.toThrow();
  });
});
