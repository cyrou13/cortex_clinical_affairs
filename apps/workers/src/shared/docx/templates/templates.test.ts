/**
 * Template Registry Tests
 *
 * Verifies template configurations are valid and accessible.
 */

import { describe, it, expect } from 'vitest';
import {
  getTemplate,
  hasTemplate,
  getAllTemplates,
  getTemplatesByStandard,
  TEMPLATE_IDS,
  TEMPLATE_REGISTRY,
  validationReportTemplate,
  clinicalEvaluationReportTemplate,
  pmcfReportTemplate,
  psurReportTemplate,
  algorithmicFairnessTemplate,
  labelingValidationTemplate,
  deltaAnalysisTemplate,
  type DocxTemplateConfig,
  type TemplateSection,
} from './index.js';

describe('Template Registry', () => {
  describe('TEMPLATE_REGISTRY', () => {
    it('should contain all 7 templates', () => {
      expect(Object.keys(TEMPLATE_REGISTRY)).toHaveLength(7);
    });

    it('should have correct template IDs', () => {
      const expectedIds = [
        'validation-report',
        'clinical-evaluation-report',
        'pmcf-report',
        'psur-report',
        'algorithmic-fairness',
        'labeling-validation',
        'delta-analysis',
      ];

      expectedIds.forEach((id) => {
        expect(TEMPLATE_REGISTRY[id]).toBeDefined();
      });
    });

    it('should export TEMPLATE_IDS array', () => {
      expect(TEMPLATE_IDS).toHaveLength(7);
      expect(TEMPLATE_IDS).toContain('validation-report');
      expect(TEMPLATE_IDS).toContain('clinical-evaluation-report');
      expect(TEMPLATE_IDS).toContain('pmcf-report');
      expect(TEMPLATE_IDS).toContain('psur-report');
      expect(TEMPLATE_IDS).toContain('algorithmic-fairness');
      expect(TEMPLATE_IDS).toContain('labeling-validation');
      expect(TEMPLATE_IDS).toContain('delta-analysis');
    });
  });

  describe('getTemplate', () => {
    it('should retrieve validation report template', () => {
      const template = getTemplate('validation-report');
      expect(template).toBe(validationReportTemplate);
      expect(template.id).toBe('validation-report');
    });

    it('should retrieve clinical evaluation report template', () => {
      const template = getTemplate('clinical-evaluation-report');
      expect(template).toBe(clinicalEvaluationReportTemplate);
      expect(template.id).toBe('clinical-evaluation-report');
    });

    it('should retrieve PMCF report template', () => {
      const template = getTemplate('pmcf-report');
      expect(template).toBe(pmcfReportTemplate);
      expect(template.id).toBe('pmcf-report');
    });

    it('should retrieve PSUR report template', () => {
      const template = getTemplate('psur-report');
      expect(template).toBe(psurReportTemplate);
      expect(template.id).toBe('psur-report');
    });

    it('should retrieve algorithmic fairness template', () => {
      const template = getTemplate('algorithmic-fairness');
      expect(template).toBe(algorithmicFairnessTemplate);
      expect(template.id).toBe('algorithmic-fairness');
    });

    it('should retrieve labeling validation template', () => {
      const template = getTemplate('labeling-validation');
      expect(template).toBe(labelingValidationTemplate);
      expect(template.id).toBe('labeling-validation');
    });

    it('should retrieve delta analysis template', () => {
      const template = getTemplate('delta-analysis');
      expect(template).toBe(deltaAnalysisTemplate);
      expect(template.id).toBe('delta-analysis');
    });

    it('should throw error for unknown template ID', () => {
      expect(() => getTemplate('unknown-template')).toThrowError(
        /Template not found: unknown-template/,
      );
    });
  });

  describe('hasTemplate', () => {
    it('should return true for registered templates', () => {
      expect(hasTemplate('validation-report')).toBe(true);
      expect(hasTemplate('clinical-evaluation-report')).toBe(true);
      expect(hasTemplate('pmcf-report')).toBe(true);
      expect(hasTemplate('psur-report')).toBe(true);
      expect(hasTemplate('algorithmic-fairness')).toBe(true);
      expect(hasTemplate('labeling-validation')).toBe(true);
      expect(hasTemplate('delta-analysis')).toBe(true);
    });

    it('should return false for unknown templates', () => {
      expect(hasTemplate('unknown-template')).toBe(false);
      expect(hasTemplate('')).toBe(false);
    });
  });

  describe('getAllTemplates', () => {
    it('should return all 7 templates', () => {
      const templates = getAllTemplates();
      expect(templates).toHaveLength(7);
    });

    it('should return template objects with correct structure', () => {
      const templates = getAllTemplates();
      templates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('version');
        expect(template).toHaveProperty('regulatoryStandard');
        expect(template).toHaveProperty('sections');
        expect(template).toHaveProperty('styles');
        expect(template).toHaveProperty('headerFooter');
      });
    });
  });

  describe('getTemplatesByStandard', () => {
    it('should return MDR templates', () => {
      const mdrTemplates = getTemplatesByStandard('MDR');
      expect(mdrTemplates.length).toBeGreaterThan(0);
      mdrTemplates.forEach((template) => {
        expect(template.regulatoryStandard).toMatch(/MDR/i);
      });
    });

    it('should return FDA templates', () => {
      const fdaTemplates = getTemplatesByStandard('FDA');
      expect(fdaTemplates.length).toBeGreaterThan(0);
      fdaTemplates.forEach((template) => {
        expect(template.regulatoryStandard).toMatch(/FDA/i);
      });
    });

    it('should be case insensitive', () => {
      const mdrLower = getTemplatesByStandard('mdr');
      const mdrUpper = getTemplatesByStandard('MDR');
      expect(mdrLower).toEqual(mdrUpper);
    });

    it('should return empty array for non-matching standard', () => {
      const templates = getTemplatesByStandard('ISO-13485');
      expect(templates).toEqual([]);
    });
  });
});

