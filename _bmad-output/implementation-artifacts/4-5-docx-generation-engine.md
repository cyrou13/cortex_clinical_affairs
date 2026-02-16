# Story 4.5: DOCX Generation Engine

Status: ready-for-dev

## Story

As a system,
I want a hybrid DOCX generation engine using Carbone.io templates and docx npm for programmatic content,
So that all modules can generate submission-ready regulatory documents.

## Acceptance Criteria

**Given** the workers workspace (`apps/workers/src/shared/docx/`)
**When** a document generation request is made
**Then** Carbone.io processes DOCX templates with JSON data injection for template-driven documents
**And** docx npm generates programmatic sections (dynamic tables, charts, computed content)
**And** the hybrid strategy merges Carbone base documents with docx-inserted dynamic sections
**And** MDR-compliant templates are created for: Validation Report, CER, CEP, PCCP, PMCF Report, PSUR, FDA 18.CVS (FR74)
**And** multiple document types can be generated (FR75)
**And** generation completes in <5 minutes for 100+ page documents (FR76, P4)
**And** templates are stored in `apps/workers/src/shared/docx/templates/`
**And** document generation runs asynchronously via BullMQ

## Tasks / Subtasks

### Backend / Worker Tasks

- [ ] **T1: Set up Carbone.io engine** (AC: template-driven DOCX generation)
  - [ ] T1.1: Install `carbone` 5.x in `apps/workers/package.json`
  - [ ] T1.2: Create `apps/workers/src/shared/docx/carbone-engine.ts` — wrapper around Carbone API
  - [ ] T1.3: Implement `renderTemplate(templatePath: string, data: Record<string, unknown>): Promise<Buffer>` method
  - [ ] T1.4: Configure Carbone with LibreOffice path (required dependency — LibreOffice must be in worker Docker image)
  - [ ] T1.5: Implement template discovery: scan `templates/` directory for available templates
  - [ ] T1.6: Implement Carbone data binding patterns:
    - Simple substitution: `{d.title}` -> project title
    - Array iteration: `{d.sections[i].title}` -> section titles
    - Conditional: `{d.isMRMC ? "MRMC Study" : "Standalone Study"}`
    - Formatting: `{d.date:formatD(YYYY-MM-DD)}`

- [ ] **T2: Set up docx npm engine** (AC: programmatic DOCX generation)
  - [ ] T2.1: Install `docx` 9.x in `apps/workers/package.json`
  - [ ] T2.2: Create `apps/workers/src/shared/docx/docx-builder.ts` — builder pattern for programmatic documents
  - [ ] T2.3: Implement reusable building blocks:
    - `createTable(headers: string[], rows: string[][]): Table` — for comparison tables, GSPR matrices
    - `createHeading(text: string, level: 1|2|3|4): Paragraph`
    - `createParagraph(text: string, style?: ParagraphStyle): Paragraph`
    - `createNumberedList(items: string[]): Paragraph[]`
    - `createBulletList(items: string[]): Paragraph[]`
    - `createPageBreak(): Paragraph`
    - `createTableOfContents(): TableOfContents`
  - [ ] T2.4: Implement MDR-compliant styling:
    - Font: Times New Roman 12pt for body, Arial for headings (standard regulatory formatting)
    - Margins: 2.5cm all sides
    - Page numbering: "Page X of Y" in footer
    - Header: document title + version + date
    - Consistent spacing between sections

- [ ] **T3: Implement hybrid merge strategy** (AC: merge Carbone + docx sections)
  - [ ] T3.1: Create `apps/workers/src/shared/docx/hybrid-engine.ts` — orchestrates both engines
  - [ ] T3.2: Implement merge flow:
    1. Carbone generates base document from template (fixed structure, headers, footers, TOC placeholders)
    2. docx npm generates dynamic sections (tables with variable rows, computed statistics, charts)
    3. Merge: insert docx-generated sections into Carbone base at designated insertion points
  - [ ] T3.3: Implement insertion point markers in Carbone templates: `{d.INSERT_DYNAMIC_SECTION_X}` replaced by docx-generated content
  - [ ] T3.4: Handle document-level settings: page orientation, margins, styles consistency between merged parts
  - [ ] T3.5: Implement `generateDocument(type: DocumentType, data: DocumentData): Promise<Buffer>` — unified entry point

