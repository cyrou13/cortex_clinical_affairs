import { describe, it, expect, beforeEach } from 'vitest';
import { GetPipelineStatusUseCase, type ModuleStatus } from './get-pipeline-status.js';

function makePrisma() {
  return {} as any;
}

describe('GetPipelineStatusUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: GetPipelineStatusUseCase;

  beforeEach(() => {
    prisma = makePrisma();
    useCase = new GetPipelineStatusUseCase(prisma);
  });

  describe('getDependencies', () => {
    it('returns empty array for SLS (no dependencies)', () => {
      expect(GetPipelineStatusUseCase.getDependencies('sls')).toEqual([]);
    });

    it('returns SLS as dependency for SOA', () => {
      expect(GetPipelineStatusUseCase.getDependencies('soa')).toEqual(['sls']);
    });

    it('returns SOA as dependency for validation', () => {
      expect(GetPipelineStatusUseCase.getDependencies('validation')).toEqual(['soa']);
    });

    it('returns SLS, SOA, and validation as dependencies for CER', () => {
      expect(GetPipelineStatusUseCase.getDependencies('cer')).toEqual(['sls', 'soa', 'validation']);
    });

    it('returns CER as dependency for PMS', () => {
      expect(GetPipelineStatusUseCase.getDependencies('pms')).toEqual(['cer']);
    });

    it('returns empty array for unknown module', () => {
      expect(GetPipelineStatusUseCase.getDependencies('unknown')).toEqual([]);
    });
  });

  describe('getBlockedReason', () => {
    it('returns correct reason for SOA', () => {
      expect(GetPipelineStatusUseCase.getBlockedReason('soa')).toBe(
        'Requires at least one locked SLS session',
      );
    });

    it('returns correct reason for validation', () => {
      expect(GetPipelineStatusUseCase.getBlockedReason('validation')).toBe(
        'Requires at least one locked SOA analysis',
      );
    });

    it('returns correct reason for CER', () => {
      expect(GetPipelineStatusUseCase.getBlockedReason('cer')).toBe(
        'Requires locked SLS, SOA, and Validation',
      );
    });

    it('returns correct reason for PMS', () => {
      expect(GetPipelineStatusUseCase.getBlockedReason('pms')).toBe(
        'Requires a locked CER version',
      );
    });

    it('returns undefined for SLS (no blocked reason)', () => {
      expect(GetPipelineStatusUseCase.getBlockedReason('sls')).toBeUndefined();
    });

    it('returns undefined for unknown module', () => {
      expect(GetPipelineStatusUseCase.getBlockedReason('unknown')).toBeUndefined();
    });
  });

  describe('areDependenciesMet', () => {
    it('returns true for SLS (no dependencies)', () => {
      const statuses: Record<string, ModuleStatus> = {};
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'sls')).toBe(true);
    });

    it('returns true for SOA when SLS is LOCKED', () => {
      const statuses: Record<string, ModuleStatus> = { sls: 'LOCKED' };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'soa')).toBe(true);
    });

    it('returns true for SOA when SLS is COMPLETED', () => {
      const statuses: Record<string, ModuleStatus> = { sls: 'COMPLETED' };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'soa')).toBe(true);
    });

    it('returns false for SOA when SLS is NOT_STARTED', () => {
      const statuses: Record<string, ModuleStatus> = { sls: 'NOT_STARTED' };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'soa')).toBe(false);
    });

    it('returns false for SOA when SLS is ACTIVE', () => {
      const statuses: Record<string, ModuleStatus> = { sls: 'ACTIVE' };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'soa')).toBe(false);
    });

    it('returns false for SOA when SLS is BLOCKED', () => {
      const statuses: Record<string, ModuleStatus> = { sls: 'BLOCKED' };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'soa')).toBe(false);
    });

    it('returns true for CER when all dependencies are LOCKED', () => {
      const statuses: Record<string, ModuleStatus> = {
        sls: 'LOCKED',
        soa: 'LOCKED',
        validation: 'LOCKED',
      };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'cer')).toBe(true);
    });

    it('returns true for CER when all dependencies are COMPLETED', () => {
      const statuses: Record<string, ModuleStatus> = {
        sls: 'COMPLETED',
        soa: 'COMPLETED',
        validation: 'COMPLETED',
      };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'cer')).toBe(true);
    });

    it('returns true for CER with mix of LOCKED and COMPLETED', () => {
      const statuses: Record<string, ModuleStatus> = {
        sls: 'LOCKED',
        soa: 'COMPLETED',
        validation: 'LOCKED',
      };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'cer')).toBe(true);
    });

    it('returns false for CER when any dependency is not met', () => {
      const statuses: Record<string, ModuleStatus> = {
        sls: 'LOCKED',
        soa: 'ACTIVE',
        validation: 'LOCKED',
      };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'cer')).toBe(false);
    });

    it('returns false for CER when a dependency is missing', () => {
      const statuses: Record<string, ModuleStatus> = {
        sls: 'LOCKED',
        soa: 'LOCKED',
      };
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'cer')).toBe(false);
    });

    it('returns true for unknown module (no dependencies)', () => {
      const statuses: Record<string, ModuleStatus> = {};
      expect(GetPipelineStatusUseCase.areDependenciesMet(statuses, 'unknown')).toBe(true);
    });
  });

  describe('execute', () => {
    it('returns NOT_STARTED for SLS', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.sls.status).toBe('NOT_STARTED');
      expect(result.sls.itemCount).toBe(0);
      expect(result.sls.lockedCount).toBe(0);
      expect(result.sls.blockedReason).toBeUndefined();
    });

    it('returns BLOCKED for SOA with reason', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.soa.status).toBe('BLOCKED');
      expect(result.soa.blockedReason).toBe('Requires at least one locked SLS session');
    });

    it('returns BLOCKED for validation with reason', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.validation.status).toBe('BLOCKED');
      expect(result.validation.blockedReason).toBe('Requires at least one locked SOA analysis');
    });

    it('returns BLOCKED for CER with reason', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.cer.status).toBe('BLOCKED');
      expect(result.cer.blockedReason).toBe('Requires locked SLS, SOA, and Validation');
    });

    it('returns BLOCKED for PMS with reason', async () => {
      const result = await useCase.execute('proj-1');
      expect(result.pms.status).toBe('BLOCKED');
      expect(result.pms.blockedReason).toBe('Requires a locked CER version');
    });

    it('returns zero counts for all modules', async () => {
      const result = await useCase.execute('proj-1');
      const modules = [result.sls, result.soa, result.validation, result.cer, result.pms];
      for (const mod of modules) {
        expect(mod.itemCount).toBe(0);
        expect(mod.lockedCount).toBe(0);
      }
    });
  });
});
