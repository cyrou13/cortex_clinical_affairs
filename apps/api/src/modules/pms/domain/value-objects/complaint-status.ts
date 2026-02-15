export const COMPLAINT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['INVESTIGATING'],
  INVESTIGATING: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export function canTransitionComplaint(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function isValidComplaintStatus(value: string): value is ComplaintStatus {
  return COMPLAINT_STATUSES.includes(value as ComplaintStatus);
}

export const COMPLAINT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ComplaintSeverity = (typeof COMPLAINT_SEVERITIES)[number];

export function isValidComplaintSeverity(value: string): value is ComplaintSeverity {
  return COMPLAINT_SEVERITIES.includes(value as ComplaintSeverity);
}

export const COMPLAINT_SOURCES = ['MANUAL', 'ZOHO_DESK'] as const;
export type ComplaintSource = (typeof COMPLAINT_SOURCES)[number];

export function isValidComplaintSource(value: string): value is ComplaintSource {
  return COMPLAINT_SOURCES.includes(value as ComplaintSource);
}