- [ ] **T4: Create MDR-compliant DOCX templates** (AC: FR74, regulatory templates)
  - [ ] T4.1: Create `apps/workers/src/shared/docx/templates/validation-report.docx` — Validation Report template with:
    - Cover page (document title, version, date, author)
    - Table of contents
    - Section 1: Study Description (protocol summary, endpoints, design)
    - Section 2: Study Protocol (version, amendments)
    - Section 3: Results (dynamic tables for endpoint results)
    - Section 4: SOA Benchmark Comparison (dynamic comparison table)
    - Section 5: Discussion & Conclusions
    - Appendix: Amendment History, Raw Data Summary
  - [ ] T4.2: Create `apps/workers/src/shared/docx/templates/fda-18cvs.docx` — FDA 18.CVS template with FDA-specific formatting
  - [ ] T4.3: Create placeholder templates for future modules (will be populated in Epic 5 & 6):
    - `cer-mdr.docx` — CER MDR Annex XIV (14 sections)
    - `cep.docx` — Clinical Evaluation Plan
    - `pccp.docx` — Post-market Clinical follow-up Plan
    - `pmcf-report.docx` — PMCF Report
    - `psur.docx` — Periodic Safety Update Report
  - [ ] T4.4: All templates follow regulatory formatting standards:
    - Document ID and version in header
    - "Confidential" watermark option
    - Signature block on cover page
    - Page numbers in footer
    - MDR reference in footer

- [ ] **T5: Create BullMQ document generation queue** (AC: async generation)
  - [ ] T5.1: Create BullMQ queue `validation:generate-report` in worker bootstrap (`apps/workers/src/index.ts`)
  - [ ] T5.2: Create processor `apps/workers/src/processors/validation/generate-reports.ts`
  - [ ] T5.3: Job data structure: `{ studyId: string, reportType: DocumentType, requestedById: string }`
  - [ ] T5.4: Validate job data with Zod at queue entry
  - [ ] T5.5: Worker flow:
    1. Fetch validation study data from DB (protocol, results, mappings, amendments)
    2. Prepare data payload for template rendering
    3. Call hybrid engine to generate DOCX
    4. Upload generated DOCX to MinIO: `validation/{studyId}/reports/{reportType}_{timestamp}.docx`
    5. Update ValidationReport record with filePath and status
    6. Emit domain event `validation.report.generated`
  - [ ] T5.6: Report progress via domain events for AsyncTaskPanel (0%, 25% data gathering, 50% template rendering, 75% file upload, 100% complete)
  - [ ] T5.7: Generation must complete in <5 minutes for 100+ page documents (P4)

- [ ] **T6: Create generic document generation queue** (AC: reusable across modules, FR75)
  - [ ] T6.1: Create generic BullMQ queue `docx:generate` for cross-module document generation
  - [ ] T6.2: Create generic processor `apps/workers/src/processors/cer/generate-docx.ts` (will be extended in Epic 5)
  - [ ] T6.3: Implement `DocumentType` enum: `VALIDATION_REPORT`, `CLINICAL_BENEFIT`, `ALGORITHMIC_FAIRNESS`, `LABELING_VALIDATION`, `BENEFIT_QUANTIFICATION`, `PATCH_VALIDATION`, `FDA_18CVS`, `CER_MDR`, `CEP`, `PCCP`, `PMCF_REPORT`, `PSUR`
  - [ ] T6.4: Create document type registry mapping each type to its template path and data preparation function

- [ ] **T7: Create download endpoint** (AC: generated DOCX download)
  - [ ] T7.1: Create Fastify REST endpoint `GET /api/documents/:documentId/download` — serves DOCX file from MinIO
  - [ ] T7.2: Apply RBAC: same role restrictions as the parent module
  - [ ] T7.3: Set correct Content-Type headers: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - [ ] T7.4: Set Content-Disposition: `attachment; filename="{reportType}_{studyName}_{version}.docx"`

