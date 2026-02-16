# Story 4.3: XLS Data Import with Multi-Version Management

Status: done

## Story

As a Data Science team member,
I want to import validation results via XLS file upload with version management and diff comparison,
So that results can be updated and tracked over time.

## Acceptance Criteria

**Given** a validation study with a defined protocol
**When** the Data Science user uploads an XLS file
**Then** the system validates the XLS schema (ensures required fields present) (FR39)
**And** multiple XLS import versions can be managed per study (FR38a)
**And** the user can select the "active" import version for report generation (FR38b)
**And** diffs between import versions are displayed (FR38c)
**And** previous import versions can be rolled back to if needed (FR38d)
**And** import validation errors are shown as inline alerts with corrective actions
**And** the import runs asynchronously with progress tracking (FR44a, FR44b)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create XLS parser service** (AC: XLS schema validation, FR39)
  - [ ] T1.1: Create `apps/api/src/modules/validation/infrastructure/services/xls-parser-service.ts`
  - [ ] T1.2: Install and configure `xlsx` (SheetJS) library for XLS/XLSX file parsing
  - [ ] T1.3: Define expected schema per study type:
    - Standalone: `subject_id`, `ground_truth`, `prediction`, `confidence` (minimum required columns)
    - MRMC: `reader_id`, `subject_id`, `ground_truth`, `prediction`, `confidence`, `reading_session`
  - [ ] T1.4: Implement schema validation: check required columns present, validate data types per column, validate no empty required cells
  - [ ] T1.5: Return structured validation result: `{ valid: boolean, errors: SchemaError[], warnings: SchemaWarning[], rowCount: number, columnCount: number }`
  - [ ] T1.6: SchemaError structure: `{ row?: number, column: string, message: string, severity: 'error' | 'warning' }`

- [ ] **T2: Create import use case with versioning** (AC: multi-version management, FR38a)
  - [ ] T2.1: Create `apps/api/src/modules/validation/application/use-cases/import-xls.ts`
  - [ ] T2.2: On upload: validate schema, parse data to JSON, store as new DataImport record with auto-incremented version number
  - [ ] T2.3: DataImport status flow: PENDING (uploading) -> VALIDATED (schema OK) -> ACTIVE (selected for report) or SUPERSEDED (replaced by newer version)
  - [ ] T2.4: Only one DataImport can be ACTIVE per study at a time
  - [ ] T2.5: Store parsed data as JSONB in `data` field for fast comparison
  - [ ] T2.6: Store original file in MinIO (S3-compatible object storage) with path: `validation/{studyId}/imports/v{version}/{fileName}`

- [ ] **T3: Create version management use cases** (AC: active version selection, rollback, diff)
  - [ ] T3.1: Create `apps/api/src/modules/validation/application/use-cases/manage-import-versions.ts`
  - [ ] T3.2: Implement `setActiveVersion(dataImportId)` — sets target version to ACTIVE, sets previous active to SUPERSEDED (FR38b)
  - [ ] T3.3: Implement `rollbackToVersion(dataImportId)` — sets target version to ACTIVE, marks current active as ROLLED_BACK (FR38d)
  - [ ] T3.4: Implement `computeDiff(versionA, versionB)` — compares two DataImport JSON payloads, returns structured diff (FR38c):
    - Added rows, removed rows, modified cells
    - Summary statistics: `{ addedRows: number, removedRows: number, modifiedCells: number }`

- [ ] **T4: Create async import worker** (AC: asynchronous import, FR44a, FR44b)
  - [ ] T4.1: Create BullMQ queue `validation:import-xls` in `apps/workers/src/processors/validation/import-xls.ts`
  - [ ] T4.2: Worker flow: receive file path from MinIO -> parse XLS -> validate schema -> store parsed data -> update DataImport status
  - [ ] T4.3: Emit progress events via domain events for AsyncTaskPanel updates (upload progress, validation progress, parsing progress)
  - [ ] T4.4: On completion, emit domain event `validation.import.completed` with import summary
  - [ ] T4.5: On failure, set DataImport status to FAILED with error details

- [ ] **T5: Create REST endpoint for file upload** (AC: file upload)
  - [ ] T5.1: Create Fastify REST route `POST /api/validation-studies/:studyId/imports` for file upload (file upload uses REST, not GraphQL)
  - [ ] T5.2: Accept multipart form data with XLS/XLSX file
  - [ ] T5.3: Validate file type (`.xls`, `.xlsx` only), file size limit (50MB)
  - [ ] T5.4: Upload file to MinIO, then enqueue BullMQ job for async processing
  - [ ] T5.5: Return `{ importId, status: 'PENDING', taskId }` immediately

