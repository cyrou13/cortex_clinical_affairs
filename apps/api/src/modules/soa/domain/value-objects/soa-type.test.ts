import { describe, it, expect } from 'vitest';
import { isValidSoaType, getSectionsForType } from './soa-type.js';

describe('SoaType value object', () => {
  it('validates CLINICAL as valid', () => {
    expect(isValidSoaType('CLINICAL')).toBe(true);
  });

  it('validates SIMILAR_DEVICE as valid', () => {
    expect(isValidSoaType('SIMILAR_DEVICE')).toBe(true);
  });

  it('validates ALTERNATIVE as valid', () => {
    expect(isValidSoaType('ALTERNATIVE')).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(isValidSoaType('UNKNOWN')).toBe(false);
  });

  it('returns 6 sections for CLINICAL', () => {
    const sections = getSectionsForType('CLINICAL');
    expect(sections).toHaveLength(6);
    expect(sections[0].key).toBe('CLINICAL_1');
    expect(sections[5].key).toBe('CLINICAL_6');
  });

  it('returns 5 sections for SIMILAR_DEVICE', () => {
    const sections = getSectionsForType('SIMILAR_DEVICE');
    expect(sections).toHaveLength(5);
    expect(sections[0].key).toBe('DEVICE_1');
    expect(sections[4].key).toBe('DEVICE_5');
  });

  it('returns 4 sections for ALTERNATIVE', () => {
    const sections = getSectionsForType('ALTERNATIVE');
    expect(sections).toHaveLength(4);
    expect(sections[0].key).toBe('ALT_1');
  });
});
