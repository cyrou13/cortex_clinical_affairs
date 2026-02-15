export const DATA_CONTRIBUTION_LEVELS = ['PIVOTAL', 'SUPPORTIVE', 'BACKGROUND'] as const;
export type DataContributionLevel = (typeof DATA_CONTRIBUTION_LEVELS)[number];

export function isValidContribution(value: string): value is DataContributionLevel {
  return DATA_CONTRIBUTION_LEVELS.includes(value as DataContributionLevel);
}
