# Story 6.7: PMCF Report Generation

Status: ready-for-dev

## Story

As an RA Manager,
I want to generate a PMCF Report aggregating all clinical PMCF activities,
So that I have a submission-ready report on post-market clinical follow-up.

## Acceptance Criteria

**Given** a PMS Cycle with completed PMCF activities
**When** the RA Manager clicks "Generate PMCF Report"
**Then** a PMCF Report (DOCX) is generated aggregating all clinical PMCF activities (FR63)
**And** the report includes: activity summaries, findings, conclusions, recommendations
**And** generation uses the DOCX template engine (Carbone.io)
**And** generation runs asynchronously with progress tracking

## Tasks / Subtasks

### Backend

- [ ] Create PMCF Report data aggregation service `apps/api/src/modules/pms/infrastructure/services/pmcf-report-data-service.ts`:
  - Method: `aggregatePmcfReportData(cycleId)` — gather all data needed for the report
  - Collect from the cycle:
    - PMS Plan information (plan name, update frequency, scope)
    - PMS Cycle metadata (reporting period, linked CER version)
    - All PMCF activities with their findings, data collected, and conclusions
    - Gap Registry entries (open, resolved during this cycle)
  - Collect from upstream modules (read-only cross-module):
    - Device information from Project/CEP
    - CER version metadata
    - SOA benchmarks for context
  - Structure the data as JSON payload for Carbone.io template injection
