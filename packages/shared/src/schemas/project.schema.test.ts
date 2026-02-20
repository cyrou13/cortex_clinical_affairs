import { describe, it, expect } from 'vitest';
import {
  CreateProjectInput,
  ConfigureCepInput,
  DeviceClass,
  RegulatoryContext,
  getDefaultPipelineStatus,
} from './project.schema.js';

describe('CreateProjectInput schema', () => {
  it('accepts valid input', () => {
    const result = CreateProjectInput.safeParse({
      name: 'CINA CSpine Evaluation',
      deviceName: 'CINA CSpine',
      deviceClass: 'IIa',
      regulatoryContext: 'CE_MDR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 3 chars', () => {
    const result = CreateProjectInput.safeParse({
      name: 'AB',
      deviceName: 'Device',
      deviceClass: 'I',
      regulatoryContext: 'CE_MDR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    const result = CreateProjectInput.safeParse({
      name: 'A'.repeat(101),
      deviceName: 'Device',
      deviceClass: 'I',
      regulatoryContext: 'CE_MDR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing device name', () => {
    const result = CreateProjectInput.safeParse({
      name: 'Valid Project',
      deviceClass: 'I',
      regulatoryContext: 'CE_MDR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid device class', () => {
    const result = CreateProjectInput.safeParse({
      name: 'Valid Project',
      deviceName: 'Device',
      deviceClass: 'IV',
      regulatoryContext: 'CE_MDR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid regulatory context', () => {
    const result = CreateProjectInput.safeParse({
      name: 'Valid Project',
      deviceName: 'Device',
      deviceClass: 'I',
      regulatoryContext: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('DeviceClass enum', () => {
  it.each(['I', 'IIa', 'IIb', 'III'])('accepts %s', (value) => {
    expect(DeviceClass.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(DeviceClass.safeParse('IV').success).toBe(false);
  });
});

describe('RegulatoryContext enum', () => {
  it.each(['CE_MDR', 'FDA_510K', 'BOTH'])('accepts %s', (value) => {
    expect(RegulatoryContext.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(RegulatoryContext.safeParse('MHRA').success).toBe(false);
  });
});

describe('ConfigureCepInput schema', () => {
  it('accepts all optional fields', () => {
    const result = ConfigureCepInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial fields', () => {
    const result = ConfigureCepInput.safeParse({
      scope: 'Evaluate safety',
      objectives: 'Demonstrate equivalence',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe('Evaluate safety');
      expect(result.data.clinicalBackground).toBeUndefined();
    }
  });
});

describe('getDefaultPipelineStatus', () => {
  it('returns correct defaults for a new project', () => {
    const status = getDefaultPipelineStatus();
    expect(status.sls).toBe('NOT_STARTED');
    expect(status.soa).toBe('NOT_STARTED');
    expect(status.validation).toBe('NOT_STARTED');
    expect(status.cer).toBe('NOT_STARTED');
    expect(status.pms).toBe('NOT_STARTED');
  });
});
