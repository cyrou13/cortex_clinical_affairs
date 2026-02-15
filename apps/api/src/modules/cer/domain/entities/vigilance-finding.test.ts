import { describe, it, expect } from 'vitest';
import {
  createVigilanceFinding,
  linkToSection,
  EVENT_TYPES,
} from './vigilance-finding.js';
import type { VigilanceFindingData } from './vigilance-finding.js';

function makeFinding(overrides?: Partial<VigilanceFindingData>): VigilanceFindingData {
  return {
    id: 'finding-1',
    searchId: 'search-1',
    sourceDatabase: 'MAUDE',
    reportNumber: 'MDR-2024-001',
    eventDate: '2024-01-15',
    deviceName: 'CardioValve Pro',
    eventType: 'MALFUNCTION',
    description: 'Device malfunction during implantation',
    outcome: 'No patient harm',
    linkedSectionIds: [],
    createdAt: '2024-02-01T00:00:00Z',
    ...overrides,
  };
}

describe('VigilanceFinding entity', () => {
  it('exports EVENT_TYPES with 4 values', () => {
    expect(EVENT_TYPES).toHaveLength(4);
    expect(EVENT_TYPES).toContain('MALFUNCTION');
    expect(EVENT_TYPES).toContain('INJURY');
    expect(EVENT_TYPES).toContain('DEATH');
    expect(EVENT_TYPES).toContain('OTHER');
  });

  describe('createVigilanceFinding', () => {
    it('creates a finding with valid data', () => {
      const finding = createVigilanceFinding(
        'search-1',
        'MAUDE',
        'MDR-2024-001',
        '2024-01-15',
        'CardioValve Pro',
        'MALFUNCTION',
        'Device malfunction',
        'No patient harm',
      );
      expect(finding.searchId).toBe('search-1');
      expect(finding.sourceDatabase).toBe('MAUDE');
      expect(finding.reportNumber).toBe('MDR-2024-001');
      expect(finding.eventType).toBe('MALFUNCTION');
      expect(finding.linkedSectionIds).toEqual([]);
      expect(finding.id).toBeTruthy();
    });

    it('throws for empty report number', () => {
      expect(() =>
        createVigilanceFinding('s', 'MAUDE', '', '2024-01-15', 'Device', 'MALFUNCTION', 'Desc', 'Out'),
      ).toThrow('Report number is required');
    });

    it('throws for empty device name', () => {
      expect(() =>
        createVigilanceFinding('s', 'MAUDE', 'R-1', '2024-01-15', '', 'MALFUNCTION', 'Desc', 'Out'),
      ).toThrow('Device name is required');
    });

    it('throws for invalid event type', () => {
      expect(() =>
        createVigilanceFinding('s', 'MAUDE', 'R-1', '2024-01-15', 'Device', 'INVALID', 'Desc', 'Out'),
      ).toThrow('Invalid event type');
    });

    it('throws for empty description', () => {
      expect(() =>
        createVigilanceFinding('s', 'MAUDE', 'R-1', '2024-01-15', 'Device', 'INJURY', '', 'Out'),
      ).toThrow('Description is required');
    });

    it('trims fields', () => {
      const finding = createVigilanceFinding(
        'search-1',
        'MAUDE',
        '  MDR-001  ',
        '2024-01-15',
        '  Device  ',
        'DEATH',
        '  Desc  ',
        '  Out  ',
      );
      expect(finding.reportNumber).toBe('MDR-001');
      expect(finding.deviceName).toBe('Device');
      expect(finding.description).toBe('Desc');
      expect(finding.outcome).toBe('Out');
    });
  });

  describe('linkToSection', () => {
    it('links finding to a section', () => {
      const finding = makeFinding();
      const result = linkToSection(finding, 'sec-1');
      expect(result.linkedSectionIds).toEqual(['sec-1']);
    });

    it('links finding to multiple sections', () => {
      let finding = makeFinding();
      finding = linkToSection(finding, 'sec-1');
      finding = linkToSection(finding, 'sec-2');
      expect(finding.linkedSectionIds).toEqual(['sec-1', 'sec-2']);
    });

    it('throws when section is already linked', () => {
      const finding = makeFinding({ linkedSectionIds: ['sec-1'] });
      expect(() => linkToSection(finding, 'sec-1')).toThrow('already linked');
    });
  });
});
