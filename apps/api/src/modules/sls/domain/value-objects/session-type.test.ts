import { describe, it, expect } from 'vitest';
import { getScopeFieldsForType } from './session-type.js';
import type { ScopeFieldDefinition } from './session-type.js';

describe('getScopeFieldsForType', () => {
  it('returns PICO fields for SOA_CLINICAL', () => {
    const fields = getScopeFieldsForType('SOA_CLINICAL');
    const names = fields.map((f: ScopeFieldDefinition) => f.name);
    expect(names).toContain('indication');
    expect(names).toContain('population');
    expect(names).toContain('intervention');
    expect(names).toContain('comparator');
    expect(names).toContain('outcomes');
    expect(fields).toHaveLength(5);
  });

  it('marks comparator as optional for SOA_CLINICAL', () => {
    const fields = getScopeFieldsForType('SOA_CLINICAL');
    const comparator = fields.find((f: ScopeFieldDefinition) => f.name === 'comparator');
    expect(comparator?.required).toBe(false);
  });

  it('marks indication as required for SOA_CLINICAL', () => {
    const fields = getScopeFieldsForType('SOA_CLINICAL');
    const indication = fields.find((f: ScopeFieldDefinition) => f.name === 'indication');
    expect(indication?.required).toBe(true);
  });

  it('returns device fields for SOA_DEVICE', () => {
    const fields = getScopeFieldsForType('SOA_DEVICE');
    const names = fields.map((f: ScopeFieldDefinition) => f.name);
    expect(names).toContain('deviceName');
    expect(names).toContain('deviceClass');
    expect(names).toContain('intendedPurpose');
    expect(names).toContain('keyPerformanceEndpoints');
    expect(fields).toHaveLength(4);
  });

  it('returns similar device fields for SIMILAR_DEVICE', () => {
    const fields = getScopeFieldsForType('SIMILAR_DEVICE');
    const names = fields.map((f: ScopeFieldDefinition) => f.name);
    expect(names).toContain('deviceCategory');
    expect(names).toContain('equivalenceCriteria');
    expect(names).toContain('searchDatabases');
    expect(fields).toHaveLength(3);
  });

  it('returns PMS update fields for PMS_UPDATE', () => {
    const fields = getScopeFieldsForType('PMS_UPDATE');
    const names = fields.map((f: ScopeFieldDefinition) => f.name);
    expect(names).toContain('dateRange');
    expect(names).toContain('updateScope');
    expect(names).toContain('previousSlsReference');
    expect(fields).toHaveLength(3);
  });

  it('returns ad-hoc fields for AD_HOC', () => {
    const fields = getScopeFieldsForType('AD_HOC');
    const names = fields.map((f: ScopeFieldDefinition) => f.name);
    expect(names).toContain('description');
    expect(names).toContain('searchObjective');
    expect(fields).toHaveLength(2);
  });

  it('all AD_HOC fields are required', () => {
    const fields = getScopeFieldsForType('AD_HOC');
    expect(fields.every((f: ScopeFieldDefinition) => f.required)).toBe(true);
  });
});
