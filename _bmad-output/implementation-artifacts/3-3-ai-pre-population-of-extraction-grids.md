# Story 3.3: AI Pre-Population of Extraction Grids

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want AI to pre-populate extraction grid cells from article PDFs,
So that I save time on data extraction and focus on validation.

## Acceptance Criteria

**Given** an extraction grid with defined columns and linked articles with PDFs
**When** the Clinical Specialist clicks "AI Pre-fill"
**Then** AI processes articles asynchronously via BullMQ queue `soa:extract-grid-data`
**And** cells are populated with data extracted from the article PDFs (FR25, FR86)
**And** 50 articles are processed in <10 minutes (P3)
**And** the Clinical Specialist can validate and correct AI-extracted data (FR26)
**And** AI extraction progress is shown in the AsyncTaskPanel
**And** extraction can be cancelled with completed items preserved

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create extraction worker processor** (AC: async AI processing via BullMQ)
  - [ ] T1.1: Create `apps/workers/src/processors/soa/extract-grid-data.ts`:
    - BullMQ processor for queue `soa:extract-grid-data`
    - Job data: `{ soaAnalysisId, extractionGridId, articleIds[], gridColumns[] }`
    - For each article: read PDF from MinIO, send to LLM with extraction prompt, parse response into grid cells
    - Update job progress: `job.updateProgress({ processed: N, total: M, currentArticleTitle: "..." })`
    - On completion: emit domain event `soa.extraction.completed`
  - [ ] T1.2: Implement extraction prompt template:
    - System prompt: "Extract structured data from this scientific article for a clinical evidence analysis grid."
    - Include column definitions (name, type, description) in prompt
    - Request JSON response format: `{ columns: { [columnName]: { value, confidence, sourceQuote, pageNumber } } }`
    - Include article metadata (title, authors, year) for context
  - [ ] T1.3: Implement per-article error handling: if extraction fails for one article, log error, continue with next (never fail entire batch)
  - [ ] T1.4: Implement cancellation support: check `job.isCancelled()` between articles, preserve completed results
  - [ ] T1.5: Implement rate limiting: respect LLM provider rate limits via `apps/workers/src/shared/llm/` abstraction layer

- [ ] **T2: Create extraction use case** (AC: enqueue extraction job, validate prerequisites)
  - [ ] T2.1: Create `apps/api/src/modules/soa/application/use-cases/extract-grid-data.ts`:
    - Validate SOA analysis is not LOCKED
    - Validate extraction grid exists with columns defined
    - Validate articles have associated PDFs (filter out articles without PDFs, warn user)
    - Enqueue BullMQ job `soa:extract-grid-data` with article IDs and grid column definitions
    - Create AsyncTask record for tracking
    - Return task ID for frontend progress tracking
  - [ ] T2.2: Add GraphQL mutation `extractGridData(gridId, articleIds?)`:
    - If no articleIds provided, extract all articles in grid
    - If articleIds provided, extract only specified articles (re-extract)
    - Returns AsyncTask with ID for subscription tracking

- [ ] **T3: Implement AI result persistence** (AC: cells populated with extracted data)
  - [ ] T3.1: In worker processor, after LLM response: parse JSON, validate structure with Zod
  - [ ] T3.2: Upsert GridCell records: set `aiExtractedValue`, `value` (copy from AI if cell is empty), `confidenceLevel` (H/M/L based on LLM confidence score), `sourceQuote`, `sourcePageNumber`
  - [ ] T3.3: Set `validationStatus: PENDING` for all AI-filled cells
  - [ ] T3.4: Cache LLM results in Redis: key = `llm:extract:${articleId}:${gridHash}`, TTL 24h (avoid re-extraction for same article + same grid config)

- [ ] **T4: Create validation use case** (AC: validate and correct AI-extracted data)
  - [ ] T4.1: Create `apps/api/src/modules/soa/application/use-cases/validate-extraction.ts`:
    - `validateCell(gridId, articleId, columnId)` — marks cell as VALIDATED (AI value accepted)
    - `correctCell(gridId, articleId, columnId, newValue)` — marks cell as CORRECTED (user override), preserves `aiExtractedValue` for tracking
    - `flagCell(gridId, articleId, columnId, reason)` — marks cell as FLAGGED for further review
  - [ ] T4.2: Add GraphQL mutations: `validateGridCell`, `correctGridCell`, `flagGridCell`

