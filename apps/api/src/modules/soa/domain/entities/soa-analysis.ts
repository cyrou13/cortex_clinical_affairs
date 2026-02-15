import type { SoaType } from '../value-objects/soa-type.js';
import type { SoaStatus } from '../value-objects/soa-status.js';
import { canTransition, isLocked } from '../value-objects/soa-status.js';
import { ValidationError } from '../../../../shared/errors/index.js';

export interface SoaAnalysisData {
  id: string;
  projectId: string;
  type: SoaType;
  status: SoaStatus;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lockedAt: string | null;
  lockedById: string | null;
}

export function validateTransition(from: SoaStatus, to: SoaStatus): boolean {
  return canTransition(from, to);
}

export function transitionStatus(
  analysis: SoaAnalysisData,
  newStatus: SoaStatus,
): SoaAnalysisData {
  if (!canTransition(analysis.status, newStatus)) {
    throw new ValidationError(
      `Cannot transition SOA from ${analysis.status} to ${newStatus}`,
    );
  }
  return {
    ...analysis,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(newStatus === 'LOCKED'
      ? { lockedAt: new Date().toISOString() }
      : {}),
  };
}

export function ensureSoaNotLocked(analysis: SoaAnalysisData): void {
  if (isLocked(analysis.status)) {
    throw new ValidationError('SOA analysis is locked and cannot be modified');
  }
}