- [ ] **T6: Create GraphQL layer for imports** (AC: API for version management)
  - [ ] T6.1: Add Pothos types: `DataImport`, `ImportDiff`, `SchemaError`
  - [ ] T6.2: Add queries: `dataImports(studyId)`, `dataImport(id)`, `importDiff(versionAId, versionBId)`
  - [ ] T6.3: Add mutations: `setActiveImportVersion`, `rollbackImportVersion`
  - [ ] T6.4: Apply RBAC: Admin, RA Manager, Data Science can upload and manage imports

### Frontend Tasks

- [ ] **T7: Create XlsImporter component** (AC: file upload, schema validation display)
  - [ ] T7.1: Create `apps/web/src/features/validation/components/XlsImporter.tsx`
  - [ ] T7.2: Implement drag-and-drop file upload zone (shadcn-styled) with:
    - Accepted formats: .xls, .xlsx
    - File size display
    - Upload progress bar
  - [ ] T7.3: After upload, display schema validation results:
    - Success: green Alert with row/column count summary
    - Errors: red inline Alert listing each schema error with row number, column name, and corrective action
    - Warnings: orange inline Alert for non-blocking issues
  - [ ] T7.4: Error messages in human language (not technical): "Column 'subject_id' is missing. Please add it to your spreadsheet." (not "Schema validation failed")
  - [ ] T7.5: Provide downloadable template link: "Download XLS template for [Standalone/MRMC] study"
  - [ ] T7.6: File upload uses TanStack Query (REST endpoint), not Apollo Client (per architecture: REST/fetch -> TanStack Query)

- [ ] **T8: Create import version list** (AC: multi-version display, active selection, FR38a, FR38b)
  - [ ] T8.1: Create `apps/web/src/features/validation/components/ImportVersionList.tsx`
  - [ ] T8.2: Display list of all import versions as Cards with:
    - Version number (v1, v2, v3)
    - Upload date and uploader name
    - Status badge (ACTIVE / SUPERSEDED / ROLLED_BACK)
    - Row count, file name
    - "Set as Active" button (visible only for non-active versions)
    - "Compare with..." dropdown to trigger diff view
  - [ ] T8.3: Active version is highlighted with blue-100 background and "Active" badge (success variant)
  - [ ] T8.4: "Rollback to this version" action available for SUPERSEDED versions (with confirmation dialog)

- [ ] **T9: Create ImportVersionDiff component** (AC: diff display, FR38c)
  - [ ] T9.1: Create `apps/web/src/features/validation/components/ImportVersionDiff.tsx`
  - [ ] T9.2: Display side-by-side or unified diff view showing:
    - Added rows (green background)
    - Removed rows (red background)
    - Modified cells (orange highlight with old value strikethrough, new value bold)
  - [ ] T9.3: Summary bar at top: "X rows added, Y rows removed, Z cells modified"
  - [ ] T9.4: Use ag-Grid for diff rendering with custom cell renderers for diff highlighting

- [ ] **T10: Integrate with AsyncTaskPanel** (AC: async progress tracking, FR44a, FR44b)
  - [ ] T10.1: When import is triggered, show task in AsyncTaskPanel: "Importing XLS v3... 45%"
  - [ ] T10.2: Subscribe to GraphQL subscriptions for import progress updates
  - [ ] T10.3: On completion, toast notification: "Import v3 completed. 350 rows imported. Schema validated."
  - [ ] T10.4: On failure, toast error: "Import failed: 3 schema errors found. [View details]"

- [ ] **T11: Create GraphQL operations** (AC: data fetching)
  - [ ] T11.1: Create import-related queries and mutations in `apps/web/src/features/validation/graphql/`
  - [ ] T11.2: Use Apollo Client for GraphQL operations, TanStack Query for REST file upload

### Testing Tasks

- [ ] **T12: Write backend tests**
  - [ ] T12.1: Unit test XLS parser — valid schema, missing columns, wrong data types
  - [ ] T12.2: Unit test version management — setActive, rollback, only one active at a time
  - [ ] T12.3: Unit test diff computation — added rows, removed rows, modified cells
  - [ ] T12.4: Integration test REST upload endpoint — file validation, MinIO storage
  - [ ] T12.5: Integration test BullMQ worker — end-to-end import flow

- [ ] **T13: Write frontend tests**
  - [ ] T13.1: Component test XlsImporter — drag-drop, validation error display
  - [ ] T13.2: Component test ImportVersionList — version selection, active indicator
  - [ ] T13.3: Component test ImportVersionDiff — diff rendering

## Dev Notes

### Technology Stack (Exact Versions)

