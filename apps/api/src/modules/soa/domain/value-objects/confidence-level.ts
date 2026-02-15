export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'UNSCORED'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export function isValidConfidenceLevel(value: string): value is ConfidenceLevel {
  return CONFIDENCE_LEVELS.includes(value as ConfidenceLevel);
}

export function confidenceToNumeric(level: ConfidenceLevel): number {
  switch (level) {
    case 'HIGH':
      return 1.0;
    case 'MEDIUM':
      return 0.7;
    case 'LOW':
      return 0.4;
    case 'UNSCORED':
      return 0;
  }
}
