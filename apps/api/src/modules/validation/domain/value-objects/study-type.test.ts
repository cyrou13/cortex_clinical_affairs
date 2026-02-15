import { describe, it, expect } from 'vitest';
import { isValidStudyType, getStudyTypeLabel, STUDY_TYPES } from './study-type.js';

describe('StudyType value object', () => {
  it('validates STANDALONE as valid', () => {
    expect(isValidStudyType('STANDALONE')).toBe(true);
  });

  it('validates MRMC as valid', () => {
    expect(isValidStudyType('MRMC')).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(isValidStudyType('UNKNOWN')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidStudyType('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isValidStudyType('standalone')).toBe(false);
    expect(isValidStudyType('mrmc')).toBe(false);
  });

  it('returns correct label for STANDALONE', () => {
    expect(getStudyTypeLabel('STANDALONE')).toBe('Standalone Validation Study');
  });

  it('returns correct label for MRMC', () => {
    expect(getStudyTypeLabel('MRMC')).toBe('Multi-Reader Multi-Case Study');
  });

  it('exports STUDY_TYPES with exactly 2 values', () => {
    expect(STUDY_TYPES).toHaveLength(2);
    expect(STUDY_TYPES).toContain('STANDALONE');
    expect(STUDY_TYPES).toContain('MRMC');
  });
});
