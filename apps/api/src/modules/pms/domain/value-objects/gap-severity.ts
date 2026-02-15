export const GAP_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type GapSeverity = (typeof GAP_SEVERITIES)[number];

export function isValidGapSeverity(value: string): value is GapSeverity {
  return GAP_SEVERITIES.includes(value as GapSeverity);
}
