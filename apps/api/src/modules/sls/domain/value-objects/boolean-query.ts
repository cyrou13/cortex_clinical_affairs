import type { BooleanQueryValidationResult } from '@cortex/shared';

/**
 * Validates a boolean search query string used for systematic literature searches.
 *
 * Supports:
 * - Boolean operators: AND, OR, NOT
 * - Parenthesized groups
 * - Field qualifiers: [ti], [tiab], [mh], [tw], [ab], [au], [dp], [pt], [sh], [la]
 * - Truncation wildcard: *
 * - Quoted phrases: "exact phrase"
 *
 * Pure business logic — no infrastructure dependencies.
 */
export function validateBooleanQuery(queryString: string): BooleanQueryValidationResult {
  const errors: string[] = [];

  if (!queryString || queryString.trim().length === 0) {
    return { valid: false, errors: ['Query string cannot be empty'] };
  }

  const trimmed = queryString.trim();

  // Check balanced parentheses
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) {
      errors.push('Unbalanced parentheses: unexpected closing parenthesis');
      break;
    }
  }
  if (depth > 0) {
    errors.push('Unbalanced parentheses: missing closing parenthesis');
  }

  // Check balanced quotes
  const quoteCount = (trimmed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    errors.push('Unbalanced quotes: missing closing quote');
  }

  // Check for empty groups: ()
  if (/\(\s*\)/.test(trimmed)) {
    errors.push('Empty parenthesized group');
  }

  // Strip quoted strings and field qualifiers for operator analysis
  const stripped = trimmed
    .replace(/"[^"]*"/g, 'PHRASE')
    .replace(/\[[a-z]+\]/gi, '');

  // Check for double boolean operators (e.g., AND AND, OR OR, AND OR)
  const operators = ['AND', 'OR', 'NOT'];
  const operatorPattern = operators.join('|');
  const doubleOpRegex = new RegExp(`\\b(${operatorPattern})\\s+(${operatorPattern})\\b`, 'i');
  if (doubleOpRegex.test(stripped)) {
    errors.push('Double boolean operator detected');
  }

  // Check for leading operator (AND or OR at start, but NOT is allowed)
  const leadingOpRegex = /^\s*\(?\s*\b(AND|OR)\b/i;
  if (leadingOpRegex.test(stripped)) {
    errors.push('Query cannot start with AND or OR operator');
  }

  // Check for trailing operator
  const trailingOpRegex = /\b(AND|OR|NOT)\s*\)?\s*$/i;
  if (trailingOpRegex.test(stripped)) {
    errors.push('Query cannot end with a boolean operator');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
