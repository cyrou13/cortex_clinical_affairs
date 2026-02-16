import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface AddDeviceInput {
  soaAnalysisId: string;
  deviceName: string;
  manufacturer: string;
  indication: string;
  regulatoryStatus: string;
  metadata?: Record<string, unknown>;
  userId: string;
}

interface AddBenchmarkInput {
  soaAnalysisId: string;
  similarDeviceId: string;
  metricName: string;
  metricValue: string;
  unit: string;
  sourceArticleId?: string;
  sourceDescription?: string;
}

export class ManageDeviceRegistryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async addDevice(input: AddDeviceInput) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soa.status === 'LOCKED') {
      throw new ValidationError('Cannot add device to a locked SOA analysis');
    }

    if (!input.deviceName.trim()) {
      throw new ValidationError('Device name is required');
    }

    const device = await this.prisma.similarDevice.create({
      data: {
        id: crypto.randomUUID(),
        soaAnalysisId: input.soaAnalysisId,
        deviceName: input.deviceName.trim(),
        manufacturer: input.manufacturer.trim(),
        indication: input.indication.trim(),
        regulatoryStatus: input.regulatoryStatus,
        metadata: (input.metadata ?? null) as unknown as Prisma.InputJsonValue,
        createdById: input.userId,
      },
    });

    return device;
  }

  async addBenchmark(input: AddBenchmarkInput) {
    const device = await this.prisma.similarDevice.findUnique({
      where: { id: input.similarDeviceId },
      include: {
        soaAnalysis: { select: { id: true, status: true } },
      },
    });

    if (!device) {
      throw new NotFoundError('SimilarDevice', input.similarDeviceId);
    }

    if (device.soaAnalysis?.id !== input.soaAnalysisId) {
      throw new NotFoundError('SimilarDevice', input.similarDeviceId);
    }

    if (device.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot add benchmark to a locked SOA analysis');
    }

    if (!input.metricName.trim()) {
      throw new ValidationError('Metric name is required');
    }

    const benchmark = await this.prisma.benchmark.create({
      data: {
        id: crypto.randomUUID(),
        similarDeviceId: input.similarDeviceId,
        metricName: input.metricName.trim(),
        metricValue: input.metricValue,
        unit: input.unit,
        sourceArticleId: input.sourceArticleId ?? null,
        sourceDescription: input.sourceDescription ?? null,
      },
    });

    return benchmark;
  }

  async getDevicesWithBenchmarks(soaAnalysisId: string) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const devices = await this.prisma.similarDevice.findMany({
      where: { soaAnalysisId },
      include: {
        benchmarks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return devices;
  }

  async aggregateBenchmarks(soaAnalysisId: string) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    // Get all benchmarks for all similar devices in this SOA
    const devices = await this.prisma.similarDevice.findMany({
      where: { soaAnalysisId },
      include: {
        benchmarks: true,
      },
    });

    // Group benchmarks by metric name
    const metricGroups: Record<
      string,
      Array<{ value: number; deviceId: string; unit: string }>
    > = {};

    for (const device of devices) {
      for (const benchmark of device.benchmarks) {
        if (!metricGroups[benchmark.metricName]) {
          metricGroups[benchmark.metricName] = [];
        }

        // Parse numeric value
        const numericValue = parseFloat(benchmark.metricValue);
        if (!isNaN(numericValue)) {
          metricGroups[benchmark.metricName]!.push({
            value: numericValue,
            deviceId: device.id,
            unit: benchmark.unit,
          });
        }
      }
    }

    // Calculate statistics for each metric
    const aggregatedMetrics = Object.entries(metricGroups).map(([metricName, values]) => {
      const numericValues = values.map((v) => v.value);
      const sortedValues = [...numericValues].sort((a, b) => a - b);

      const min = sortedValues[0] ?? 0;
      const max = sortedValues[sortedValues.length - 1] ?? 0;
      const sum = numericValues.reduce((acc, val) => acc + val, 0);
      const mean = numericValues.length > 0 ? sum / numericValues.length : 0;
      const median =
        sortedValues.length > 0
          ? sortedValues.length % 2 === 0
            ? (sortedValues[sortedValues.length / 2 - 1]! +
                sortedValues[sortedValues.length / 2]!) /
              2
            : sortedValues[Math.floor(sortedValues.length / 2)]!
          : 0;

      return {
        metricName,
        min,
        max,
        mean,
        median,
        range: max - min,
        deviceCount: new Set(values.map((v) => v.deviceId)).size,
        unit: values[0]?.unit ?? '',
      };
    });

    return aggregatedMetrics;
  }
}
