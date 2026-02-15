import type { SlsSessionStatus } from '@cortex/shared';

const VALID_TRANSITIONS: Record<SlsSessionStatus, SlsSessionStatus[]> = {
  DRAFT: ['SCREENING'],
  SCREENING: ['LOCKED'],
  LOCKED: [],
};

export function isValidTransition(from: SlsSessionStatus, to: SlsSessionStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
