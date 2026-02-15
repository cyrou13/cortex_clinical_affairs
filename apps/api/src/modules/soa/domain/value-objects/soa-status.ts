export const SOA_STATUSES = ['DRAFT', 'IN_PROGRESS', 'LOCKED'] as const;
export type SoaStatus = (typeof SOA_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_PROGRESS'],
  IN_PROGRESS: ['LOCKED'],
  LOCKED: [],
};

export function canTransition(from: SoaStatus, to: SoaStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isLocked(status: SoaStatus): boolean {
  return status === 'LOCKED';
}
