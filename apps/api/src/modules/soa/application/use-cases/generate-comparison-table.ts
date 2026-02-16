import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface ComparisonTableResult {
  metrics: string[];
  devices: Array<{
    deviceId: string;
    deviceName: string;
    manufacturer: string;
    indication: string;
    isSubjectDevice: boolean;
    values: Record<string, string | null>;
  }>;
}

export class GenerateComparisonTableUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(soaAnalysisId: string): Promise<ComparisonTableResult> {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true, projectId: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    // Get all similar devices with their benchmarks
    const devices = await this.prisma.similarDevice.findMany({
      where: { soaAnalysisId },
      include: {
        benchmarks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Collect all unique metrics
    const metricsSet = new Set<string>();
    for (const device of devices) {
      for (const benchmark of device.benchmarks) {
        metricsSet.add(benchmark.metricName);
      }
    }
    const metrics = Array.from(metricsSet).sort();

    // Build comparison table
    const comparisonDevices = devices.map((device) => {
      const values: Record<string, string | null> = {};

      for (const metric of metrics) {
        const benchmark = device.benchmarks.find((b) => b.metricName === metric);
        values[metric] = benchmark ? `${benchmark.metricValue} ${benchmark.unit}` : null;
      }

      return {
        deviceId: device.id,
        deviceName: device.deviceName,
        manufacturer: device.manufacturer,
        indication: device.indication,
        isSubjectDevice: false, // In a real scenario, we'd check against the project's device
        values,
      };
    });

    return {
      metrics,
      devices: comparisonDevices,
    };
  }
}
