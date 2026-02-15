import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CreateComplaintUseCase } from '../create-complaint.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({ id: 'cycle-1' }),
    },
    complaint: {
      create: vi.fn().mockResolvedValue({
        id: 'complaint-1',
        pmsCycleId: 'cycle-1',
        date: new Date('2026-01-15'),
        description: 'Device malfunction reported',
        deviceIdentifier: 'DEV-001',
        severity: 'HIGH',
        classification: 'MALFUNCTION',
        status: 'OPEN',
        source: 'MANUAL',
        isIncident: false,
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('CreateComplaintUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CreateComplaintUseCase;

  const validInput = {
    pmsCycleId: 'cycle-1',
    date: '2026-01-15',
    reportDate: '2026-01-16',
    description: 'Device malfunction reported',
    deviceIdentifier: 'DEV-001',
    severity: 'HIGH',
    classification: 'MALFUNCTION',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CreateComplaintUseCase(prisma);
  });

  it('creates a complaint with OPEN status and MANUAL source', async () => {
    const result = await useCase.execute(validInput);

    expect(result.status).toBe('OPEN');
    expect(result.source).toBe('MANUAL');
    expect(result.severity).toBe('HIGH');
    expect(result.pmsCycleId).toBe('cycle-1');
    expect((prisma as any).complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          severity: 'HIGH',
          status: 'OPEN',
          source: 'MANUAL',
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('throws ValidationError for invalid severity', async () => {
    await expect(
      useCase.execute({ ...validInput, severity: 'EXTREME' }),
    ).rejects.toThrow('Invalid complaint severity');
  });

  it('throws ValidationError when description is empty', async () => {
    await expect(
      useCase.execute({ ...validInput, description: '   ' }),
    ).rejects.toThrow('Complaint description is required');
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new CreateComplaintUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });

  it('sets optional fields to null when not provided', async () => {
    await useCase.execute(validInput);

    expect((prisma as any).complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lotNumber: null,
          serialNumber: null,
          isIncident: false,
          regulatoryReportRequired: false,
          harmSeverity: null,
        }),
      }),
    );
  });
});
