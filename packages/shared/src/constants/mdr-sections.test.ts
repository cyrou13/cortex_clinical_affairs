import { describe, it, expect } from 'vitest';
import {
  MDR_SECTIONS,
  getMdrSection,
  getMdrSectionsByUpstream,
} from './mdr-sections.js';

describe('MDR Sections', () => {
  it('contains exactly 14 sections', () => {
    expect(MDR_SECTIONS).toHaveLength(14);
  });

  it('has unique section numbers', () => {
    const numbers = MDR_SECTIONS.map((s) => s.number);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(14);
  });

  it('sections are numbered 1 through 14', () => {
    const numbers = MDR_SECTIONS.map((s) => s.number);
    for (let i = 1; i <= 14; i++) {
      expect(numbers).toContain(String(i));
    }
  });

  it('every section has a non-empty title', () => {
    for (const s of MDR_SECTIONS) {
      expect(s.title.length).toBeGreaterThan(0);
    }
  });

  it('every section has a non-empty description', () => {
    for (const s of MDR_SECTIONS) {
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  it('every section has a requiredUpstreamData array', () => {
    for (const s of MDR_SECTIONS) {
      expect(Array.isArray(s.requiredUpstreamData)).toBe(true);
    }
  });

  it('upstream data requirements use valid module types', () => {
    const validTypes = new Set(['SLS', 'SOA', 'VALIDATION']);
    for (const s of MDR_SECTIONS) {
      for (const r of s.requiredUpstreamData) {
        expect(validTypes.has(r.moduleType)).toBe(true);
      }
    }
  });

  it('section 14 has no upstream data requirements', () => {
    const section14 = MDR_SECTIONS.find((s) => s.number === '14');
    expect(section14).toBeDefined();
    expect(section14!.requiredUpstreamData).toHaveLength(0);
  });

  it('section 1 is "Scope of the Clinical Evaluation"', () => {
    const section1 = MDR_SECTIONS.find((s) => s.number === '1');
    expect(section1).toBeDefined();
    expect(section1!.title).toBe('Scope of the Clinical Evaluation');
  });

  it('section 11 is "Benefit-Risk Analysis"', () => {
    const section11 = MDR_SECTIONS.find((s) => s.number === '11');
    expect(section11).toBeDefined();
    expect(section11!.title).toBe('Benefit-Risk Analysis');
  });

  it('at least some sections require SLS data', () => {
    const slsSections = MDR_SECTIONS.filter((s) =>
      s.requiredUpstreamData.some((r) => r.moduleType === 'SLS'),
    );
    expect(slsSections.length).toBeGreaterThan(0);
  });

  it('at least some sections require VALIDATION data', () => {
    const valSections = MDR_SECTIONS.filter((s) =>
      s.requiredUpstreamData.some((r) => r.moduleType === 'VALIDATION'),
    );
    expect(valSections.length).toBeGreaterThan(0);
  });
});

describe('getMdrSection', () => {
  it('returns section 1', () => {
    const section = getMdrSection('1');
    expect(section).toBeDefined();
    expect(section!.number).toBe('1');
  });

  it('returns section 14', () => {
    const section = getMdrSection('14');
    expect(section).toBeDefined();
    expect(section!.number).toBe('14');
  });

  it('returns undefined for non-existent section', () => {
    expect(getMdrSection('99')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getMdrSection('')).toBeUndefined();
  });
});

describe('getMdrSectionsByUpstream', () => {
  it('returns sections requiring SLS data', () => {
    const sections = getMdrSectionsByUpstream('SLS');
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(s.requiredUpstreamData.some((r) => r.moduleType === 'SLS')).toBe(true);
    }
  });

  it('returns sections requiring SOA data', () => {
    const sections = getMdrSectionsByUpstream('SOA');
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(s.requiredUpstreamData.some((r) => r.moduleType === 'SOA')).toBe(true);
    }
  });

  it('returns sections requiring VALIDATION data', () => {
    const sections = getMdrSectionsByUpstream('VALIDATION');
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(s.requiredUpstreamData.some((r) => r.moduleType === 'VALIDATION')).toBe(true);
    }
  });

  it('does not return section 14 for any module type', () => {
    for (const moduleType of ['SLS', 'SOA', 'VALIDATION'] as const) {
      const sections = getMdrSectionsByUpstream(moduleType);
      expect(sections.find((s) => s.number === '14')).toBeUndefined();
    }
  });
});
