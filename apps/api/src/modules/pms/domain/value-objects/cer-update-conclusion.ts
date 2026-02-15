export const CER_UPDATE_CONCLUSIONS = [
  'CER_UPDATE_REQUIRED',
  'CER_UPDATE_NOT_REQUIRED',
  'CER_PATCH_REQUIRED',
] as const;

export type CerUpdateConclusion = (typeof CER_UPDATE_CONCLUSIONS)[number];

export function isValidCerUpdateConclusion(value: string): value is CerUpdateConclusion {
  return CER_UPDATE_CONCLUSIONS.includes(value as CerUpdateConclusion);
}
