import { ValidationError } from '../../../../shared/errors/index.js';

export interface ClaimSource {
  sourceType: 'LITERATURE' | 'EXTERNAL_DOC' | 'VIGILANCE' | 'UPSTREAM_DATA';
  sourceId: string;
  quote?: string;
}

export interface ClaimTraceData {
  id: string;
  cerSectionId: string;
  claimText: string;
  sources: ClaimSource[];
  verified: boolean;
  verifiedAt: string | null;
  verifiedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export function createClaimTrace(
  cerSectionId: string,
  claimText: string,
  sources: ClaimSource[],
): ClaimTraceData {
  if (!claimText.trim()) {
    throw new ValidationError('Claim text is required');
  }

  if (sources.length === 0) {
    throw new ValidationError('At least one source is required for a claim trace');
  }

  for (const source of sources) {
    if (!source.sourceId.trim()) {
      throw new ValidationError('Source ID is required for each claim source');
    }
    const validTypes = ['LITERATURE', 'EXTERNAL_DOC', 'VIGILANCE', 'UPSTREAM_DATA'];
    if (!validTypes.includes(source.sourceType)) {
      throw new ValidationError(`Invalid source type: ${source.sourceType}`);
    }
  }

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    cerSectionId,
    claimText: claimText.trim(),
    sources,
    verified: false,
    verifiedAt: null,
    verifiedById: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function verifyClaimTrace(
  claim: ClaimTraceData,
  userId: string,
): ClaimTraceData {
  if (claim.verified) {
    throw new ValidationError('Claim trace is already verified');
  }

  const now = new Date().toISOString();

  return {
    ...claim,
    verified: true,
    verifiedAt: now,
    verifiedById: userId,
    updatedAt: now,
  };
}

export function updateClaimVerification(
  claim: ClaimTraceData,
  verified: boolean,
  userId: string,
): ClaimTraceData {
  const now = new Date().toISOString();

  return {
    ...claim,
    verified,
    verifiedAt: verified ? now : null,
    verifiedById: verified ? userId : null,
    updatedAt: now,
  };
}
