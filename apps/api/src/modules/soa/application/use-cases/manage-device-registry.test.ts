import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageDeviceRegistryUseCase } from './manage-device-registry.js';

const SOA_ID = 'soa-1';
const DEVICE_ID = 'dev-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  device?: Record<string, unknown> | null;
  devices?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soa !== undefined
          ? overrides.soa
          : { id: SOA_ID, status: 'IN_PROGRESS' },
      ),
    },
    similarDevice: {
      create: vi.fn().mockResolvedValue({ id: DEVICE_ID, deviceName: 'Device A' }),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.device !== undefined
          ? overrides.device
          : {
              id: DEVICE_ID,
              soaAnalysis: { id: SOA_ID, status: 'IN_PROGRESS' },
            },
      ),
      findMany: vi.fn().mockResolvedValue(
        overrides?.devices ?? [
          {
            id: DEVICE_ID,
            deviceName: 'Device A',
            benchmarks: [{ id: 'bench-1', metricName: 'Safety' }],
          },
        ],
      ),
    },
    benchmark: {
      create: vi.fn().mockResolvedValue({ id: 'bench-1', metricName: 'Safety' }),
    },
  } as any;
}

describe('ManageDeviceRegistryUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a device to the SOA analysis', async () => {
    const prisma = makePrisma();
    const useCase = new ManageDeviceRegistryUseCase(prisma);

    const result = await useCase.addDevice({
      soaAnalysisId: SOA_ID,
      deviceName: 'Device A',
      manufacturer: 'MedCorp',
      indication: 'Cardiac monitoring',
      regulatoryStatus: 'CE_MARKED',
      userId: USER_ID,
    });

    expect(result.id).toBe(DEVICE_ID);
    expect(prisma.similarDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          soaAnalysisId: SOA_ID,
          deviceName: 'Device A',
          manufacturer: 'MedCorp',
        }),
      }),
    );
  });

  it('throws NotFoundError when SOA not found for addDevice', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new ManageDeviceRegistryUseCase(prisma);

    await expect(
      useCase.addDevice({
        soaAnalysisId: 'missing',
        deviceName: 'Device',
        manufacturer: 'Corp',
        indication: 'Test',
        regulatoryStatus: 'CE_MARKED',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when SOA is locked for addDevice', async () => {
    const prisma = makePrisma({ soa: { id: SOA_ID, status: 'LOCKED' } });
    const useCase = new ManageDeviceRegistryUseCase(prisma);

    await expect(
      useCase.addDevice({
        soaAnalysisId: SOA_ID,
        deviceName: 'Device',
        manufacturer: 'Corp',
        indication: 'Test',
        regulatoryStatus: 'CE_MARKED',
        userId: USER_ID,
      }),
    ).rejects.toThrow('locked');
  });

  it('adds a benchmark to a device', async () => {
    const prisma = makePrisma();
    const useCase = new ManageDeviceRegistryUseCase(prisma);

    const result = await useCase.addBenchmark({
      soaAnalysisId: SOA_ID,
      similarDeviceId: DEVICE_ID,
      metricName: 'Safety',
      metricValue: '98.5',
      unit: '%',
      sourceDescription: 'Clinical trial data',
    });

    expect(result.id).toBe('bench-1');
    expect(prisma.benchmark.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          similarDeviceId: DEVICE_ID,
          metricName: 'Safety',
          metricValue: '98.5',
          unit: '%',
        }),
      }),
    );
  });

  it('throws NotFoundError when device not found for addBenchmark', async () => {
    const prisma = makePrisma({ device: null });
    const useCase = new ManageDeviceRegistryUseCase(prisma);

    await expect(
      useCase.addBenchmark({
        soaAnalysisId: SOA_ID,
        similarDeviceId: 'missing',
        metricName: 'Safety',
        metricValue: '98.5',
        unit: '%',
      }),
    ).rejects.toThrow('not found');
  });

  it('returns devices with benchmarks', async () => {
    const prisma = makePrisma();
    const useCase = new ManageDeviceRegistryUseCase(prisma);

    const result = await useCase.getDevicesWithBenchmarks(SOA_ID);

    expect(result).toHaveLength(1);
    expect(result[0].benchmarks).toHaveLength(1);
    expect(prisma.similarDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { soaAnalysisId: SOA_ID },
        include: { benchmarks: true },
      }),
    );
  });
});
