import type { CerStatus } from '../value-objects/cer-status.js';
import type { RegulatoryContext } from '../value-objects/regulatory-context.js';
import type { VersionType } from '../value-objects/version-type.js';
import { canTransition, isLocked } from '../value-objects/cer-status.js';
import { isValidContext } from '../value-objects/regulatory-context.js';
import { isValidVersionType, getNextVersionNumber } from '../value-objects/version-type.js';
import { ValidationError } from '../../../../shared/errors/index.js';

export interface CerVersionData {
  id: string;
  projectId: string;
  regulatoryContext: RegulatoryContext;
  versionType: VersionType;
  versionNumber: string;
  status: CerStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lockedAt: string | null;
  lockedById: string | null;
}

export interface CerUpstreamLinkData {
  id: string;
  cerVersionId: string;
  moduleType: string;
  moduleId: string;
  lockedAt: string;
}

export function createCerVersion(
  projectId: string,
  regulatoryContext: string,
  versionType: string,
  userId: string,
  currentVersion?: string,
): CerVersionData {
  if (!isValidContext(regulatoryContext)) {
    throw new ValidationError(`Invalid regulatory context: ${regulatoryContext}`);
  }

  if (!isValidVersionType(versionType)) {
    throw new ValidationError(`Invalid version type: ${versionType}`);
  }

  const versionNumber = getNextVersionNumber(
    currentVersion ?? '0.0.0',
    versionType as VersionType,
  );

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    projectId,
    regulatoryContext: regulatoryContext as RegulatoryContext,
    versionType: versionType as VersionType,
    versionNumber,
    status: 'DRAFT',
    createdById: userId,
    createdAt: now,
    updatedAt: now,
    lockedAt: null,
    lockedById: null,
  };
}

export function validateCerTransition(from: CerStatus, to: CerStatus): boolean {
  return canTransition(from, to);
}

export function transitionCerStatus(
  entity: CerVersionData,
  newStatus: CerStatus,
): CerVersionData {
  if (!canTransition(entity.status, newStatus)) {
    throw new ValidationError(
      `Cannot transition CER from ${entity.status} to ${newStatus}`,
    );
  }

  return {
    ...entity,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(newStatus === 'LOCKED'
      ? { lockedAt: new Date().toISOString() }
      : {}),
  };
}

export function ensureCerNotLocked(entity: CerVersionData): void {
  if (isLocked(entity.status)) {
    throw new ValidationError('CER version is locked and cannot be modified');
  }
}

export function linkUpstreamModule(
  cerVersionId: string,
  moduleType: string,
  moduleId: string,
  lockedAt: string,
): CerUpstreamLinkData {
  const validModuleTypes = ['SLS', 'SOA', 'VALIDATION'];
  if (!validModuleTypes.includes(moduleType)) {
    throw new ValidationError(`Invalid upstream module type: ${moduleType}`);
  }

  return {
    id: crypto.randomUUID(),
    cerVersionId,
    moduleType,
    moduleId,
    lockedAt,
  };
}
