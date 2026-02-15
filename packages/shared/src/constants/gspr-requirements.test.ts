import { describe, it, expect } from 'vitest';
import {
  GSPR_REQUIREMENTS,
  getGsprById,
  getGsprByChapter,
  getGsprForDeviceClass,
} from './gspr-requirements.js';

describe('GSPR Requirements', () => {
  it('contains exactly 23 requirements', () => {
    expect(GSPR_REQUIREMENTS).toHaveLength(23);
  });

  it('has unique IDs for each requirement', () => {
    const ids = GSPR_REQUIREMENTS.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(23);
  });

  it('covers all 3 chapters', () => {
    const chapters = new Set(GSPR_REQUIREMENTS.map((r) => r.chapter));
    expect(chapters).toEqual(new Set(['I', 'II', 'III']));
  });

  it('Chapter I contains GSPRs 1–9', () => {
    const chapterI = GSPR_REQUIREMENTS.filter((r) => r.chapter === 'I');
    expect(chapterI).toHaveLength(9);
    expect(chapterI.map((r) => r.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => `GSPR-${i + 1}`),
    );
  });

  it('Chapter II contains GSPRs 10–19', () => {
    const chapterII = GSPR_REQUIREMENTS.filter((r) => r.chapter === 'II');
    expect(chapterII).toHaveLength(10);
    expect(chapterII.map((r) => r.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => `GSPR-${i + 10}`),
    );
  });

  it('Chapter III contains GSPRs 20–23', () => {
    const chapterIII = GSPR_REQUIREMENTS.filter((r) => r.chapter === 'III');
    expect(chapterIII).toHaveLength(4);
    expect(chapterIII.map((r) => r.id)).toEqual(
      Array.from({ length: 4 }, (_, i) => `GSPR-${i + 20}`),
    );
  });

  it('every requirement has non-empty title and description', () => {
    for (const r of GSPR_REQUIREMENTS) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  it('every requirement has at least one applicable device class', () => {
    for (const r of GSPR_REQUIREMENTS) {
      expect(r.applicableToClass.length).toBeGreaterThan(0);
    }
  });

  it('applicableToClass only uses valid device classes', () => {
    const validClasses = new Set(['I', 'IIa', 'IIb', 'III']);
    for (const r of GSPR_REQUIREMENTS) {
      for (const cls of r.applicableToClass) {
        expect(validClasses.has(cls)).toBe(true);
      }
    }
  });
});

describe('getGsprById', () => {
  it('returns the correct requirement by ID', () => {
    const gspr1 = getGsprById('GSPR-1');
    expect(gspr1).toBeDefined();
    expect(gspr1!.id).toBe('GSPR-1');
    expect(gspr1!.chapter).toBe('I');
  });

  it('returns undefined for non-existent ID', () => {
    expect(getGsprById('GSPR-99')).toBeUndefined();
  });

  it('returns GSPR-23', () => {
    const gspr23 = getGsprById('GSPR-23');
    expect(gspr23).toBeDefined();
    expect(gspr23!.chapter).toBe('III');
  });
});

describe('getGsprByChapter', () => {
  it('returns Chapter I requirements', () => {
    const results = getGsprByChapter('I');
    expect(results).toHaveLength(9);
    expect(results.every((r) => r.chapter === 'I')).toBe(true);
  });

  it('returns Chapter II requirements', () => {
    const results = getGsprByChapter('II');
    expect(results).toHaveLength(10);
    expect(results.every((r) => r.chapter === 'II')).toBe(true);
  });

  it('returns Chapter III requirements', () => {
    const results = getGsprByChapter('III');
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.chapter === 'III')).toBe(true);
  });
});

describe('getGsprForDeviceClass', () => {
  it('returns all requirements for Class III (most restrictive)', () => {
    const results = getGsprForDeviceClass('III');
    expect(results.length).toBeGreaterThanOrEqual(23);
  });

  it('returns fewer requirements for Class I', () => {
    const classI = getGsprForDeviceClass('I');
    const classIII = getGsprForDeviceClass('III');
    expect(classI.length).toBeLessThanOrEqual(classIII.length);
  });

  it('Class IIb includes GSPR-12', () => {
    const results = getGsprForDeviceClass('IIb');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('GSPR-12');
  });

  it('Class I does not include GSPR-19 (active implantable)', () => {
    const results = getGsprForDeviceClass('I');
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain('GSPR-19');
  });
});
