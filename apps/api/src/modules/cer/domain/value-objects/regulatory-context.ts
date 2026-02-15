export const REGULATORY_CONTEXTS = ['CE_MDR', 'FDA_510K', 'DUAL'] as const;
export type RegulatoryContext = (typeof REGULATORY_CONTEXTS)[number];

export function isValidContext(value: string): value is RegulatoryContext {
  return REGULATORY_CONTEXTS.includes(value as RegulatoryContext);
}

export function getContextLabel(context: RegulatoryContext): string {
  const labels: Record<RegulatoryContext, string> = {
    CE_MDR: 'CE Marking (MDR 2017/745)',
    FDA_510K: 'FDA 510(k)',
    DUAL: 'Dual Submission (CE MDR + FDA 510(k))',
  };
  return labels[context];
}

export function requiresFda(context: RegulatoryContext): boolean {
  return context === 'FDA_510K' || context === 'DUAL';
}
