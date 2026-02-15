import type { StudyType } from '../value-objects/study-type.js';
import type { ValidationStatus } from '../value-objects/validation-status.js';
import { canTransition, isLocked } from '../value-objects/validation-status.js';
import { ValidationError } from '../../../../shared/errors/index.js';

export interface ValidationStudyData {
  id: string;
  projectId: string;
  name: string;
  type: StudyType;
  status: ValidationStatus;
  description: string | null;
  soaAnalysisId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lockedAt: string | null;
  lockedById: string | null;
}

export function createValidationStudy(params: {
  id: string;
  projectId: string;
  name: string;
  type: StudyType;
  soaAnalysisId: string;
  description?: string | null;
  createdById: string;
}): ValidationStudyData {
  const now = new Date().toISOString();
  return {
    id: params.id,
    projectId: params.projectId,
    name: params.name,
    type: params.type,
    status: 'DRAFT',
    description: params.description ?? null,
    soaAnalysisId: params.soaAnalysisId,
    createdById: params.createdById,
    createdAt: now,
    updatedAt: now,
    lockedAt: null,
    lockedById: null,
  };
}

export function validateStudyTransition(from: ValidationStatus, to: ValidationStatus): boolean {
  return canTransition(from, to);
}

export function transitionStudyStatus(
  study: ValidationStudyData,
  newStatus: ValidationStatus,
): ValidationStudyData {
  if (!canTransition(study.status, newStatus)) {
    throw new ValidationError(
      `Cannot transition validation study from ${study.status} to ${newStatus}`,
    );
  }
  return {
    ...study,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(newStatus === 'LOCKED' ? { lockedAt: new Date().toISOString() } : {}),
  };
}

export function ensureStudyNotLocked(study: ValidationStudyData): void {
  if (isLocked(study.status)) {
    throw new ValidationError('Validation study is locked and cannot be modified');
  }
}

export function linkSoa(study: ValidationStudyData, soaAnalysisId: string): ValidationStudyData {
  ensureStudyNotLocked(study);
  return {
    ...study,
    soaAnalysisId,
    updatedAt: new Date().toISOString(),
  };
}