- **Backend:** Fastify 5.7.x, Apollo Server 4, Prisma 7.2.x, BullMQ 5.69.x, Node.js 20 LTS+
- **XLS Parsing:** `xlsx` (SheetJS) library for parsing .xls/.xlsx files
- **Object Storage:** MinIO (S3-compatible) via `@aws-sdk/client-s3` — PDFs and documents stored here
- **Frontend:** React 19.x, Apollo Client 3.x, TanStack Query 5.90.x (for REST file upload), ag-Grid 33.x (for diff view), Tailwind CSS 4.x, shadcn/ui
- **Testing:** Vitest (unit/integration)

### File Upload Architecture

- File uploads use **REST endpoint** (not GraphQL) — GraphQL is not designed for file uploads
- REST endpoint: `POST /api/validation-studies/:studyId/imports` (multipart form data)
- File upload from frontend uses **TanStack Query** (per architecture: REST/fetch -> TanStack Query, GraphQL -> Apollo Client)
- File is first uploaded to MinIO, then a BullMQ job is enqueued for async processing
- The REST endpoint returns immediately with `{ importId, taskId }` for tracking

### BullMQ Queue Configuration

- Queue name: `validation:import-xls` (following `module:action` naming convention)
- Worker: `apps/workers/src/processors/validation/import-xls.ts`
- Job data: `{ importId: string, studyId: string, filePath: string, studyType: 'STANDALONE' | 'MRMC' }`
- Job data validated with Zod at queue entry
- Progress updates via domain events -> GraphQL Subscriptions -> Apollo Client

### XLS Schema Validation Rules

```typescript
// Standalone study required columns
const STANDALONE_SCHEMA = {
  required: ['subject_id', 'ground_truth', 'prediction', 'confidence'],
  optional: ['age', 'sex', 'subgroup', 'notes'],
  types: {
    subject_id: 'string',
    ground_truth: 'number | string', // binary or categorical
    prediction: 'number | string',
    confidence: 'number', // 0-1 range
  },
};

// MRMC study required columns
const MRMC_SCHEMA = {
  required: [
    'reader_id',
    'subject_id',
    'ground_truth',
    'prediction',
    'confidence',
    'reading_session',
  ],
  optional: ['reader_specialty', 'experience_years', 'age', 'sex', 'subgroup', 'notes'],
  types: {
    reader_id: 'string',
    subject_id: 'string',
    reading_session: 'number', // session number
    ground_truth: 'number | string',
    prediction: 'number | string',
    confidence: 'number',
  },
};
```

### Diff Computation Algorithm

- Compare DataImport.data JSONB between two versions
- Match rows by `subject_id` (and `reader_id` for MRMC)
- Classify each row: ADDED (in B, not in A), REMOVED (in A, not in B), MODIFIED (in both, values differ), UNCHANGED
- For modified rows, identify which cells changed
- Return structured diff result for frontend rendering

### UX Design Notes