- [ ] **T8: Create GraphQL layer for document generation** (AC: API exposure)
  - [ ] T8.1: Add Pothos types: `ValidationReport`, `DocumentType` enum
  - [ ] T8.2: Add queries: `validationReports(studyId)`, `validationReport(id)`
  - [ ] T8.3: Add mutations: `generateValidationReport(studyId, reportType)` — enqueues BullMQ job, returns taskId
  - [ ] T8.4: Add subscription: `onReportGenerationProgress(taskId)` — real-time progress updates

### Docker Configuration

- [ ] **T9: Update worker Dockerfile for LibreOffice** (AC: Carbone dependency)
  - [ ] T9.1: Add LibreOffice installation to `apps/workers/Dockerfile`:
    ```dockerfile
    RUN apt-get update && apt-get install -y libreoffice-core libreoffice-writer
    ```
  - [ ] T9.2: Configure Carbone `converterFactoryStart` to point to installed LibreOffice
  - [ ] T9.3: Note: this adds ~800MB to the worker Docker image (accepted per architecture document)

### Testing Tasks

- [ ] **T10: Write backend/worker tests**
  - [ ] T10.1: Unit test Carbone engine — template rendering with sample data
  - [ ] T10.2: Unit test docx builder — table creation, heading creation, paragraph styling
  - [ ] T10.3: Unit test hybrid engine — merge flow produces valid DOCX
  - [ ] T10.4: Integration test BullMQ worker — end-to-end report generation, MinIO upload
  - [ ] T10.5: Performance test — 100+ page document generated in <5 minutes
  - [ ] T10.6: Unit test document type registry — all types map to valid templates

## Dev Notes

### Technology Stack (Exact Versions)

- **Carbone.io:** `carbone` 5.x — template-driven DOCX generation with JSON data injection
- **docx npm:** `docx` 9.x — programmatic DOCX generation for dynamic content
- **BullMQ:** 5.69.x — async job queue for document generation
- **MinIO:** S3-compatible object storage via `@aws-sdk/client-s3`
- **LibreOffice:** Required by Carbone for DOCX processing (installed in worker Docker image)
- **Worker runtime:** Node.js 20 LTS+

### Hybrid DOCX Strategy (from Architecture)

The architecture specifies a hybrid approach:

1. **Carbone.io** for template-driven documents — regulatory templates with fixed structure where formatting must be exact (cover pages, headers, footers, boilerplate text). DOCX template + JSON data injection.
2. **docx npm** for programmatic sections — dynamic tables (variable rows based on data), computed statistics, comparison charts. Structure varies per project.
3. **Merge strategy:** Carbone generates the base document, docx npm inserts dynamic sections at marked insertion points.

### Carbone Template Syntax

```
{d.title}                          — Simple data binding
{d.sections[i].title}             — Array iteration
{d.sections[i].paragraphs[j].text} — Nested array
{d.date:formatD(YYYY-MM-DD)}     — Date formatting
{d.isMRMC ? "MRMC" : "Standalone"} — Conditional
{d.INSERT_RESULTS_TABLE}          — Insertion point for docx-generated content
```

### Document Data Preparation

```typescript
// Data structure for Validation Report template
interface ValidationReportData {
  // Cover page
  title: string;
  version: string;
  date: string;
  author: string;
  projectName: string;
  deviceName: string;

  // Protocol
  protocol: {
    version: string;
    summary: string;
    endpoints: Array<{ name: string; type: string; target: string; unit: string }>;
    sampleSizeJustification: string;
    statisticalStrategy: string;
  };

  // Amendments
  amendments: Array<{
    fromVersion: string;
    toVersion: string;
    date: string;
    reason: string;
    changes: string;
  }>;

  // Results (dynamic — generated by docx npm)
  INSERT_RESULTS_TABLE: string; // Marker for docx-generated content
  INSERT_COMPARISON_TABLE: string;

  // Conclusions
  conclusions: string;
}
```

