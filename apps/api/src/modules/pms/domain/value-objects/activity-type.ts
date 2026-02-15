export const ACTIVITY_TYPES = [
  'LITERATURE_UPDATE',
  'NAMED_DEVICE_SEARCH',
  'USER_SURVEYS',
  'VIGILANCE_MONITORING',
  'COMPLAINTS',
  'INSTALLED_BASE',
  'TREND_ANALYSIS',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isValidActivityType(value: string): value is ActivityType {
  return ACTIVITY_TYPES.includes(value as ActivityType);
}