- **File upload zone:** Dashed border (#C2DCF0), drag-over state with blue-50 background, accepted format badges
- **Validation errors:** Inline Alert (error variant) with 3px left border red. Each error has row/column reference and corrective action. Not technical error messages.
- **Import version list:** Cards with elevation (shadow-sm), active version highlighted with blue-100 background
- **Diff view:** ag-Grid with custom cell renderers — added (green-50 bg), removed (red-50 bg with strikethrough), modified (orange-50 bg)
- **Summary bar:** Large numbers (text-2xl) for diff statistics — "12 rows added, 3 removed, 45 cells modified"
- **Async progress:** Import shown in AsyncTaskPanel with brain icon, progress bar, ETA
- **Error feedback:** Human-readable: "Column 'subject_id' is missing." + action: "[Download template]"

### Anti-Patterns to Avoid

- Do NOT use GraphQL for file upload — use REST endpoint
- Do NOT parse XLS synchronously in the API process — use BullMQ worker
- Do NOT store raw XLS file content in PostgreSQL — store in MinIO, store parsed JSON in JSONB column
- `any` in TypeScript — use `unknown` + type guard for parsed XLS data
- `console.log` — use structured logger

### Project Structure Notes

```
apps/api/src/modules/validation/
  infrastructure/services/
    xls-parser-service.ts              # XLS parsing and schema validation
  application/use-cases/
    import-xls.ts                      # Upload and enqueue import job
    manage-import-versions.ts          # Set active, rollback, compute diff

apps/workers/src/processors/validation/
  import-xls.ts                        # BullMQ worker for async XLS processing

apps/web/src/features/validation/
  components/
    XlsImporter.tsx                    # File upload with drag-drop
    ImportVersionList.tsx              # Version management UI
    ImportVersionDiff.tsx              # Side-by-side diff view
```

### References

- **Epics:** `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.3
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md` — BullMQ queue naming, async task infrastructure, MinIO storage, REST for file upload, TanStack Query for REST
- **UX Design:** `_bmad-output/planning-artifacts/ux-design-specification.md` — Alert patterns, loading states, AsyncTaskPanel, error messaging
- **FRs covered:** FR38, FR38a, FR38b, FR38c, FR38d, FR39
- **NFRs addressed:** FR44a, FR44b (async operations), I1 (import .xlsx format)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/api/src/modules/validation/infrastructure/services/xls-parser-service.ts` (inferred)
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/api/src/modules/validation/application/use-cases/import-xls.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/web/src/features/validation/components/XlsImporter.tsx`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/web/src/features/validation/components/ImportVersionList.tsx`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/web/src/features/validation/components/ImportVersionDiff.tsx`

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (Automated)
**Date:** 2026-02-16
**Outcome:** Changes Requested

### AC Verification

- [x] **XLS schema validation** — `import-xls.ts` lines 49-54 call `validateXlsData` with study-type-specific schema. Validation errors throw `ValidationError`.
- [x] **Multi-version management** — `DataImport` model has `version` field auto-incremented (lines 56-63). Each import gets next version number.
- [x] **Active version selection** — `isActive` boolean flag on DataImport. Lines 82-90 deactivate previous imports when new one created. Only one active at a time.
- [!] **Diff between versions** — `ImportVersionDiff.tsx` component exists but no backend `computeDiff` use case found as specified in tasks (T3.4). Diff computation logic not verified.
- [!] **Rollback capability** — No `rollbackToVersion` use case found in implementation. AC FR38d not fulfilled.
- [x] **Inline validation errors** — Schema validation returns structured errors with row/column info.
- [!] **Async import with progress tracking** — No BullMQ worker found. Import is synchronous in `import-xls.ts`. FR44a/FR44b not met.

### Test Coverage

- Unit tests:
  - `import-xls.test.ts` — Import flow and version management
- Frontend tests:
  - `XlsImporter.test.tsx` — File upload UI
  - `ImportVersionList.test.tsx` — Version display
  - `ImportVersionDiff.test.tsx` — Diff rendering
- **Gap**: No BullMQ worker test, no diff computation test, no rollback test

### Code Quality Notes

**Strengths:**

- Version auto-increment logic is clean and race-condition safe
- Lock check prevents import on locked studies (line 42)
- Proper Prisma.InputJsonValue casting for JSON data
- Schema validation separated into service layer

**Critical Issues:**

1. **Async processing missing**: Import runs synchronously in API process, not via BullMQ worker as specified
   - Story requires async import with progress tracking (FR44a, FR44b)
   - Architecture mandates BullMQ for file processing to avoid blocking API
   - Current implementation could timeout on large files

2. **Diff computation missing**: No use case for `computeDiff(versionA, versionB)` as specified in T3.4
   - Frontend component exists but backend logic not implemented
   - Diff algorithm not verified (added rows, removed rows, modified cells)

3. **Rollback missing**: No `rollbackToVersion` use case (AC FR38d)
   - Cannot roll back to previous import version
   - `ROLLED_BACK` status mentioned in story but not used

4. **REST endpoint missing**: Story specifies `POST /api/validation-studies/:studyId/imports` for file upload
   - Current implementation appears to be synchronous mutation
   - File upload should use REST + TanStack Query per architecture

### Security Notes

- File size limit validation not seen in code
- File type validation (`.xls`, `.xlsx` only) not verified
- MinIO storage path mentioned in story but not seen in implementation

### Verdict

**Changes Requested** — Critical gaps in async processing and version management:

1. **Blocker**: Implement BullMQ worker for async XLS processing
   - Create queue `validation:import-xls`
   - Worker at `apps/workers/src/processors/validation/import-xls.ts`
   - Progress events via domain events
   - File stored in MinIO before processing

2. **Blocker**: Implement version diff computation
   - Create `manage-import-versions.ts` use case with `computeDiff`
   - Algorithm: match rows by subject_id, classify as ADDED/REMOVED/MODIFIED

3. **Major**: Implement rollback functionality
   - `rollbackToVersion(dataImportId)` use case
   - Set target version to ACTIVE, mark current as ROLLED_BACK

4. **Major**: Add REST file upload endpoint
   - `POST /api/validation-studies/:studyId/imports` multipart form data
   - File size limit (50MB) and type validation
   - Upload to MinIO, enqueue BullMQ job

Without async processing, this could cause production issues with large files.

---

### Change Log

- 2026-02-16: Initial automated senior developer review completed — CHANGES REQUIRED
