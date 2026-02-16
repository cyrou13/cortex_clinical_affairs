# DOCX Templates Directory

This directory will contain MDR-compliant DOCX templates for regulatory document generation.

## Template Structure

Templates should follow MDR formatting standards:

- **Font**: Times New Roman 12pt for body text, Arial for headings
- **Margins**: 2.5cm all sides
- **Page numbering**: "Page X of Y" in footer
- **Header**: Document title + version + date
- **Watermark**: Optional "Confidential" marking

## Required Templates (Story 4.5)

The following templates need to be created:

### Validation Module

1. **validation-report.docx** — Validation Report template
   - Cover page (document title, version, date, author)
   - Table of contents placeholder
   - Section 1: Study Description
   - Section 2: Study Protocol
   - Section 3: Results (insertion point for dynamic tables)
   - Section 4: SOA Benchmark Comparison (insertion point)
   - Section 5: Discussion & Conclusions
   - Appendix: Amendment History, Raw Data Summary

2. **fda-18cvs.docx** — FDA 18.CVS template
   - FDA-specific formatting and section structure

### CER Module (Placeholder for Epic 5)

3. **cer-mdr.docx** — CER MDR Annex XIV template (14 sections)
4. **cep.docx** — Clinical Evaluation Plan template

### PMS Module (Placeholder for Epic 6)

5. **pccp.docx** — Post-market Clinical Follow-up Plan template
6. **pmcf-report.docx** — PMCF Report template
7. **psur.docx** — Periodic Safety Update Report template

## Template Development

When the actual Carbone.io integration is implemented:

- Templates will use Carbone syntax for data binding: `{d.fieldName}`
- Dynamic insertion points marked with: `{d.INSERT_SECTION_NAME}`
- Arrays iterated with: `{d.items[i].field}`

## Current Implementation Status

**Status**: Stub templates required

The current implementation generates DOCX files programmatically using the DocxBuilder.
When Carbone.io is integrated (requires LibreOffice in Docker image), these templates
will be used as base documents with dynamic content inserted at marked positions.

## Next Steps

1. Install `docx` npm package: `pnpm add docx`
2. Update `docx-generator.ts` to use real docx npm API
3. Create template .docx files with proper MDR formatting
4. (Future) Install Carbone.io and LibreOffice for template-based generation
