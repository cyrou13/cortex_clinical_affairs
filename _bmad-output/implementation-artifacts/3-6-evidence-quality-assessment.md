# Story 3.6: Evidence Quality Assessment

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to perform QUADAS-2 and Internal Reading Grids quality assessments per article,
So that I can evaluate evidence quality and assign data contribution levels.

## Acceptance Criteria

**Given** articles in an extraction grid
**When** the Clinical Specialist performs quality assessment
**Then** QUADAS-2 regulatory quality assessment can be completed per article (FR26a)
**And** Internal Reading Grids quality assessment can be completed per article (FR26b)
**And** the system generates a combined quality assessment summary (FR26c)
**And** data contribution level can be assigned per article: pivotal, supportive, background (FR26d)
**And** batch quality assessment can run asynchronously with progress tracking (FR34a)
**And** async quality assessment operations can be cancelled (FR34b)
**And** quality assessment status is visible in the async task panel (FR34c)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Implement QUADAS-2 assessment domain model** (AC: QUADAS-2 per article)
  - [ ] T1.1: Create `apps/api/src/modules/soa/domain/entities/quality-assessment.ts`:
    - QUADAS-2 structure: 4 domains (Patient Selection, Index Test, Reference Standard, Flow & Timing)
    - Each domain: Risk of Bias (Low/High/Unclear), Applicability Concern (Low/High/Unclear)
    - Overall QUADAS-2 summary: computed from individual domain scores
  - [ ] T1.2: Define QUADAS-2 Zod schema in `packages/shared/src/schemas/soa.schema.ts`:
    ```
    quadas2Schema = z.object({
      patientSelection: z.object({ riskOfBias: z.enum(['LOW', 'HIGH', 'UNCLEAR']), applicability: z.enum(['LOW', 'HIGH', 'UNCLEAR']), signallingQuestions: z.array(z.object({ question: z.string(), answer: z.enum(['YES', 'NO', 'UNCLEAR']) })) }),
      indexTest: z.object({ ... }),
      referenceStandard: z.object({ ... }),
      flowAndTiming: z.object({ ... }),
      overallRiskOfBias: z.enum(['LOW', 'HIGH', 'UNCLEAR']),
      overallApplicability: z.enum(['LOW', 'HIGH', 'UNCLEAR']),
    })
    ```

- [ ] **T2: Implement Internal Reading Grid assessment** (AC: Internal Reading Grid per article)
  - [ ] T2.1: Define Internal Reading Grid structure in domain model:
    - Configurable criteria (study design quality, sample size adequacy, statistical analysis, reporting quality, etc.)
    - Each criterion scored: 0 (not met), 1 (partially met), 2 (fully met)
    - Total score computed as sum / max possible
    - Quality rating derived: High (>=80%), Moderate (50-79%), Low (<50%)
  - [ ] T2.2: Define Internal Reading Grid Zod schema in `packages/shared/src/schemas/soa.schema.ts`

- [ ] **T3: Create quality assessment use cases** (AC: assessment CRUD and contribution levels)
  - [ ] T3.1: Create `apps/api/src/modules/soa/application/use-cases/assess-quality.ts`:
    - `createQuadas2Assessment(soaAnalysisId, articleId, assessmentData)` — saves QUADAS-2 for article
    - `createReadingGridAssessment(soaAnalysisId, articleId, assessmentData)` — saves Internal Reading Grid
    - `assignDataContribution(soaAnalysisId, articleId, level: PIVOTAL | SUPPORTIVE | BACKGROUND)` — sets contribution level
    - `getCombinedSummary(soaAnalysisId)` — generates summary across all assessed articles
  - [ ] T3.2: Combined summary logic (FR26c):
    - Counts per quality level (High/Moderate/Low) from Internal Reading Grid
    - Counts per risk of bias level (Low/High/Unclear) from QUADAS-2
    - Counts per contribution level (Pivotal/Supportive/Background)
    - Overall evidence quality rating

- [ ] **T4: Create batch quality assessment worker** (AC: async batch processing)
  - [ ] T4.1: Create `apps/workers/src/processors/soa/batch-quality-assessment.ts`:
    - BullMQ processor for queue `soa:batch-quality-assessment`
    - Job data: `{ soaAnalysisId, articleIds[], assessmentType: 'QUADAS_2' | 'INTERNAL_READING_GRID' }`
    - For QUADAS-2: AI pre-fills signalling questions from article content via LLM
    - Progress tracking: `{ processed: N, total: M }`
    - Cancellation support (FR34b)
  - [ ] T4.2: Register processor in `apps/workers/src/index.ts`
  - [ ] T4.3: Create use case `apps/api/src/modules/soa/application/use-cases/batch-assess-quality.ts`:
    - Enqueues batch job
    - Creates AsyncTask record
    - Returns task ID for progress tracking

