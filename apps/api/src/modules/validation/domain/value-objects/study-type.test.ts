import { describe, it, expect } from 'vitest';
import { isValidStudyType, getStudyTypeLabel, STUDY_TYPES } from './study-type.js';

describe('StudyType value object', () => {
  it('validates STANDALONE as valid', () => {
    expect(isValidStudyType('STANDALONE')).toBe(true);
  });

  it('validates MRMC as valid', () => {
    expect(isValidStudyType('MRMC')).toBe(true);
  });

  it('validates EQUIVALENCE as valid', () => {
    expect(isValidStudyType('EQUIVALENCE')).toBe(true);
  });

  it('validates READER_AGREEMENT as valid', () => {
    expect(isValidStudyType('READER_AGREEMENT')).toBe(true);
  });

  it('validates PIVOTAL as valid', () => {
    expect(isValidStudyType('PIVOTAL')).toBe(true);
  });

  it('validates FEASIBILITY as valid', () => {
    expect(isValidStudyType('FEASIBILITY')).toBe(true);
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

  it('returns correct label for EQUIVALENCE', () => {
    expect(getStudyTypeLabel('EQUIVALENCE')).toBe('Equivalence Study');
  });

  it('returns correct label for READER_AGREEMENT', () => {
    expect(getStudyTypeLabel('READER_AGREEMENT')).toBe('Reader Agreement Study');
  });

  it('returns correct label for PIVOTAL', () => {
    expect(getStudyTypeLabel('PIVOTAL')).toBe('Pivotal Study');
  });

  it('returns correct label for FEASIBILITY', () => {
    expect(getStudyTypeLabel('FEASIBILITY')).toBe('Feasibility Study');
  });

  it('exports STUDY_TYPES with exactly 6 values', () => {
    expect(STUDY_TYPES).toHaveLength(6);
    expect(STUDY_TYPES).toContain('STANDALONE');
    expect(STUDY_TYPES).toContain('EQUIVALENCE');
    expect(STUDY_TYPES).toContain('MRMC');
    expect(STUDY_TYPES).toContain('READER_AGREEMENT');
    expect(STUDY_TYPES).toContain('PIVOTAL');
    expect(STUDY_TYPES).toContain('FEASIBILITY');
  });
});
