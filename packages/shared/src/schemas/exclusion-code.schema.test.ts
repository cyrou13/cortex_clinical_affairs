import { describe, it, expect } from 'vitest';
import {
  AddExclusionCodeInput,
  RenameExclusionCodeInput,
  ReorderExclusionCodesInput,
  ConfigureThresholdsInput,
  CreateCustomAiFilterInput,
  UpdateCustomAiFilterInput,
} from './exclusion-code.schema.js';

describe('AddExclusionCodeInput', () => {
  const valid = {
    code: 'WRONG_POPULATION',
    label: 'Wrong population',
    shortCode: 'E1',
  };

  it('accepts valid input', () => {
    expect(AddExclusionCodeInput.safeParse(valid).success).toBe(true);
  });

  it('accepts valid input with description', () => {
    const result = AddExclusionCodeInput.safeParse({ ...valid, description: 'Some description' });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, code: '' }).success).toBe(false);
  });

  it('rejects code with special characters', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, code: 'WRONG-POP' }).success).toBe(false);
  });

  it('rejects code with spaces', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, code: 'WRONG POP' }).success).toBe(false);
  });

  it('accepts code with underscores', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, code: 'WRONG_POP_123' }).success).toBe(true);
  });

  it('rejects empty label', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, label: '' }).success).toBe(false);
  });

  it('rejects label longer than 100 characters', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, label: 'A'.repeat(101) }).success).toBe(false);
  });

  it('rejects invalid shortCode format', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: 'A1' }).success).toBe(false);
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: 'E0' }).success).toBe(false);
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: 'E100' }).success).toBe(false);
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: '' }).success).toBe(false);
  });

  it('accepts valid shortCode values', () => {
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: 'E1' }).success).toBe(true);
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: 'E99' }).success).toBe(true);
    expect(AddExclusionCodeInput.safeParse({ ...valid, shortCode: 'E10' }).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(AddExclusionCodeInput.safeParse({}).success).toBe(false);
    expect(AddExclusionCodeInput.safeParse({ code: 'TEST' }).success).toBe(false);
    expect(AddExclusionCodeInput.safeParse({ code: 'TEST', label: 'Test' }).success).toBe(false);
  });
});

describe('RenameExclusionCodeInput', () => {
  it('accepts valid label', () => {
    expect(RenameExclusionCodeInput.safeParse({ label: 'New label' }).success).toBe(true);
  });

  it('accepts label with optional shortCode', () => {
    const result = RenameExclusionCodeInput.safeParse({ label: 'New label', shortCode: 'E5' });
    expect(result.success).toBe(true);
  });

  it('rejects empty label', () => {
    expect(RenameExclusionCodeInput.safeParse({ label: '' }).success).toBe(false);
  });

  it('rejects label longer than 100 characters', () => {
    expect(RenameExclusionCodeInput.safeParse({ label: 'A'.repeat(101) }).success).toBe(false);
  });

  it('rejects invalid shortCode', () => {
    expect(RenameExclusionCodeInput.safeParse({ label: 'Test', shortCode: 'X1' }).success).toBe(false);
  });

  it('rejects missing label', () => {
    expect(RenameExclusionCodeInput.safeParse({}).success).toBe(false);
  });
});

describe('ReorderExclusionCodesInput', () => {
  it('accepts valid ordered IDs', () => {
    const result = ReorderExclusionCodesInput.safeParse({
      orderedIds: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    expect(ReorderExclusionCodesInput.safeParse({ orderedIds: [] }).success).toBe(false);
  });

  it('rejects non-UUID strings', () => {
    expect(ReorderExclusionCodesInput.safeParse({ orderedIds: ['not-a-uuid'] }).success).toBe(false);
  });

  it('rejects missing orderedIds', () => {
    expect(ReorderExclusionCodesInput.safeParse({}).success).toBe(false);
  });
});

describe('ConfigureThresholdsInput', () => {
  it('accepts valid thresholds where lower < upper', () => {
    const result = ConfigureThresholdsInput.safeParse({
      likelyRelevantThreshold: 75,
      uncertainLowerThreshold: 40,
    });
    expect(result.success).toBe(true);
  });

  it('rejects when lower >= upper', () => {
    const result = ConfigureThresholdsInput.safeParse({
      likelyRelevantThreshold: 50,
      uncertainLowerThreshold: 50,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when lower > upper', () => {
    const result = ConfigureThresholdsInput.safeParse({
      likelyRelevantThreshold: 30,
      uncertainLowerThreshold: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects values below 0', () => {
    expect(
      ConfigureThresholdsInput.safeParse({
        likelyRelevantThreshold: -1,
        uncertainLowerThreshold: 40,
      }).success,
    ).toBe(false);
  });

  it('rejects values above 100', () => {
    expect(
      ConfigureThresholdsInput.safeParse({
        likelyRelevantThreshold: 101,
        uncertainLowerThreshold: 40,
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer values', () => {
    expect(
      ConfigureThresholdsInput.safeParse({
        likelyRelevantThreshold: 75.5,
        uncertainLowerThreshold: 40,
      }).success,
    ).toBe(false);
  });

  it('accepts edge case: 1 and 0', () => {
    const result = ConfigureThresholdsInput.safeParse({
      likelyRelevantThreshold: 1,
      uncertainLowerThreshold: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts edge case: 100 and 99', () => {
    const result = ConfigureThresholdsInput.safeParse({
      likelyRelevantThreshold: 100,
      uncertainLowerThreshold: 99,
    });
    expect(result.success).toBe(true);
  });
});

describe('CreateCustomAiFilterInput', () => {
  const valid = {
    name: 'Pediatric filter',
    criterion: 'Include only if the study involves pediatric patients under 18',
  };

  it('accepts valid input', () => {
    expect(CreateCustomAiFilterInput.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(CreateCustomAiFilterInput.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    expect(CreateCustomAiFilterInput.safeParse({ ...valid, name: 'A'.repeat(101) }).success).toBe(false);
  });

  it('rejects empty criterion', () => {
    expect(CreateCustomAiFilterInput.safeParse({ ...valid, criterion: '' }).success).toBe(false);
  });

  it('rejects criterion longer than 2000 characters', () => {
    expect(CreateCustomAiFilterInput.safeParse({ ...valid, criterion: 'A'.repeat(2001) }).success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(CreateCustomAiFilterInput.safeParse({}).success).toBe(false);
    expect(CreateCustomAiFilterInput.safeParse({ name: 'Test' }).success).toBe(false);
  });
});

describe('UpdateCustomAiFilterInput', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateCustomAiFilterInput.safeParse({}).success).toBe(true);
  });

  it('accepts name only', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ name: 'Updated name' }).success).toBe(true);
  });

  it('accepts criterion only', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ criterion: 'New criterion' }).success).toBe(true);
  });

  it('accepts isActive only', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ isActive: false }).success).toBe(true);
  });

  it('accepts all fields', () => {
    const result = UpdateCustomAiFilterInput.safeParse({
      name: 'Updated',
      criterion: 'New criterion',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects empty criterion', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ criterion: '' }).success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ name: 'A'.repeat(101) }).success).toBe(false);
  });

  it('rejects criterion longer than 2000 characters', () => {
    expect(UpdateCustomAiFilterInput.safeParse({ criterion: 'A'.repeat(2001) }).success).toBe(false);
  });
});