- [ ] **T5: Add GraphQL types and operations** (AC: API layer)
  - [ ] T5.1: Add types to `apps/api/src/modules/soa/graphql/types.ts`:
    - `QualityAssessment` type with polymorphic assessment data (QUADAS-2 or Internal Reading Grid)
    - `Quadas2Assessment` type with 4 domains
    - `InternalReadingGridAssessment` type with criteria scores
    - `QualitySummary` type with aggregated counts
    - `DataContributionLevel` enum (PIVOTAL, SUPPORTIVE, BACKGROUND)
  - [ ] T5.2: Add queries:
    - `qualityAssessment(soaAnalysisId, articleId)` — returns assessments for article
    - `qualitySummary(soaAnalysisId)` — returns combined summary (FR26c)
  - [ ] T5.3: Add mutations:
    - `saveQuadas2Assessment(soaAnalysisId, articleId, data)`
    - `saveReadingGridAssessment(soaAnalysisId, articleId, data)`
    - `assignDataContribution(soaAnalysisId, articleId, level)`
    - `batchAssessQuality(soaAnalysisId, articleIds, assessmentType)` — triggers async batch

- [ ] **T6: Write backend tests**
  - [ ] T6.1: Test QUADAS-2 assessment save and retrieval
  - [ ] T6.2: Test Internal Reading Grid scoring computation
  - [ ] T6.3: Test combined summary aggregation
  - [ ] T6.4: Test data contribution level assignment
  - [ ] T6.5: Test batch assessment worker — progress, cancellation

### Frontend Tasks

- [ ] **T7: Create QUADAS-2 assessment form** (AC: QUADAS-2 per article)
  - [ ] T7.1: Create `apps/web/src/features/soa/components/Quadas2Form.tsx`:
    - 4 collapsible sections (one per domain)
    - Each section: signalling questions with Yes/No/Unclear radio buttons
    - Risk of Bias dropdown per domain
    - Applicability Concern dropdown per domain
    - Overall summary auto-computed and displayed at top
  - [ ] T7.2: Use React Hook Form + Zod resolver with QUADAS-2 schema
  - [ ] T7.3: Auto-save on change (10s debounce) per R3

- [ ] **T8: Create Internal Reading Grid form** (AC: Internal Reading Grid per article)
  - [ ] T8.1: Create `apps/web/src/features/soa/components/ReadingGridForm.tsx`:
    - List of criteria with 0/1/2 scoring (radio buttons or select)
    - Total score displayed in real-time as user fills in
    - Quality rating badge (High/Moderate/Low) computed and shown
  - [ ] T8.2: Use React Hook Form + Zod resolver
  - [ ] T8.3: Auto-save on change

- [ ] **T9: Create data contribution level selector** (AC: assign contribution per article)
  - [ ] T9.1: Create `apps/web/src/features/soa/components/DataContributionSelector.tsx`:
    - Three-option selector: Pivotal (star icon), Supportive (check icon), Background (info icon)
    - Visual: button group with active state highlighting
    - Placed in article detail panel or as a grid column
  - [ ] T9.2: Add "Contribution" column to ExtractionGrid with DataContributionSelector as cell editor

- [ ] **T10: Create quality assessment panel** (AC: combined assessment UI)
  - [ ] T10.1: Create `apps/web/src/features/soa/components/QualityAssessmentPanel.tsx`:
    - Opens in detail panel (380px right) when article is selected
    - Tabs: "QUADAS-2" | "Reading Grid" | "Contribution"
    - Shows existing assessment if available, blank form if not
    - Quick navigation: "Previous Article" / "Next Article" buttons
  - [ ] T10.2: Integrate panel with ExtractionGrid: clicking an article row opens the panel

- [ ] **T11: Create quality summary dashboard** (AC: combined quality assessment summary)
  - [ ] T11.1: Create `apps/web/src/features/soa/components/QualitySummary.tsx`:
    - Summary cards: articles by quality level, articles by contribution level
    - Chart: risk of bias distribution (stacked bar)
    - Table: article list with quality rating column
  - [ ] T11.2: Place summary in SOA dashboard under "Quality Assessment" section

- [ ] **T12: Add batch assessment UI** (AC: batch async with progress tracking)
  - [ ] T12.1: Add "Batch Quality Assessment" button in QualitySummary:
    - Triggers batch AI pre-fill of QUADAS-2 signalling questions
    - Shows confirmation dialog: "Pre-fill QUADAS-2 for X articles?"
  - [ ] T12.2: Show batch progress in AsyncTaskPanel (FR34c)
  - [ ] T12.3: Cancel button in AsyncTaskPanel (FR34b)

