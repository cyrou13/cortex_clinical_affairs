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
    const soa = await (this.prisma as any).soaAnalysis.findUnique({
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

    const device = await (this.prisma as any).similarDevice.create({
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
    const device = await (this.prisma as any).similarDevice.findUnique({
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

    const benchmark = await (this.prisma as any).benchmark.create({
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
    const soa = await (this.prisma as any).soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const devices = await (this.prisma as any).similarDevice.findMany({
      where: { soaAnalysisId },
      include: {
        benchmarks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return devices;
  }
}
