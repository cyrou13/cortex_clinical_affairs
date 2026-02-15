export const CYCLE_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED'] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['ACTIVE'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
};

export function canTransitionCycle(from: CycleStatus, to: CycleStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isValidCycleStatus(value: string): value is CycleStatus {
  return CYCLE_STATUSES.includes(value as CycleStatus);
}