- [ ] **T13: Write frontend tests**
  - [ ] T13.1: Test QUADAS-2 form renders 4 domains with questions
  - [ ] T13.2: Test Reading Grid form computes total score correctly
  - [ ] T13.3: Test DataContributionSelector toggles between levels
  - [ ] T13.4: Test QualitySummary displays correct aggregated data
  - [ ] T13.5: Test batch assessment triggers async task

## Dev Notes

### Technology Stack & Versions

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, BullMQ 5.69, Node.js 20 LTS+
- **Frontend**: React 19, Apollo Client 3.x, React Hook Form, Zod 3.x, Tailwind CSS 4
- **Workers**: BullMQ 5.69 for batch assessment, LLM abstraction for AI pre-fill

### Architecture Patterns

- **Assessment data storage**: QUADAS-2 and Internal Reading Grid data stored as JSON in `QualityAssessment.assessmentData` field. The `assessmentType` enum distinguishes between types.
- **Polymorphic assessment**: Single `QualityAssessment` table with `assessmentType` discriminator and `assessmentData` JSON field. Zod validates structure on write.
- **Auto-save**: Assessment forms auto-save via debounced Apollo mutation (10s) per R3 requirement.
- **Batch AI**: AI can pre-fill QUADAS-2 signalling questions from article content, but human must still make final risk of bias judgments.

### QUADAS-2 Domain Structure

QUADAS-2 (Quality Assessment of Diagnostic Accuracy Studies) has 4 domains:

1. **Patient Selection**: Were patients selected consecutively/randomly? Was case-control design avoided?
2. **Index Test**: Was the index test interpreted without knowledge of the reference standard?
3. **Reference Standard**: Was the reference standard likely to correctly classify the condition?
4. **Flow and Timing**: Was there an appropriate interval between tests? Did all patients receive the same reference standard?

Each domain has: signalling questions (Yes/No/Unclear), risk of bias (Low/High/Unclear), applicability concern (Low/High/Unclear).

### BullMQ Queue Configuration

- Queue name: `soa:batch-quality-assessment`
- Concurrency: 3 (lower than extraction — assessment involves more complex LLM reasoning)
- Job data Zod-validated at queue entry

### Naming Conventions