### BullMQ Queue Configuration

- **Validation reports queue:** `validation:generate-report`
- **Generic DOCX queue:** `docx:generate` (shared across modules)
- **Job naming convention:** `module:action` (colon separator)
- **Job data:** Typed interfaces, Zod-validated at queue entry
- **Progress tracking:** Domain events emitted at 25%, 50%, 75%, 100% -> GraphQL Subscriptions -> AsyncTaskPanel

### Performance Requirements

- **P4/FR76:** CER document generation (100+ pages) completes in <2 minutes
- **This story target:** Validation Report generation <5 minutes for complex studies
- **Optimization strategies:**
  - Pre-compute data payload before template rendering
  - Stream large document writes to MinIO
  - Use Carbone template caching for repeated template usage

### MinIO Storage Structure

```
validation/
  {studyId}/
    imports/
      v1/original-file.xlsx
      v2/updated-file.xlsx
    reports/
      VALIDATION_REPORT_2026-02-14T10-30-00.docx
      CLINICAL_BENEFIT_2026-02-14T11-00-00.docx
      FDA_18CVS_2026-02-14T11-30-00.docx
```

### Worker Docker Image Notes

- Carbone requires LibreOffice in the Docker image (~800MB increase)
- Accepted per architecture document: "Carbone requires LibreOffice in the worker Docker image (~800MB+ image size). Acceptable for K8s deployment."
- Multi-stage build recommended to keep final image minimal
- LibreOffice packages: `libreoffice-core`, `libreoffice-writer`

### Anti-Patterns to Avoid

- Do NOT generate DOCX synchronously in the API process — always via BullMQ worker
- Do NOT store generated DOCX files in PostgreSQL — store in MinIO
- Do NOT hardcode template paths — use document type registry
- Do NOT skip progress reporting — every generation job must emit progress events
- `console.log` — use structured logger in workers

### Project Structure Notes

```
apps/workers/src/
  shared/
    docx/
      carbone-engine.ts                # Carbone.io wrapper
      docx-builder.ts                  # docx npm builder pattern
      hybrid-engine.ts                 # Orchestrates both engines + merge
      templates/
        validation-report.docx         # Validation Report MDR template
        fda-18cvs.docx                 # FDA 18.CVS template
        cer-mdr.docx                   # CER template (placeholder for Epic 5)
        cep.docx                       # CEP template (placeholder)
        pccp.docx                      # PCCP template (placeholder)
        pmcf-report.docx              # PMCF Report template (placeholder for Epic 6)
        psur.docx                      # PSUR template (placeholder for Epic 6)
  processors/
    validation/
      generate-reports.ts              # BullMQ processor for validation report generation
    cer/
      generate-docx.ts                 # Generic/CER DOCX processor (extended in Epic 5)

apps/api/src/modules/validation/
  graphql/
    types.ts                           # Add ValidationReport, DocumentType types
    mutations.ts                       # Add generateValidationReport mutation
    subscriptions.ts                   # Add onReportGenerationProgress
```

### References