- [ ] Create PMCF Report DOCX template `apps/workers/src/shared/docx/templates/pmcf-report.docx`:
  - MDR-compliant PMCF Report structure:
    - Section 1: Introduction & Scope
    - Section 2: Device Description & Intended Purpose
    - Section 3: PMCF Plan Summary
    - Section 4: PMCF Activities Performed
      - Sub-section per activity type with findings
    - Section 5: Literature Update Summary
    - Section 6: Vigilance Monitoring Results
    - Section 7: Complaints & Incidents Summary
    - Section 8: Installed Base & Usage Data
    - Section 9: Trend Analysis Results
    - Section 10: Gap Registry Status
    - Section 11: Conclusions & Recommendations
    - Section 12: Impact on CER / Need for CER Update
  - Carbone.io template tags for dynamic content injection
  - Professional formatting following MDR template conventions
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/generate-pmcf-report.ts`:
  - Validate: cycle must have completed activities (at minimum, some activities completed)
  - Call pmcf-report-data-service to aggregate data
  - Enqueue BullMQ job `pms:generate-pmcf-report` with aggregated data
  - Create AsyncTask record for progress tracking
  - Return task ID for frontend polling
- [ ] Create BullMQ processor `apps/workers/src/processors/pms/generate-pmcf-report.ts`:
  - Receive aggregated data payload
  - Load PMCF Report template from `templates/pmcf-report.docx`
  - Inject data via Carbone.io
  - If template has dynamic sections (e.g., variable number of activities), use docx npm for programmatic insertion
  - Apply hybrid strategy: Carbone for fixed structure + docx npm for dynamic tables
  - Store generated DOCX in MinIO
  - Update AsyncTask with progress (template loading -> data injection -> dynamic sections -> finalization)
  - Emit domain event `pms.pmcf-report.generated`
  - Store document reference in database (linked to cycle)
- [ ] Add `PmcfReport` model to `pms.prisma` (or use generic DocumentOutput model):
  - id (UUID v7), pmsCycleId, fileName, fileKey (MinIO key), fileSize
  - generatedAt (DateTime), generatedBy
  - status (GENERATING/COMPLETED/FAILED)
  - version (Int, auto-increment per cycle)
- [ ] Add GraphQL types:
  - PmcfReport type (id, fileName, fileSize, generatedAt, status, downloadUrl)
  - GenerateReportResult type (taskId, status)
- [ ] Add GraphQL queries:
  - `pmcfReports(cycleId: UUID!)` — list of generated reports for the cycle
  - `pmcfReport(id: UUID!)` — single report with download URL
- [ ] Add GraphQL mutations:
  - `generatePmcfReport(cycleId: UUID!)` — trigger generation (returns task ID)
- [ ] Add GraphQL subscription or query for generation progress:
  - Use existing AsyncTask subscription pattern (`onTaskProgress`)
- [ ] Create a presigned URL service for report downloads from MinIO
- [ ] Write unit tests for PMCF report data aggregation
- [ ] Write integration test for the full generation pipeline (mock Carbone.io)

### Frontend

- [ ] Create `apps/web/src/features/pms/components/PmcfReportGenerator.tsx`:
  - "Generate PMCF Report" button (Primary, Download icon)
  - Pre-generation preview: list of sections that will be included based on completed activities
  - If not all activities completed: warning alert "Some activities are still pending. The report will be generated with available data."
  - Generation progress: integrates with AsyncTaskPanel
  - Generation complete: toast notification + download link
- [ ] Create `PmcfReportsList.tsx`:
  - List of previously generated PMCF Reports for the cycle
  - Each entry: version number, generated date, file size, status badge
  - "Download" button per report (triggers presigned URL fetch + download)
  - "Regenerate" button (creates a new version)
  - ag-Grid or simple shadcn Table (likely few entries, simple table sufficient)
- [ ] Create `PmcfReportPreview.tsx`:
  - Preview panel showing what data will be included in the report
  - Section-by-section breakdown:
    - Activity summaries (showing completion status)
    - Complaint statistics
    - Trend analysis summary
    - Gap Registry status
  - Helps RA Manager verify completeness before generation
- [ ] Add "PMCF Report" section to PMS sidebar navigation
- [ ] Connect report generation to AsyncTaskPanel:
  - Show "Generating PMCF Report..." with progress bar
  - On completion: toast "PMCF Report generated successfully" with download link
- [ ] Add download handler:
  - Fetch presigned URL from GraphQL query
  - Trigger browser download
- [ ] Write component tests for PmcfReportGenerator button states

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Workers:** BullMQ 5.69, Carbone.io 5.x, docx npm 9.x
- **Storage:** MinIO (S3-compatible) for generated DOCX files
- **Frontend:** React 19, Apollo Client 3.x, shadcn/ui + Tailwind CSS 4

### DOCX Generation Architecture (from Architecture Decision)

- **Hybrid strategy:** Carbone.io for template-driven base document + docx npm for dynamic sections
- **Carbone.io:** Processes DOCX templates with JSON data injection. Template tags like `{d.planName}`, `{d.activities[i].type}`
- **docx npm:** For programmatic sections that vary (dynamic number of activities, variable-length tables)
- **Merge strategy:** Carbone generates the base document, then docx npm inserts/replaces dynamic sections
- **Template location:** `apps/workers/src/shared/docx/templates/pmcf-report.docx`
- **Engine location:** `apps/workers/src/shared/docx/carbone-engine.ts` and `docx-builder.ts`
- **Note:** Carbone requires LibreOffice in the worker Docker image (~800MB+ image size)

### BullMQ Job Pattern

- Queue name: `pms:generate-pmcf-report` (follows `module:action` convention)
- Job data: `{ cycleId, reportData (aggregated JSON), userId }`
- Job data is Zod-validated at queue entry
- Progress reporting: update AsyncTask record at each step
- Steps: loading template (10%) -> data injection (40%) -> dynamic sections (70%) -> finalization (90%) -> storage (100%)
- On failure: store error in AsyncTask, emit `pms.pmcf-report.failed` event

### MinIO Storage Pattern

- Store generated DOCX in MinIO bucket (e.g., `cortex-documents`)
- Key format: `projects/{projectId}/pms/pmcf-reports/{reportId}.docx`
- Generate presigned URL for download (expiry: 1 hour)
- Same pattern used by SLS for PDF storage

### Report Data Structure

```typescript
interface PmcfReportData {
  plan: { name; updateFrequency; scope };
  cycle: { name; startDate; endDate; cerVersion };
  device: { name; classification; regulatoryContext };
  activities: Array<{
    type: ActivityType;
    title: string;
    findings: string;
    conclusions: string;
    dataCollected: unknown;
  }>;
  complaints: {
    totalCount: number;
    bySeverity: Record<string, number>;
    byClassification: Record<string, number>;
  };
  trendAnalysis?: {
    complaintRate: number;
    significantChanges: Array<SignificantChange>;
    conclusions: string;
  };
  gapRegistry: {
    totalGaps: number;
    resolvedThisCycle: number;
    openGaps: number;
  };
}
```

### Naming Conventions

- Domain event: `pms.pmcf-report.generated`, `pms.pmcf-report.failed`
- BullMQ queue: `pms:generate-pmcf-report`
- GraphQL: `generatePmcfReport`
- Files: `generate-pmcf-report.ts` (use case + worker processor), `PmcfReportGenerator.tsx`

### UX Patterns

- Follow AsyncTaskPanel pattern established in Epic 1 (Story 1.10)
- Report generation button disabled with tooltip when no activities completed
- Warning alert (orange) for partial report generation
- Success toast with download action
- "Pas de cul-de-sac": after report generation, suggest "Generate PSUR" or "Document CER Update Decision"

### Anti-Patterns to Avoid

- Do NOT generate DOCX synchronously in the GraphQL resolver — always use BullMQ
- Do NOT store generated DOCX in the database — use MinIO object storage
- Do NOT skip data validation — validate report data before sending to Carbone
- Do NOT hardcode template content — use Carbone template files for maintainability
- Do NOT generate reports with zero completed activities — at minimum require some data

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    generate-pmcf-report.ts          # NEW
  infrastructure/services/
    pmcf-report-data-service.ts      # NEW

apps/workers/src/processors/pms/
  generate-pmcf-report.ts            # NEW

apps/workers/src/shared/docx/templates/
  pmcf-report.docx                   # NEW (Carbone template)

apps/web/src/features/pms/
  components/
    PmcfReportGenerator.tsx           # NEW
    PmcfReportsList.tsx               # NEW
    PmcfReportPreview.tsx             # NEW

packages/prisma/schema/pms.prisma    # UPDATE (add PmcfReport model)
```

### References

- **PRD FRs:** FR63
- **Architecture:** Hybrid DOCX generation (Carbone.io + docx npm), BullMQ async processing, MinIO object storage, AsyncTask panel, `apps/workers/src/shared/docx/` location
- **UX Spec:** AsyncTaskPanel for progress, toast notifications, download pattern, "Pas de cul-de-sac" navigation
- **Dependencies:** Story 6.3 (PMS Cycle), Story 6.4 (PMCF Activities), Story 6.5 (Complaints), Story 6.6 (Trend Analysis), DOCX Generation Engine (Story 4.5)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
