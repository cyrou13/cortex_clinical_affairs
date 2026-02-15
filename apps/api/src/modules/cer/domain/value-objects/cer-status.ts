export const CER_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'REVIEW',
  'FINALIZED',
  'LOCKED',
] as const;

export type CerStatus = (typeof CER_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_PROGRESS'],
  IN_PROGRESS: ['REVIEW'],
  REVIEW: ['IN_PROGRESS', 'FINALIZED'],
  FINALIZED: ['LOCKED'],
  LOCKED: [],
};

export function canTransition(from: CerStatus, to: CerStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isLocked(status: CerStatus): boolean {
  return status === 'LOCKED';
}

export function isEditable(status: CerStatus): boolean {
  return status === 'DRAFT' || status === 'IN_PROGRESS' || status === 'REVIEW';
}

export function getCerStatusLabel(status: CerStatus): string {
  const labels: Record<CerStatus, string> = {
    DRAFT: 'Draft',
    IN_PROGRESS: 'In Progress',
    REVIEW: 'Under Review',
    FINALIZED: 'Finalized',
    LOCKED: 'Locked',
  };
  return labels[status];
}