- [ ] **T5: Add extraction progress subscription** (AC: real-time progress in AsyncTaskPanel)
  - [ ] T5.1: Add to `apps/api/src/modules/soa/graphql/subscriptions.ts`:
    - `onExtractionProgress(taskId)` — streams progress updates: `{ processed, total, currentArticle, status }`
  - [ ] T5.2: Worker processor publishes progress via Redis PubSub (BullMQ progress event)
  - [ ] T5.3: GraphQL subscription resolves BullMQ progress events via `graphql-ws`

- [ ] **T6: Write backend tests**
  - [ ] T6.1: Unit test `extract-grid-data.ts` use case — validates prerequisites, enqueues job
  - [ ] T6.2: Unit test `validate-extraction.ts` — validates cell state transitions
  - [ ] T6.3: Unit test worker processor — mock LLM, verify cell persistence
  - [ ] T6.4: Test cancellation behavior — completed items preserved
  - [ ] T6.5: Test error handling — single article failure does not fail batch

### Frontend Tasks

- [ ] **T7: Add "AI Pre-fill" button to grid toolbar** (AC: trigger AI extraction)
  - [ ] T7.1: Add "AI Pre-fill" button to `ExtractionGridPage.tsx` toolbar:
    - Primary style + brain icon (Lucide `Brain`)
    - Disabled if: SOA is locked, no columns defined, no articles with PDFs
    - Tooltip when disabled explaining reason
  - [ ] T7.2: On click: confirmation dialog showing: article count, estimated time, columns to extract
  - [ ] T7.3: Fire `extractGridData` mutation, receive task ID
  - [ ] T7.4: Subscribe to extraction progress via `onExtractionProgress(taskId)`

- [ ] **T8: Show extraction progress in AsyncTaskPanel** (AC: progress with article count and ETA)
  - [ ] T8.1: Register extraction task in `apps/web/src/shared/components/AsyncTaskPanel.tsx`:
    - Task name: "SOA Grid Extraction"
    - Progress bar: "X / Y articles extracted"
    - Current article name displayed
    - ETA calculated from processing rate
  - [ ] T8.2: Show cancel button (calls `cancelAsyncTask` mutation)
  - [ ] T8.3: On completion: toast notification "Extraction complete. X articles processed."

- [ ] **T9: Add cell validation UI** (AC: validate and correct AI-extracted data)
  - [ ] T9.1: In `ExtractionGrid.tsx`, add cell context menu (right-click):
    - "Validate" — marks cell as validated (green check overlay)
    - "Flag for Review" — marks cell as flagged (red flag overlay)
  - [ ] T9.2: Cells with AI-extracted data show subtle AI icon (AiConfidenceIndicator — Story 3.4 extends this)
  - [ ] T9.3: When user edits an AI-filled cell: automatically set status to CORRECTED, preserve `aiExtractedValue`
  - [ ] T9.4: Visual overlays on cells: validated = check, corrected = edit icon, flagged = flag icon

- [ ] **T10: Show articles without PDFs warning** (AC: inform user about missing PDFs)
  - [ ] T10.1: Before extraction, if some articles lack PDFs: show inline alert "X articles do not have PDFs and will be skipped"
  - [ ] T10.2: In grid, rows without PDFs show "No PDF" indicator in first column

- [ ] **T11: Write frontend tests**
  - [ ] T11.1: Test "AI Pre-fill" button disabled states
  - [ ] T11.2: Test extraction progress display
  - [ ] T11.3: Test cell validation context menu actions
  - [ ] T11.4: Test cell state visual overlays (validated, corrected, flagged)

## Dev Notes

### Technology Stack & Versions

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, Node.js 20 LTS+
- **Workers**: BullMQ 5.69 with Redis 7.x
- **LLM**: Multi-provider via `apps/workers/src/shared/llm/llm-abstraction.ts` (Claude, GPT, Ollama)
- **Object Storage**: MinIO (S3-compatible) for PDF storage
- **Frontend**: React 19, Apollo Client 3.x, ag-Grid 33.x
- **Real-time**: GraphQL Subscriptions via `graphql-ws`