- **Epics:** `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.5
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md` — DOCX Generation Architecture section (Carbone + docx hybrid), BullMQ queue naming, MinIO storage, worker Docker image notes
- **UX Design:** `_bmad-output/planning-artifacts/ux-design-specification.md` — AsyncTaskPanel for generation progress, toast notifications
- **FRs covered:** FR74, FR75, FR76
- **NFRs addressed:** P4 (generation <5 minutes), I2 (DOCX export with configurable templates)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/workers/src/shared/docx/hybrid-engine.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/workers/src/shared/docx/docx-builder.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/workers/src/processors/validation/generate-reports.ts`

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (Automated)
**Date:** 2026-02-16
**Outcome:** Changes Requested

### AC Verification

- [!] **Carbone.io template processing** — No Carbone implementation found. Story requires "Carbone.io processes DOCX templates with JSON data injection" but implementation uses stubbed serialization only.
- [x] **docx npm programmatic generation** — `docx-builder.ts` implements builder pattern with `createTable`, `createHeading`, `createParagraph`, `createNumberedList`, `createBulletList`, `createPageBreak` methods.
- [!] **Hybrid merge strategy** — HybridEngine exists but no actual merge. Line 215-218 in `hybrid-engine.ts` shows stub: returns JSON buffer instead of DOCX binary. No Carbone base + docx sections merge.
- [!] **MDR-compliant templates** — No templates directory found. `apps/workers/src/shared/docx/templates/` does not exist (ls command returned empty).
- [x] **Multiple document types** — DOCUMENT_TYPES array defines all required types (lines 15-28): VALIDATION_REPORT, CLINICAL_BENEFIT, ALGORITHMIC_FAIRNESS, LABELING_VALIDATION, BENEFIT_QUANTIFICATION, PATCH_VALIDATION, FDA_18CVS, CER_MDR, CEP, PCCP, PMCF_REPORT, PSUR.
- [!] **<5 minute generation for 100+ pages** — Cannot verify performance without actual DOCX generation. Stub returns immediately.
- [x] **Async generation via BullMQ** — `generate-reports.ts` implements BullMQ processor with progress tracking (25%, 50%, 75%, 100%).

### Test Coverage

- Unit tests:
  - `hybrid-engine.test.ts` — Engine orchestration
  - `docx-builder.test.ts` — Builder methods
- **Gap**: No integration test with actual Carbone/docx npm libraries

### Code Quality Notes

**Strengths:**

- Clean architecture: HybridEngine orchestrates, DocxBuilder handles structure
- Document type registry pattern is excellent (lines 167-180)
- Progress reporting in worker (lines 58-108)
- BaseProcessor pattern for task management
- Pluggable data preparator functions

**Critical Issues:**

1. **No actual DOCX generation**: Implementation is entirely stubbed
   - Line 217: `return Buffer.from(serialized, 'utf-8')` returns JSON, not DOCX
   - Comment says "Stub serialization: in production this would use docx/carbone"
   - This is a placeholder, not working code

2. **Carbone not installed or configured**:
   - No `carbone` package in dependencies
   - No LibreOffice configuration
   - No template rendering implementation

3. **Templates missing**: No template files in `apps/workers/src/shared/docx/templates/`
   - Story requires 7 templates to be created
   - Cannot generate regulatory documents without templates

4. **No MDR formatting**: Stub builder doesn't enforce regulatory formatting
   - Times New Roman 12pt, margins, page numbering not implemented
   - MDR-specific styling not applied

### Security Notes

- No security concerns with architecture
- Template injection risk when Carbone is added (ensure proper data sanitization)

### Verdict

**Changes Requested** — This is scaffolding only, not a working implementation:

1. **Blocker**: Implement actual DOCX generation
   - Install `carbone` 5.x package
   - Install `docx` 9.x package
   - Replace stub serialization (line 217) with actual docx npm `Packer.toBuffer()`
   - Implement Carbone template rendering in hybrid merge

2. **Blocker**: Create MDR-compliant templates
   - Create `apps/workers/src/shared/docx/templates/` directory
   - Add all 7 required .docx templates with proper MDR formatting
   - validation-report.docx, fda-18cvs.docx, cer-mdr.docx, cep.docx, pccp.docx, pmcf-report.docx, psur.docx

3. **Blocker**: Implement hybrid merge
   - Carbone renders base template
   - docx npm generates dynamic sections
   - Merge at insertion points marked with `{d.INSERT_DYNAMIC_SECTION_X}`

4. **Major**: Add LibreOffice to Docker image
   - Update worker Dockerfile with libreoffice-core, libreoffice-writer
   - Configure Carbone converterFactoryStart path

5. **Major**: Implement MDR formatting in DocxBuilder
   - Times New Roman 12pt body, Arial headings
   - 2.5cm margins, page numbering, header/footer
   - Document ID, version, watermark support

Current implementation is proof-of-concept only. Cannot generate actual regulatory documents.

---

### Change Log

- 2026-02-16: Initial automated senior developer review completed — MAJOR CHANGES REQUIRED
