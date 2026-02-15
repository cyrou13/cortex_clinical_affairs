export const COMPARISON_RESULTS = ['MET', 'NOT_MET'] as const;
export type ComparisonResult = (typeof COMPARISON_RESULTS)[number];

export interface ResultsMappingData {
  id: string;
  validationStudyId: string;
  acceptanceCriterionId: string;
  computedValue: number;
  threshold: number;
  unit: string | null;
  result: ComparisonResult;
  createdAt: string;
}

export interface ComparisonInput {
  computedValue: number;
  threshold: number;
  operator?: '>=' | '<=' | '>' | '<' | '=';
}

export function compare(input: ComparisonInput): ComparisonResult {
  const { computedValue, threshold, operator = '>=' } = input;

  switch (operator) {
    case '>=':
      return computedValue >= threshold ? 'MET' : 'NOT_MET';
    case '<=':
      return computedValue <= threshold ? 'MET' : 'NOT_MET';
    case '>':
      return computedValue > threshold ? 'MET' : 'NOT_MET';
    case '<':
      return computedValue < threshold ? 'MET' : 'NOT_MET';
    case '=':
      return Math.abs(computedValue - threshold) < 1e-10 ? 'MET' : 'NOT_MET';
    default:
      return computedValue >= threshold ? 'MET' : 'NOT_MET';
  }
}

export function createResultsMapping(params: {
  id: string;
  validationStudyId: string;
  acceptanceCriterionId: string;
  computedValue: number;
  threshold: number;
  unit?: string | null;
  operator?: '>=' | '<=' | '>' | '<' | '=';
}): ResultsMappingData {
  const result = compare({
    computedValue: params.computedValue,
    threshold: params.threshold,
    operator: params.operator,
  });

  return {
    id: params.id,
    validationStudyId: params.validationStudyId,
    acceptanceCriterionId: params.acceptanceCriterionId,
    computedValue: params.computedValue,
    threshold: params.threshold,
    unit: params.unit ?? null,
    result,
    createdAt: new Date().toISOString(),
  };
}
