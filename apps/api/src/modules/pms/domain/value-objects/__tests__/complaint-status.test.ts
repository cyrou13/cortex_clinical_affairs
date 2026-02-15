import { describe, it, expect } from 'vitest';
import {
  COMPLAINT_STATUSES,
  canTransitionComplaint,
  isValidComplaintStatus,
  COMPLAINT_SEVERITIES,
  isValidComplaintSeverity,
  COMPLAINT_SOURCES,
  isValidComplaintSource,
} from '../complaint-status.js';

describe('ComplaintStatus value object', () => {
  it('exports COMPLAINT_STATUSES with 4 values', () => {
    expect(COMPLAINT_STATUSES).toHaveLength(4);
    expect(COMPLAINT_STATUSES).toContain('OPEN');
    expect(COMPLAINT_STATUSES).toContain('INVESTIGATING');
    expect(COMPLAINT_STATUSES).toContain('RESOLVED');
    expect(COMPLAINT_STATUSES).toContain('CLOSED');
  });

  describe('canTransitionComplaint', () => {
    it('allows OPEN -> INVESTIGATING', () => {
      expect(canTransitionComplaint('OPEN', 'INVESTIGATING')).toBe(true);
    });

    it('allows INVESTIGATING -> RESOLVED', () => {
      expect(canTransitionComplaint('INVESTIGATING', 'RESOLVED')).toBe(true);
    });

    it('allows RESOLVED -> CLOSED', () => {
      expect(canTransitionComplaint('RESOLVED', 'CLOSED')).toBe(true);
    });

    it('rejects OPEN -> RESOLVED', () => {
      expect(canTransitionComplaint('OPEN', 'RESOLVED')).toBe(false);
    });

    it('rejects OPEN -> CLOSED', () => {
      expect(canTransitionComplaint('OPEN', 'CLOSED')).toBe(false);
    });

    it('rejects CLOSED -> OPEN', () => {
      expect(canTransitionComplaint('CLOSED', 'OPEN')).toBe(false);
    });

    it('rejects INVESTIGATING -> CLOSED', () => {
      expect(canTransitionComplaint('INVESTIGATING', 'CLOSED')).toBe(false);
    });

    it('rejects RESOLVED -> INVESTIGATING', () => {
      expect(canTransitionComplaint('RESOLVED', 'INVESTIGATING')).toBe(false);
    });
  });

  describe('isValidComplaintStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isValidComplaintStatus('OPEN')).toBe(true);
      expect(isValidComplaintStatus('INVESTIGATING')).toBe(true);
      expect(isValidComplaintStatus('RESOLVED')).toBe(true);
      expect(isValidComplaintStatus('CLOSED')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isValidComplaintStatus('INVALID')).toBe(false);
      expect(isValidComplaintStatus('')).toBe(false);
      expect(isValidComplaintStatus('open')).toBe(false);
    });
  });

  describe('COMPLAINT_SEVERITIES', () => {
    it('exports 4 severity levels', () => {
      expect(COMPLAINT_SEVERITIES).toHaveLength(4);
      expect(COMPLAINT_SEVERITIES).toContain('LOW');
      expect(COMPLAINT_SEVERITIES).toContain('MEDIUM');
      expect(COMPLAINT_SEVERITIES).toContain('HIGH');
      expect(COMPLAINT_SEVERITIES).toContain('CRITICAL');
    });

    it('validates severity values', () => {
      expect(isValidComplaintSeverity('LOW')).toBe(true);
      expect(isValidComplaintSeverity('CRITICAL')).toBe(true);
      expect(isValidComplaintSeverity('INVALID')).toBe(false);
      expect(isValidComplaintSeverity('')).toBe(false);
    });
  });

  describe('COMPLAINT_SOURCES', () => {
    it('exports 2 sources', () => {
      expect(COMPLAINT_SOURCES).toHaveLength(2);
      expect(COMPLAINT_SOURCES).toContain('MANUAL');
      expect(COMPLAINT_SOURCES).toContain('ZOHO_DESK');
    });

    it('validates source values', () => {
      expect(isValidComplaintSource('MANUAL')).toBe(true);
      expect(isValidComplaintSource('ZOHO_DESK')).toBe(true);
      expect(isValidComplaintSource('INVALID')).toBe(false);
      expect(isValidComplaintSource('')).toBe(false);
    });
  });
});
