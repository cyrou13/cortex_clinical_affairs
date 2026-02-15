export const STUDY_TYPES = ['STANDALONE', 'MRMC'] as const;
export type StudyType = (typeof STUDY_TYPES)[number];

const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  STANDALONE: 'Standalone Validation Study',
  MRMC: 'Multi-Reader Multi-Case Study',
};

export function isValidStudyType(value: string): value is StudyType {
  return STUDY_TYPES.includes(value as StudyType);
}

export function getStudyTypeLabel(type: StudyType): string {
  return STUDY_TYPE_LABELS[type];
}