describe('Template Validation', () => {
  const requiredFields: (keyof DocxTemplateConfig)[] = [
    'id',
    'name',
    'version',
    'regulatoryStandard',
    'sections',
    'styles',
    'headerFooter',
  ];

  describe('All templates have required fields', () => {
    getAllTemplates().forEach((template) => {
      describe(`Template: ${template.id}`, () => {
        requiredFields.forEach((field) => {
          it(`should have required field: ${field}`, () => {
            expect(template[field]).toBeDefined();
          });
        });

        it('should have non-empty id', () => {
          expect(template.id).toBeTruthy();
          expect(typeof template.id).toBe('string');
        });

        it('should have non-empty name', () => {
          expect(template.name).toBeTruthy();
          expect(typeof template.name).toBe('string');
        });

        it('should have version', () => {
          expect(template.version).toBeTruthy();
          expect(typeof template.version).toBe('string');
        });

        it('should have regulatory standard', () => {
          expect(template.regulatoryStandard).toBeTruthy();
          expect(typeof template.regulatoryStandard).toBe('string');
        });

        it('should have at least one section', () => {
          expect(template.sections).toBeDefined();
          expect(Array.isArray(template.sections)).toBe(true);
          expect(template.sections.length).toBeGreaterThan(0);
        });

        it('should have valid styles configuration', () => {
          expect(template.styles).toBeDefined();
          expect(template.styles.bodyFont).toBe('Times New Roman');
          expect(template.styles.bodyFontSize).toBe(12);
          expect(template.styles.headingFont).toBe('Arial');
          expect(template.styles.margins).toBeDefined();
          expect(template.styles.margins.top).toBe(2.5);
          expect(template.styles.margins.bottom).toBe(2.5);
          expect(template.styles.margins.left).toBe(2.5);
          expect(template.styles.margins.right).toBe(2.5);
          expect(template.styles.margins.unit).toBe('cm');
          expect(template.styles.pageNumbering).toBe(true);
        });

        it('should have header/footer configuration', () => {
          expect(template.headerFooter).toBeDefined();
          expect(template.headerFooter.header).toBeDefined();
          expect(template.headerFooter.footer).toBeDefined();
        });
      });
    });
  });

  describe('Section structure validation', () => {
    const validateSection = (section: TemplateSection, templateId: string) => {
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.level).toBeGreaterThanOrEqual(1);
      expect(section.level).toBeLessThanOrEqual(4);
      expect(typeof section.required).toBe('boolean');
      expect(['text', 'table', 'chart', 'list', 'mixed']).toContain(section.contentType);

      if (section.subsections) {
        expect(Array.isArray(section.subsections)).toBe(true);
        section.subsections.forEach((subsection) => {
          validateSection(subsection, templateId);
        });
      }
    };

    getAllTemplates().forEach((template) => {
      it(`should have valid section structure: ${template.id}`, () => {
        template.sections.forEach((section) => {
          validateSection(section, template.id);
        });
      });
    });
  });

  describe('Regulatory compliance', () => {
    it('validation report should reference MEDDEV 2.7/1 rev 4', () => {
      expect(validationReportTemplate.regulatoryStandard).toContain('MEDDEV 2.7/1 rev 4');
    });

    it('CER should reference MDR Annex XIV', () => {
      expect(clinicalEvaluationReportTemplate.regulatoryStandard).toContain('MDR');
      expect(clinicalEvaluationReportTemplate.regulatoryStandard).toContain('Annex XIV');
    });

    it('PMCF report should reference MDR Article 61', () => {
      expect(pmcfReportTemplate.regulatoryStandard).toContain('MDR');
      expect(pmcfReportTemplate.regulatoryStandard).toContain('Article 61');
    });

    it('PSUR should reference MDR Article 86', () => {
      expect(psurReportTemplate.regulatoryStandard).toContain('MDR');
      expect(psurReportTemplate.regulatoryStandard).toContain('Article 86');
    });

    it('labeling validation should reference MDR Annex I Chapter III', () => {
      expect(labelingValidationTemplate.regulatoryStandard).toContain('MDR');
      expect(labelingValidationTemplate.regulatoryStandard).toContain('Annex I Chapter III');
    });
  });

  describe('Section count validation', () => {
    it('validation report should have comprehensive sections', () => {
      expect(validationReportTemplate.sections.length).toBeGreaterThanOrEqual(8);
    });

    it('CER should have 12+ mandatory sections per MEDDEV', () => {
      // CER requires at least 12 main sections
      expect(clinicalEvaluationReportTemplate.sections.length).toBeGreaterThanOrEqual(12);
    });

    it('PMCF report should have post-market surveillance sections', () => {
      const sectionIds = pmcfReportTemplate.sections.map((s) => s.id);
      expect(sectionIds).toContain('vigilance-data');
      expect(sectionIds).toContain('benefit-risk-update');
    });

    it('PSUR should have vigilance analysis sections', () => {
      const sectionIds = psurReportTemplate.sections.map((s) => s.id);
      expect(sectionIds).toContain('vigilance-analysis');
      expect(sectionIds).toContain('fsca-summary');
    });

    it('algorithmic fairness should have bias analysis sections', () => {
      const sectionIds = algorithmicFairnessTemplate.sections.map((s) => s.id);
      expect(sectionIds).toContain('fairness-metrics');
      expect(sectionIds).toContain('bias-detection');
    });

    it('labeling validation should have comprehension testing section', () => {
      const sectionIds = labelingValidationTemplate.sections.map((s) => s.id);
      expect(sectionIds).toContain('comprehension-testing');
      expect(sectionIds).toContain('performance-claims-validation');
    });

    it('delta analysis should have change and comparison sections', () => {
      const sectionIds = deltaAnalysisTemplate.sections.map((s) => s.id);
      expect(sectionIds).toContain('change-description');
      expect(sectionIds).toContain('delta-analysis');
      expect(sectionIds).toContain('parent-study-summary');
      expect(sectionIds).toContain('patch-study-summary');
    });
  });

  describe('MDR formatting standards', () => {
    getAllTemplates().forEach((template) => {
      it(`should use Times New Roman 12pt body font: ${template.id}`, () => {
        expect(template.styles.bodyFont).toBe('Times New Roman');
        expect(template.styles.bodyFontSize).toBe(12);
      });

      it(`should use Arial heading font: ${template.id}`, () => {
        expect(template.styles.headingFont).toBe('Arial');
      });

      it(`should have 2.5cm margins on all sides: ${template.id}`, () => {
        expect(template.styles.margins.top).toBe(2.5);
        expect(template.styles.margins.bottom).toBe(2.5);
        expect(template.styles.margins.left).toBe(2.5);
        expect(template.styles.margins.right).toBe(2.5);
        expect(template.styles.margins.unit).toBe('cm');
      });

      it(`should have page numbering enabled: ${template.id}`, () => {
        expect(template.styles.pageNumbering).toBe(true);
      });

      it(`should have footer with page numbers: ${template.id}`, () => {
        const footerText = JSON.stringify(template.headerFooter.footer).toLowerCase();
        expect(footerText).toMatch(/page/);
      });
    });
  });

  describe('Cover page and TOC presence', () => {
    getAllTemplates().forEach((template) => {
      it(`should have cover page: ${template.id}`, () => {
        const hasCoverPage = template.sections.some((s) => s.id === 'cover-page');
        expect(hasCoverPage).toBe(true);
      });

      it(`should have table of contents: ${template.id}`, () => {
        const hasToc = template.sections.some((s) => s.id === 'toc');
        expect(hasToc).toBe(true);
      });
    });
  });

  describe('Required sections are marked as required', () => {
    getAllTemplates().forEach((template) => {
      it(`cover page should be required: ${template.id}`, () => {
        const coverPage = template.sections.find((s) => s.id === 'cover-page');
        expect(coverPage?.required).toBe(true);
      });

      it(`table of contents should be required: ${template.id}`, () => {
        const toc = template.sections.find((s) => s.id === 'toc');
        expect(toc?.required).toBe(true);
      });
    });
  });
});
