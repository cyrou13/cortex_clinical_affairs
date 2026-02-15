export const ACTIVITY_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

export function canTransitionActivity(from: ActivityStatus, to: ActivityStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isValidActivityStatus(value: string): value is ActivityStatus {
  return ACTIVITY_STATUSES.includes(value as ActivityStatus);
}
