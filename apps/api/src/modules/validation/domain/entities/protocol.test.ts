import { describe, it, expect } from 'vitest';
import {
  createProtocol,
  canProtocolTransition,
  transitionProtocolStatus,
  amendProtocol,
  PROTOCOL_STATUSES,
} from './protocol.js';
import type { ProtocolData } from './protocol.js';

function makeProtocol(overrides?: Partial<ProtocolData>): ProtocolData {
  return {
    id: 'proto-1',
    validationStudyId: 'study-1',
    version: '1.0',
    status: 'DRAFT',
    summary: 'Test summary',
    endpoints: 'Primary: sensitivity',
    sampleSizeJustification: '100 cases needed',
    statisticalStrategy: 'Wilson CI',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Protocol entity', () => {
  describe('createProtocol', () => {
    it('creates protocol with initial version 1.0', () => {
      const protocol = createProtocol({
        id: 'proto-1',
        validationStudyId: 'study-1',
        summary: 'Test',
      });
      expect(protocol.version).toBe('1.0');
      expect(protocol.status).toBe('DRAFT');
    });

    it('sets null for optional fields when not provided', () => {
      const protocol = createProtocol({
        id: 'proto-1',
        validationStudyId: 'study-1',
      });
      expect(protocol.summary).toBeNull();
      expect(protocol.endpoints).toBeNull();
      expect(protocol.sampleSizeJustification).toBeNull();
      expect(protocol.statisticalStrategy).toBeNull();
    });

    it('sets createdAt and updatedAt', () => {
      const protocol = createProtocol({
        id: 'proto-1',
        validationStudyId: 'study-1',
      });
      expect(protocol.createdAt).toBeTruthy();
      expect(protocol.updatedAt).toBeTruthy();
    });
  });

  describe('canProtocolTransition', () => {
    it('allows DRAFT -> APPROVED', () => {
      expect(canProtocolTransition('DRAFT', 'APPROVED')).toBe(true);
    });

    it('allows APPROVED -> AMENDED', () => {
      expect(canProtocolTransition('APPROVED', 'AMENDED')).toBe(true);
    });

    it('allows AMENDED -> APPROVED', () => {
      expect(canProtocolTransition('AMENDED', 'APPROVED')).toBe(true);
    });

    it('rejects DRAFT -> AMENDED', () => {
      expect(canProtocolTransition('DRAFT', 'AMENDED')).toBe(false);
    });

    it('rejects APPROVED -> DRAFT', () => {
      expect(canProtocolTransition('APPROVED', 'DRAFT')).toBe(false);
    });

    it('rejects AMENDED -> DRAFT', () => {
      expect(canProtocolTransition('AMENDED', 'DRAFT')).toBe(false);
    });
  });

  describe('transitionProtocolStatus', () => {
    it('transitions DRAFT to APPROVED', () => {
      const protocol = makeProtocol({ status: 'DRAFT' });
      const result = transitionProtocolStatus(protocol, 'APPROVED');
      expect(result.status).toBe('APPROVED');
    });

    it('transitions APPROVED to AMENDED', () => {
      const protocol = makeProtocol({ status: 'APPROVED' });
      const result = transitionProtocolStatus(protocol, 'AMENDED');
      expect(result.status).toBe('AMENDED');
    });

    it('transitions AMENDED to APPROVED', () => {
      const protocol = makeProtocol({ status: 'AMENDED' });
      const result = transitionProtocolStatus(protocol, 'APPROVED');
      expect(result.status).toBe('APPROVED');
    });

    it('throws on invalid transition DRAFT -> AMENDED', () => {
      const protocol = makeProtocol({ status: 'DRAFT' });
      expect(() => transitionProtocolStatus(protocol, 'AMENDED')).toThrow('Cannot transition');
    });

    it('updates the updatedAt timestamp', () => {
      const protocol = makeProtocol({ status: 'DRAFT', updatedAt: '2024-01-01T00:00:00Z' });
      const result = transitionProtocolStatus(protocol, 'APPROVED');
      expect(result.updatedAt).not.toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('amendProtocol', () => {
    it('increments version from 1.0 to 1.1', () => {
      const protocol = makeProtocol({ status: 'APPROVED', version: '1.0' });
      const { protocol: amended, amendment } = amendProtocol(protocol, 'Correction needed', 'user-1');
      expect(amended.version).toBe('1.1');
      expect(amendment.fromVersion).toBe('1.0');
      expect(amendment.toVersion).toBe('1.1');
    });

    it('sets status to AMENDED', () => {
      const protocol = makeProtocol({ status: 'APPROVED', version: '1.0' });
      const { protocol: amended } = amendProtocol(protocol, 'Correction', 'user-1');
      expect(amended.status).toBe('AMENDED');
    });

    it('creates amendment record with reason', () => {
      const protocol = makeProtocol({ status: 'APPROVED', version: '1.0' });
      const { amendment } = amendProtocol(protocol, 'New data available', 'user-1');
      expect(amendment.reason).toBe('New data available');
      expect(amendment.createdById).toBe('user-1');
      expect(amendment.protocolId).toBe('proto-1');
    });

    it('allows amendment of previously amended protocol', () => {
      const protocol = makeProtocol({ status: 'AMENDED', version: '1.1' });
      const { protocol: amended, amendment } = amendProtocol(protocol, 'Another fix', 'user-1');
      expect(amended.version).toBe('1.2');
      expect(amendment.fromVersion).toBe('1.1');
      expect(amendment.toVersion).toBe('1.2');
    });

    it('throws when amending a DRAFT protocol', () => {
      const protocol = makeProtocol({ status: 'DRAFT' });
      expect(() => amendProtocol(protocol, 'Reason', 'user-1')).toThrow(
        'Only approved or previously amended',
      );
    });

    it('throws when reason is empty', () => {
      const protocol = makeProtocol({ status: 'APPROVED' });
      expect(() => amendProtocol(protocol, '   ', 'user-1')).toThrow(
        'Amendment reason is required',
      );
    });

    it('trims the amendment reason', () => {
      const protocol = makeProtocol({ status: 'APPROVED', version: '1.0' });
      const { amendment } = amendProtocol(protocol, '  Fix typo  ', 'user-1');
      expect(amendment.reason).toBe('Fix typo');
    });
  });

  it('exports PROTOCOL_STATUSES with 3 values', () => {
    expect(PROTOCOL_STATUSES).toHaveLength(3);
    expect(PROTOCOL_STATUSES).toContain('DRAFT');
    expect(PROTOCOL_STATUSES).toContain('APPROVED');
    expect(PROTOCOL_STATUSES).toContain('AMENDED');
  });
});
