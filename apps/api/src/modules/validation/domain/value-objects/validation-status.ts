export const VALIDATION_STATUSES = ['DRAFT', 'IN_PROGRESS', 'LOCKED'] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_PROGRESS'],
  IN_PROGRESS: ['LOCKED'],
  LOCKED: [],
};

export function canTransition(from: ValidationStatus, to: ValidationStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isLocked(status: ValidationStatus): boolean {
  return status === 'LOCKED';
}
