import { useMemo } from 'react';

interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
}

const VALID_FIELD_QUALIFIERS = ['ti', 'tiab', 'mh', 'tw', 'ab', 'au', 'dp', 'pt', 'sh', 'majr'];
const BOOLEAN_OPERATORS = ['AND', 'OR', 'NOT'];

export function validateQueryString(queryString: string): QueryValidationResult {
  const errors: string[] = [];
  const trimmed = queryString.trim();

  if (trimmed.length === 0) {
    return { isValid: true, errors: [] };
  }

  // Check balanced parentheses
  let parenDepth = 0;
  let inQuotes = false;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    }
    if (!inQuotes) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (parenDepth < 0) {
        errors.push('Unmatched closing parenthesis');
        break;
      }
    }
  }
  if (parenDepth > 0) {
    errors.push('Unmatched opening parenthesis');
  }

  // Check unclosed quotes
  const quoteCount = (trimmed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    errors.push('Unclosed quotation mark');
  }

  // Check for empty groups ()
  if (/\(\s*\)/.test(trimmed)) {
    errors.push('Empty group "()" is not allowed');
  }

  // Check for invalid field qualifiers
  const fieldQualifierMatches = trimmed.match(/\[([^\]]*)\]/g);
  if (fieldQualifierMatches) {
    for (const match of fieldQualifierMatches) {
      const qualifier = match.slice(1, -1).toLowerCase();
      if (!VALID_FIELD_QUALIFIERS.includes(qualifier)) {
        errors.push(`Invalid field qualifier: ${match}`);
      }
    }
  }

  // Tokenize to check operator usage - strip quoted phrases and field qualifiers first
  const stripped = trimmed
    .replace(/"[^"]*"/g, 'QUOTED')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\*/g, '');

  // Split into tokens (words, parens, operators)
  const tokens = stripped.split(/\s+/).filter((t) => t.length > 0);

  // Check for consecutive boolean operators (e.g., "AND OR", "AND AND")
  for (let i = 0; i < tokens.length - 1; i++) {
    const currentToken = tokens[i] as string;
    const nextToken = tokens[i + 1] as string;
    const current = currentToken.toUpperCase();
    const next = nextToken.toUpperCase();
    if (BOOLEAN_OPERATORS.includes(current) && BOOLEAN_OPERATORS.includes(next)) {
      errors.push(`Consecutive operators "${currentToken} ${nextToken}" are not allowed`);
    }
  }

  // Check for operator at start (except NOT)
  const firstMeaningfulToken = tokens.find((t) => t !== '(' && t !== ')');
  if (firstMeaningfulToken && ['AND', 'OR'].includes(firstMeaningfulToken.toUpperCase())) {
    errors.push(`Query cannot start with "${firstMeaningfulToken}"`);
  }

  // Check for operator at end
  const lastMeaningfulToken = [...tokens].reverse().find((t) => t !== '(' && t !== ')');
  if (lastMeaningfulToken && BOOLEAN_OPERATORS.includes(lastMeaningfulToken.toUpperCase())) {
    errors.push(`Query cannot end with "${lastMeaningfulToken}"`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function useQueryValidation(queryString: string): QueryValidationResult {
  return useMemo(() => validateQueryString(queryString), [queryString]);
}
