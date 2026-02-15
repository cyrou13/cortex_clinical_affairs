export const PMS_PLAN_STATUSES = ['DRAFT', 'APPROVED', 'ACTIVE'] as const;
export type PmsPlanStatus = (typeof PMS_PLAN_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['ACTIVE'],
  ACTIVE: [],
};

export function canTransitionPlan(from: PmsPlanStatus, to: PmsPlanStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isValidPlanStatus(value: string): value is PmsPlanStatus {
  return PMS_PLAN_STATUSES.includes(value as PmsPlanStatus);
}
