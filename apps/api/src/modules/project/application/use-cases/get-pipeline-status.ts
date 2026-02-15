import type { PrismaClient } from '@prisma/client';

export type ModuleStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED' | 'LOCKED' | 'BLOCKED';

export interface ModuleStatusInfo {
  status: ModuleStatus;
  itemCount: number;
  lockedCount: number;
  blockedReason?: string;
}

export interface PipelineStatusDetailed {
  sls: ModuleStatusInfo;
  soa: ModuleStatusInfo;
  validation: ModuleStatusInfo;
  cer: ModuleStatusInfo;
  pms: ModuleStatusInfo;
}

const PIPELINE_DEPENDENCIES: Record<string, string[]> = {
  sls: [],
  soa: ['sls'],
  validation: ['soa'],
  cer: ['sls', 'soa', 'validation'],
  pms: ['cer'],
};

const BLOCKED_REASONS: Record<string, string> = {
  soa: 'Requires at least one locked SLS session',
  validation: 'Requires at least one locked SOA analysis',
  cer: 'Requires locked SLS, SOA, and Validation',
  pms: 'Requires a locked CER version',
};

export class GetPipelineStatusUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string): Promise<PipelineStatusDetailed> {
    // For now, return default pipeline status since module tables don't exist yet
    // This will be enhanced when SLS, SOA, etc. modules are implemented
    return {
      sls: { status: 'NOT_STARTED', itemCount: 0, lockedCount: 0 },
      soa: { status: 'BLOCKED', itemCount: 0, lockedCount: 0, blockedReason: BLOCKED_REASONS.soa },
      validation: { status: 'BLOCKED', itemCount: 0, lockedCount: 0, blockedReason: BLOCKED_REASONS.validation },
      cer: { status: 'BLOCKED', itemCount: 0, lockedCount: 0, blockedReason: BLOCKED_REASONS.cer },
      pms: { status: 'BLOCKED', itemCount: 0, lockedCount: 0, blockedReason: BLOCKED_REASONS.pms },
    };
  }

  // Static method for dependency checking (used in tests)
  static getDependencies(module: string): string[] {
    return PIPELINE_DEPENDENCIES[module] ?? [];
  }

  static getBlockedReason(module: string): string | undefined {
    return BLOCKED_REASONS[module];
  }

  static areDependenciesMet(moduleStatuses: Record<string, ModuleStatus>, module: string): boolean {
    const deps = PIPELINE_DEPENDENCIES[module] ?? [];
    return deps.every((dep) => moduleStatuses[dep] === 'LOCKED' || moduleStatuses[dep] === 'COMPLETED');
  }
}
