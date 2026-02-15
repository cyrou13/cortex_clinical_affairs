import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateNamedDeviceSearchUseCase } from './create-named-device-search.js';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: 'cer-1', status: 'DRAFT' },
      ),
    },
    namedDeviceSearch: {
      create: vi.fn().mockResolvedValue({ id: 'search-1' }),
    },
  } as any;
}

describe('CreateNamedDeviceSearchUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a named device search', async () => {
    const prisma = makePrisma();
    const useCase = new CreateNamedDeviceSearchUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: 'cer-1',
      deviceName: 'CardioValve Pro',
      keywords: ['heart valve', 'prosthetic'],
      databases: ['MAUDE'],
      userId: 'user-1',
    });

    expect(result.searchId).toBeTruthy();
    expect(result.deviceName).toBe('CardioValve Pro');
    expect(result.status).toBe('PENDING');
    expect(prisma.namedDeviceSearch.create).toHaveBeenCalled();
  });

  it('throws when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new CreateNamedDeviceSearchUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'missing',
        deviceName: 'Device',
        keywords: ['kw'],
        databases: ['MAUDE'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when CER version is locked', async () => {
    const prisma = makePrisma({ cerVersion: { id: 'cer-1', status: 'LOCKED' } });
    const useCase = new CreateNamedDeviceSearchUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        deviceName: 'Device',
        keywords: ['kw'],
        databases: ['MAUDE'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });

  it('throws for empty device name', async () => {
    const prisma = makePrisma();
    const useCase = new CreateNamedDeviceSearchUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        deviceName: '',
        keywords: ['kw'],
        databases: ['MAUDE'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('Device name');
  });

  it('throws for invalid database', async () => {
    const prisma = makePrisma();
    const useCase = new CreateNamedDeviceSearchUseCase(prisma);

    await expect(
      useCase.execute({
        cerVersionId: 'cer-1',
        deviceName: 'Device',
        keywords: ['kw'],
        databases: ['INVALID'],
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid vigilance database');
  });
});