### Architecture Patterns

- **Async processing**: AI extraction runs in BullMQ worker (`apps/workers/src/processors/soa/extract-grid-data.ts`), NOT in API process
- **LLM abstraction**: All LLM calls go through `apps/workers/src/shared/llm/llm-abstraction.ts` — supports Claude, GPT, Ollama
- **LLM caching**: Redis cache for identical prompt+article combinations (TTL 24h) — avoids duplicate extraction costs
- **Cost tracking**: LLM abstraction tracks token usage per call via `apps/workers/src/shared/llm/cost-tracker.ts`
- **Progress tracking**: BullMQ job progress events -> Redis PubSub -> GraphQL subscriptions -> Apollo Client
- **Cancellation**: BullMQ job cancellation with `job.moveToFailed()`, completed items preserved in DB
- **Error isolation**: Per-article error handling — single article failure does not fail entire batch

### LLM Prompt Design

The extraction prompt should:

1. Include system context: "You are extracting structured clinical data from a scientific article."
2. Include grid column definitions with data types and descriptions
3. Include the article PDF text content (extracted from PDF)
4. Request a specific JSON format with value, confidence (0-100), source quote, and page number per column
5. Map LLM confidence score to levels: >= 80 -> HIGH, 50-79 -> MEDIUM, <50 -> LOW

### Performance Requirements

- P3: 50 articles processed in <10 minutes
- Strategy: Parallel LLM calls (batch of 5 concurrent) with rate limiting per provider
- PDF text extraction should be pre-computed and cached (not part of extraction time)

### BullMQ Queue Configuration

- Queue name: `soa:extract-grid-data`
- Job options: `{ attempts: 1, removeOnComplete: 100, removeOnFail: 50 }`
- Concurrency: 5 (configurable via env var)
- Job data validated with Zod at queue entry

### Naming Conventions

- **BullMQ queue**: `soa:extract-grid-data`
- **Domain event**: `soa.extraction.completed`
- **Worker file**: `extract-grid-data.ts`
- **Use case**: `extract-grid-data.ts`, `validate-extraction.ts`
- **GraphQL mutations**: `extractGridData`, `validateGridCell`, `correctGridCell`, `flagGridCell`
- **GraphQL subscription**: `onExtractionProgress`

### Project Structure Notes

**Backend files to create/modify:**

- `apps/workers/src/processors/soa/extract-grid-data.ts` (create)
- `apps/api/src/modules/soa/application/use-cases/extract-grid-data.ts` (create)
- `apps/api/src/modules/soa/application/use-cases/validate-extraction.ts` (create)
- `apps/api/src/modules/soa/graphql/mutations.ts` (extend)
- `apps/api/src/modules/soa/graphql/subscriptions.ts` (create)
- `apps/workers/src/index.ts` (register new processor)

**Frontend files to create/modify:**

- `apps/web/src/features/soa/components/ExtractionGridPage.tsx` (extend with AI Pre-fill button)
- `apps/web/src/features/soa/components/ExtractionGrid.tsx` (extend with validation UI)
- `apps/web/src/features/soa/graphql/mutations.ts` (extend)
- `apps/web/src/features/soa/graphql/subscriptions.ts` (create)
- `apps/web/src/features/soa/hooks/use-extraction-progress.ts` (create)

### References

- **Epics file**: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.3 (lines 837-851)
- **Architecture**: `_bmad-output/planning-artifacts/architecture.md` — LLM abstraction layer, BullMQ patterns, worker structure
- **UX Design Spec**: `_bmad-output/planning-artifacts/ux-design-specification.md` — Journey 3 AI Pre-fill flow (lines 880-891), AsyncTaskPanel pattern (lines 1288-1289)
- **Functional Requirements**: FR25 (AI pre-population), FR26 (validate/correct), FR86 (AI grid extraction)
- **Non-Functional Requirements**: P3 (50 articles in <10 minutes)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
