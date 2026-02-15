export const GAP_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export type GapStatus = (typeof GAP_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['OPEN'],
};

export function canTransitionGap(from: GapStatus, to: GapStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isValidGapStatus(value: string): value is GapStatus {
  return GAP_STATUSES.includes(value as GapStatus);
}
