import { describe, it, expect } from 'vitest';
import { isValidTransition } from './session-status.js';

describe('isValidTransition', () => {
  it('allows DRAFT -> SCREENING', () => {
    expect(isValidTransition('DRAFT', 'SCREENING')).toBe(true);
  });

  it('allows SCREENING -> LOCKED', () => {
    expect(isValidTransition('SCREENING', 'LOCKED')).toBe(true);
  });

  it('rejects DRAFT -> LOCKED (must go through SCREENING)', () => {
    expect(isValidTransition('DRAFT', 'LOCKED')).toBe(false);
  });

  it('rejects LOCKED -> DRAFT (no backward transition)', () => {
    expect(isValidTransition('LOCKED', 'DRAFT')).toBe(false);
  });

  it('rejects LOCKED -> SCREENING (no backward transition)', () => {
    expect(isValidTransition('LOCKED', 'SCREENING')).toBe(false);
  });

  it('rejects SCREENING -> DRAFT (no backward transition)', () => {
    expect(isValidTransition('SCREENING', 'DRAFT')).toBe(false);
  });

  it('rejects same-state transition DRAFT -> DRAFT', () => {
    expect(isValidTransition('DRAFT', 'DRAFT')).toBe(false);
  });

  it('rejects same-state transition LOCKED -> LOCKED', () => {
    expect(isValidTransition('LOCKED', 'LOCKED')).toBe(false);
  });
});
