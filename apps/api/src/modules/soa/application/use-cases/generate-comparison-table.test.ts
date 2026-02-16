import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateComparisonTableUseCase } from './generate-comparison-table.js';

const SOA_ID = 'soa-1';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  devices?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.soa !== undefined ? overrides.soa : { id: SOA_ID, projectId: 'proj-1' },
        ),
    },
    similarDevice: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.devices ?? [
          {
            id: 'dev-1',
            deviceName: 'Device A',
            manufacturer: 'MedCorp',
            indication: 'Cardiac',
            benchmarks: [
              { metricName: 'Sensitivity', metricValue: '90', unit: '%' },
              { metricName: 'Specificity', metricValue: '85', unit: '%' },
            ],
          },
          {
            id: 'dev-2',
            deviceName: 'Device B',
            manufacturer: 'HealthTech',
            indication: 'Cardiac',
            benchmarks: [{ metricName: 'Sensitivity', metricValue: '95', unit: '%' }],
          },
        ],
      ),
    },
  } as any;
}

describe('GenerateComparisonTableUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates comparison table with all metrics and devices', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateComparisonTableUseCase(prisma);

    const result = await useCase.execute(SOA_ID);

    expect(result.metrics).toContain('Sensitivity');
    expect(result.metrics).toContain('Specificity');
    expect(result.devices).toHaveLength(2);

    const device1 = result.devices.find((d) => d.deviceId === 'dev-1');
    expect(device1).toBeDefined();
    expect(device1!.deviceName).toBe('Device A');
    expect(device1!.values['Sensitivity']).toBe('90 %');
    expect(device1!.values['Specificity']).toBe('85 %');

    const device2 = result.devices.find((d) => d.deviceId === 'dev-2');
    expect(device2).toBeDefined();
    expect(device2!.values['Sensitivity']).toBe('95 %');
    expect(device2!.values['Specificity']).toBeNull();
  });

  it('returns empty table when no devices exist', async () => {
    const prisma = makePrisma({ devices: [] });
    const useCase = new GenerateComparisonTableUseCase(prisma);

    const result = await useCase.execute(SOA_ID);

    expect(result.metrics).toEqual([]);
    expect(result.devices).toEqual([]);
  });

  it('throws NotFoundError when SOA not found', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new GenerateComparisonTableUseCase(prisma);

    await expect(useCase.execute('missing')).rejects.toThrow('not found');
  });
});
