export const DEFAULT_EXCLUSION_CODES = [
  { shortCode: 'E1', code: 'WRONG_POPULATION', label: 'Wrong population' },
  { shortCode: 'E2', code: 'WRONG_INTERVENTION', label: 'Wrong intervention/device' },
  { shortCode: 'E3', code: 'ANIMAL_STUDY', label: 'Animal study' },
  { shortCode: 'E4', code: 'CASE_REPORT', label: 'Case report only' },
  { shortCode: 'E5', code: 'NON_ENGLISH', label: 'Non-English language' },
  { shortCode: 'E6', code: 'DUPLICATE', label: 'Duplicate publication' },
  { shortCode: 'E7', code: 'ABSTRACT_ONLY', label: 'Conference abstract only' },
  { shortCode: 'E8', code: 'NO_FULL_TEXT', label: 'No full text available' },
  { shortCode: 'E9', code: 'WRONG_STUDY_DESIGN', label: 'Wrong study design' },
  { shortCode: 'E10', code: 'OTHER', label: 'Other (specify in reason)' },
] as const;
