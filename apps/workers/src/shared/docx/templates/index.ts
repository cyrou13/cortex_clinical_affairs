/**
 * DOCX Template Registry
 *
 * Central registry for all MDR-compliant document templates.
 * Provides type-safe access to template configurations.
 */

import { validationReportTemplate } from './validation-report.template.js';
import { clinicalEvaluationReportTemplate } from './clinical-evaluation-report.template.js';
import { pmcfReportTemplate } from './pmcf-report.template.js';
import { psurReportTemplate } from './psur-report.template.js';
import { algorithmicFairnessTemplate } from './algorithmic-fairness.template.js';
import { labelingValidationTemplate } from './labeling-validation.template.js';
import { deltaAnalysisTemplate } from './delta-analysis.template.js';
import type { DocxTemplateConfig } from './validation-report.template.js';

// ── Template Registry ───────────────────────────────────────────────────

/**
 * All available template configurations indexed by template ID.
 */
export const TEMPLATE_REGISTRY: Record<string, DocxTemplateConfig> = {
  'validation-report': validationReportTemplate,
  'clinical-evaluation-report': clinicalEvaluationReportTemplate,
  'pmcf-report': pmcfReportTemplate,
  'psur-report': psurReportTemplate,
  'algorithmic-fairness': algorithmicFairnessTemplate,
  'labeling-validation': labelingValidationTemplate,
  'delta-analysis': deltaAnalysisTemplate,
};

/**
 * List of all registered template IDs.
 */
export const TEMPLATE_IDS = Object.keys(TEMPLATE_REGISTRY);

// ── Template Retrieval ──────────────────────────────────────────────────

/**
 * Get a template configuration by ID.
 *
 * @param id - Template ID (e.g., 'validation-report')
 * @returns Template configuration
 * @throws Error if template ID is not found
 */
export function getTemplate(id: string): DocxTemplateConfig {
  const template = TEMPLATE_REGISTRY[id];
  if (!template) {
    throw new Error(`Template not found: ${id}. Available templates: ${TEMPLATE_IDS.join(', ')}`);
  }
  return template;
}

/**
 * Check if a template ID exists in the registry.
 *
 * @param id - Template ID to check
 * @returns True if template exists
 */
export function hasTemplate(id: string): boolean {
  return id in TEMPLATE_REGISTRY;
}

/**
 * Get all template configurations.
 *
 * @returns Array of all template configurations
 */
export function getAllTemplates(): DocxTemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Get templates filtered by regulatory standard.
 *
 * @param standard - Regulatory standard keyword (e.g., 'MDR', 'FDA')
 * @returns Array of matching template configurations
 */
export function getTemplatesByStandard(standard: string): DocxTemplateConfig[] {
  return getAllTemplates().filter((template) =>
    template.regulatoryStandard.toLowerCase().includes(standard.toLowerCase()),
  );
}

// ── Re-exports ──────────────────────────────────────────────────────────

export { validationReportTemplate } from './validation-report.template.js';
export { clinicalEvaluationReportTemplate } from './clinical-evaluation-report.template.js';
export { pmcfReportTemplate } from './pmcf-report.template.js';
export { psurReportTemplate } from './psur-report.template.js';
export { algorithmicFairnessTemplate } from './algorithmic-fairness.template.js';
export { labelingValidationTemplate } from './labeling-validation.template.js';
export { deltaAnalysisTemplate } from './delta-analysis.template.js';

export type {
  DocxTemplateConfig,
  TemplateSection,
  TemplateStyles,
  HeaderFooterConfig,
} from './validation-report.template.js';
