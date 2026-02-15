import { describe, it, expect } from 'vitest';
import {
  SlsSessionType,
  SlsSessionStatus,
  ArticleStatusEnum,
  CreateSlsSessionInput,
  UpdateSlsSessionInput,
  SoaClinicalScopeFields,
  SoaDeviceScopeFields,
  SimilarDeviceScopeFields,
  PmsUpdateScopeFields,
  AdHocScopeFields,
} from './sls-session.schema.js';

describe('SlsSessionType enum', () => {
  it.each(['SOA_CLINICAL', 'SOA_DEVICE', 'SIMILAR_DEVICE', 'PMS_UPDATE', 'AD_HOC'])(
    'accepts %s',
    (value) => {
      expect(SlsSessionType.safeParse(value).success).toBe(true);
    },
  );

  it('rejects invalid value', () => {
    expect(SlsSessionType.safeParse('INVALID').success).toBe(false);
  });
});

describe('SlsSessionStatus enum', () => {
  it.each(['DRAFT', 'SCREENING', 'LOCKED'])('accepts %s', (value) => {
    expect(SlsSessionStatus.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(SlsSessionStatus.safeParse('ACTIVE').success).toBe(false);
  });
});

describe('ArticleStatusEnum', () => {
  it.each([
    'PENDING',
    'SCORED',
    'INCLUDED',
    'EXCLUDED',
    'SKIPPED',
    'FULL_TEXT_REVIEW',
    'FINAL_INCLUDED',
    'FINAL_EXCLUDED',
  ])('accepts %s', (value) => {
    expect(ArticleStatusEnum.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(ArticleStatusEnum.safeParse('UNKNOWN').success).toBe(false);
  });
});

describe('CreateSlsSessionInput schema', () => {
  const validInput = {
    name: 'Clinical Literature Review',
    type: 'SOA_CLINICAL',
    projectId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('accepts valid input without scopeFields', () => {
    const result = CreateSlsSessionInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with scopeFields', () => {
    const result = CreateSlsSessionInput.safeParse({
      ...validInput,
      scopeFields: { indication: 'Spinal fusion', population: 'Adults' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 3 chars', () => {
    const result = CreateSlsSessionInput.safeParse({ ...validInput, name: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 200 chars', () => {
    const result = CreateSlsSessionInput.safeParse({
      ...validInput,
      name: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid session type', () => {
    const result = CreateSlsSessionInput.safeParse({
      ...validInput,
      type: 'INVALID_TYPE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid projectId format', () => {
    const result = CreateSlsSessionInput.safeParse({
      ...validInput,
      projectId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validInput;
    const result = CreateSlsSessionInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const { type, ...rest } = validInput;
    const result = CreateSlsSessionInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing projectId', () => {
    const { projectId, ...rest } = validInput;
    const result = CreateSlsSessionInput.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('UpdateSlsSessionInput schema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateSlsSessionInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts name only', () => {
    const result = UpdateSlsSessionInput.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Name');
    }
  });

  it('accepts scopeFields only', () => {
    const result = UpdateSlsSessionInput.safeParse({
      scopeFields: { indication: 'Updated indication' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 3 chars', () => {
    const result = UpdateSlsSessionInput.safeParse({ name: 'AB' });
    expect(result.success).toBe(false);
  });
});

describe('SoaClinicalScopeFields', () => {
  it('accepts valid PICO fields', () => {
    const result = SoaClinicalScopeFields.safeParse({
      indication: 'Spinal fusion',
      population: 'Adults 18+',
      intervention: 'CSpine device',
      outcomes: 'Pain reduction',
    });
    expect(result.success).toBe(true);
  });

  it('accepts with optional comparator', () => {
    const result = SoaClinicalScopeFields.safeParse({
      indication: 'Spinal fusion',
      population: 'Adults 18+',
      intervention: 'CSpine device',
      comparator: 'Standard treatment',
      outcomes: 'Pain reduction',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = SoaClinicalScopeFields.safeParse({
      indication: 'Spinal fusion',
    });
    expect(result.success).toBe(false);
  });
});

describe('SoaDeviceScopeFields', () => {
  it('accepts valid device fields', () => {
    const result = SoaDeviceScopeFields.safeParse({
      deviceName: 'CSpine Implant',
      deviceClass: 'IIb',
      intendedPurpose: 'Spinal stabilization',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing deviceName', () => {
    const result = SoaDeviceScopeFields.safeParse({
      deviceClass: 'IIb',
      intendedPurpose: 'Spinal stabilization',
    });
    expect(result.success).toBe(false);
  });
});

describe('SimilarDeviceScopeFields', () => {
  it('accepts valid fields', () => {
    const result = SimilarDeviceScopeFields.safeParse({
      deviceCategory: 'Spinal implants',
      equivalenceCriteria: 'Same intended use and design',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing deviceCategory', () => {
    const result = SimilarDeviceScopeFields.safeParse({
      equivalenceCriteria: 'Same intended use',
    });
    expect(result.success).toBe(false);
  });
});

describe('PmsUpdateScopeFields', () => {
  it('accepts valid fields', () => {
    const result = PmsUpdateScopeFields.safeParse({
      dateRange: '2024-01-01 to 2024-12-31',
      updateScope: 'Annual PMS literature update',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing dateRange', () => {
    const result = PmsUpdateScopeFields.safeParse({
      updateScope: 'Annual update',
    });
    expect(result.success).toBe(false);
  });
});

describe('AdHocScopeFields', () => {
  it('accepts valid fields', () => {
    const result = AdHocScopeFields.safeParse({
      description: 'Targeted search for recent safety data',
      searchObjective: 'Identify new adverse event reports',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing description', () => {
    const result = AdHocScopeFields.safeParse({
      searchObjective: 'Find reports',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing searchObjective', () => {
    const result = AdHocScopeFields.safeParse({
      description: 'Some search',
    });
    expect(result.success).toBe(false);
  });
});