- **Prisma model**: `QualityAssessment`
- **Prisma enums**: `AssessmentType { QUADAS_2, INTERNAL_READING_GRID }`, `DataContributionLevel { PIVOTAL, SUPPORTIVE, BACKGROUND }`
- **GraphQL types**: `QualityAssessment`, `Quadas2Assessment`, `InternalReadingGridAssessment`, `QualitySummary`
- **GraphQL mutations**: `saveQuadas2Assessment`, `saveReadingGridAssessment`, `assignDataContribution`, `batchAssessQuality`
- **BullMQ queue**: `soa:batch-quality-assessment`
- **Components**: `Quadas2Form.tsx`, `ReadingGridForm.tsx`, `DataContributionSelector.tsx`, `QualityAssessmentPanel.tsx`, `QualitySummary.tsx`

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/soa.prisma` (verify QualityAssessment model)
- `packages/shared/src/schemas/soa.schema.ts` (add QUADAS-2 and Reading Grid schemas)
- `apps/api/src/modules/soa/domain/entities/quality-assessment.ts` (create)
- `apps/api/src/modules/soa/application/use-cases/assess-quality.ts` (create)
- `apps/api/src/modules/soa/application/use-cases/batch-assess-quality.ts` (create)
- `apps/api/src/modules/soa/graphql/types.ts` (extend)
- `apps/api/src/modules/soa/graphql/queries.ts` (extend)
- `apps/api/src/modules/soa/graphql/mutations.ts` (extend)
- `apps/workers/src/processors/soa/batch-quality-assessment.ts` (create)
- `apps/workers/src/index.ts` (register processor)

**Frontend files to create/modify:**

- `apps/web/src/features/soa/components/Quadas2Form.tsx` (create)
- `apps/web/src/features/soa/components/ReadingGridForm.tsx` (create)
- `apps/web/src/features/soa/components/DataContributionSelector.tsx` (create)
- `apps/web/src/features/soa/components/QualityAssessmentPanel.tsx` (create)
- `apps/web/src/features/soa/components/QualitySummary.tsx` (create)
- `apps/web/src/features/soa/components/ExtractionGrid.tsx` (extend with contribution column)
- `apps/web/src/features/soa/graphql/queries.ts` (extend)
- `apps/web/src/features/soa/graphql/mutations.ts` (extend)

### References

- **Epics file**: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.6 (lines 885-901)
- **Architecture**: `_bmad-output/planning-artifacts/architecture.md` — BullMQ worker patterns, QualityAssessment entity
- **UX Design Spec**: `_bmad-output/planning-artifacts/ux-design-specification.md` — Detail panel pattern (380px right), form patterns
- **Functional Requirements**: FR26a (QUADAS-2), FR26b (Internal Reading Grids), FR26c (combined summary), FR26d (contribution level), FR34a (batch async), FR34b (cancel), FR34c (task panel)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Senior Developer Review (AI)

**Reviewer:** Claude Sonnet 4.5 (Automated Senior Review)
**Date:** 2026-02-16
**Outcome:** Changes Requested

### AC Verification

- [x] **QUADAS-2 per article (FR26a)** — `AssessQualityUseCase` exists. Mutation `assessQuality` accepts assessmentType (QUADAS_2 | INTERNAL_READING_GRID), assessmentData (JSON), dataContributionLevel. QualityAssessment model in schema (lines 215-228).

- [x] **Internal Reading Grids (FR26b)** — Same mutation handles both types via assessmentType enum.

- [!] **Combined quality summary (FR26c)** — AssessQualityUseCase has execute() method for single assessment. getCombinedSummary() method from Task T3.1 NOT found. No query for aggregated quality summary.

- [x] **Data contribution level (FR26d)** — DataContributionLevel enum (PIVOTAL, SUPPORTIVE, BACKGROUND) in schema and mutation parameter.

- [!] **Batch async quality assessment (FR34a)** — No evidence of batch worker `apps/workers/src/processors/soa/batch-quality-assessment.ts`. No mutation for batch operation.

- [!] **Cancellation support (FR34b)** — Not applicable without batch worker.

- [!] **AsyncTaskPanel status (FR34c)** — Not applicable without batch worker.

### Test Coverage

- assess-quality.test.ts exists (3 tests): validates SOA exists, creates quality assessment, saves data.
- **Gap:** No tests for combined summary. No batch worker tests. No tests for QUADAS-2 structure validation.

### Code Quality Notes

**Issues found:**

1. **No combined summary:** Query `qualitySummary(soaAnalysisId)` from Task T5.2 NOT implemented. Use case method missing.
2. **No batch worker:** Critical async feature NOT implemented. Task T4 completely missing.
3. **QUADAS-2 schema validation:** AssessQualityUseCase accepts JSON but no Zod validation of QUADAS-2 structure (4 domains, signalling questions). Task T1.2 specifies detailed Zod schema — NOT found.
4. **Internal Reading Grid schema:** Also missing Zod validation per Task T2.2.
5. **Frontend missing:** Quadas2Form, ReadingGridForm, QualityAssessmentPanel, QualitySummary NOT in File List.

**Strengths:**

- Basic CRUD for quality assessments works.
- Polymorphic design (assessmentType + JSON) is flexible.
- DataContributionLevel enum properly defined.

### Security Notes

- RBAC enforced on assessQuality mutation.
- Assessment data tracked with assessedById and timestamp.

### Verdict

**CHANGES REQUESTED.** Story significantly incomplete. Basic single-article assessment works BUT major features missing:

1. **Combined summary** (FR26c) — core requirement NOT implemented
2. **Batch assessment worker** (FR34a,b,c) — entire async feature missing
3. **QUADAS-2 / Reading Grid validation** — no structured validation of assessment data
4. **Frontend forms** — all UI components unverified

Current implementation is foundation only (~30% complete).

**Required changes:**

1. Implement `getCombinedSummary()` in use case + `qualitySummary` query
2. Implement batch quality assessment worker with progress tracking
3. Add Zod schemas for QUADAS-2 (4 domains structure) and Internal Reading Grid
4. Validate assessmentData against schemas before saving
5. Verify frontend: Quadas2Form, ReadingGridForm, QualityAssessmentPanel, QualitySummary
6. Add comprehensive tests for summary aggregation and batch worker
7. Implement cancellation for batch operations

**Change Log:**

- 2026-02-16: Senior review completed. Changes requested. Combined summary missing (FR26c blocker). Batch worker missing (FR34 not met). Schema validation absent. Frontend unverified.
- 2026-02-16: Code review fixes applied:
  - ✅ Added `getCombinedSummary()` method to AssessQualityUseCase
  - ✅ Added `QualitySummaryType` GraphQL type
  - ✅ Added `qualitySummary(soaAnalysisId)` GraphQL query
  - ✅ Created batch worker stub: `apps/workers/src/processors/soa/assess-quality.ts`
  - ✅ Added 3 new tests for combined summary (total: 10 tests, all passing)
  - ⏳ Pending: Full LLM integration for batch worker
  - ⏳ Pending: Zod schemas for QUADAS-2 and Reading Grid validation
  - ⏳ Pending: Frontend components verification
