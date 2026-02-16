# Story 3.8: AI-Assisted Narrative Drafting

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want AI to draft narratives for each thematic section based on extraction grid data,
So that I have a solid starting point for section writing that I can refine.

## Acceptance Criteria

**Given** a thematic section with populated extraction grid data
**When** the Clinical Specialist clicks "Generate Narrative"
**Then** AI drafts a narrative for the section based on the extraction grid data (FR28, FR87)
**And** the narrative is displayed in a Plate rich text editor for inline editing (FR29)
**And** AI-drafted content includes inline references [1], [2] with hover popover to source article
**And** the Clinical Specialist can review, edit, and approve the narrative (FR29)
**And** the editor supports: bold, italic, headings, lists, tables, inline references
**And** auto-save every 10 seconds (R3)
**And** the system tracks human edits vs. AI-generated content for acceptance rate metrics (FR90)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create narrative drafting worker** (AC: AI generates narrative from grid data)
  - [ ] T1.1: Create `apps/workers/src/processors/soa/draft-narrative.ts`:
    - BullMQ processor for queue `soa:draft-narrative`
    - Job data: `{ soaAnalysisId, thematicSectionId, extractionGridId }`
    - Steps: (1) Load extraction grid data for section, (2) Build LLM prompt with grid data + section context, (3) Request narrative draft from LLM, (4) Parse response into Plate-compatible JSON, (5) Save to `ThematicSection.narrativeAiDraft`
    - Progress tracking: "Generating narrative for [Section Title]..."
  - [ ] T1.2: Implement narrative prompt template:
    - System prompt: "You are a medical device regulatory writer drafting a State of the Art analysis section."
    - Include section title, description, and type (Clinical/Device)
    - Include extraction grid data as structured summary (article summaries, key findings)
    - Include quality assessment summaries if available
    - Request Markdown with inline references in format `[Author Year]`
    - Request structured headings, bullet points, and data tables where appropriate
  - [ ] T1.3: Implement reference mapping: map `[Author Year]` references in AI output to actual article IDs
  - [ ] T1.4: Convert AI Markdown output to Plate editor JSON format (Slate nodes)

- [ ] **T2: Create narrative drafting use case** (AC: enqueue narrative generation)
  - [ ] T2.1: Create `apps/api/src/modules/soa/application/use-cases/draft-narrative.ts`:
    - Validate section exists and SOA is not locked
    - Validate extraction grid has data (at least some cells populated)
    - Enqueue BullMQ job `soa:draft-narrative`
    - Create AsyncTask record for tracking
    - Return task ID
  - [ ] T2.2: Add GraphQL mutation: `generateSectionNarrative(sectionId)` — triggers async narrative generation

- [ ] **T3: Create narrative save and tracking use case** (AC: save edits, track AI vs human)
  - [ ] T3.1: Extend `apps/api/src/modules/soa/application/use-cases/create-section.ts` or create new use case:
    - `saveSectionNarrative(sectionId, content)` — saves current narrative content (Plate JSON)
    - Preserve `narrativeAiDraft` field as original AI version (never overwritten by user edits)
    - Compute diff between `narrativeAiDraft` and `narrativeContent` for acceptance rate tracking (FR90)
  - [ ] T3.2: Track AI acceptance metrics:
    - Store word count of AI draft and final content
    - Compute acceptance rate: percentage of AI content retained in final
    - Log metrics per section for reporting

- [ ] **T4: Create inline reference system** (AC: references linked to source articles)
  - [ ] T4.1: Create `apps/api/src/modules/soa/domain/entities/narrative-reference.ts`:
    - `NarrativeReference` model: `id`, `thematicSectionId`, `referenceIndex` (1, 2, 3...), `articleId`, `sourceQuote`
    - Stored separately from narrative content for stable reference resolution
  - [ ] T4.2: Add `NarrativeReference` to Prisma schema (in soa.prisma)
  - [ ] T4.3: Add queries: `narrativeReferences(sectionId)` — returns references with article metadata
  - [ ] T4.4: Add mutations: `addNarrativeReference(sectionId, articleId, sourceQuote)`, `removeNarrativeReference(sectionId, referenceId)`

- [ ] **T5: Add subscription for narrative generation** (AC: real-time progress)
  - [ ] T5.1: Add subscription `onNarrativeProgress(taskId)` — streams progress
  - [ ] T5.2: On completion: narrative content is auto-loaded into the Plate editor via Apollo cache update

- [ ] **T6: Write backend tests**
  - [ ] T6.1: Test narrative generation use case — validates prerequisites, enqueues job
  - [ ] T6.2: Test worker processor — mock LLM, verify output format
  - [ ] T6.3: Test reference mapping — AI references mapped to article IDs
  - [ ] T6.4: Test acceptance rate computation
  - [ ] T6.5: Test narrative save preserves AI draft

### Frontend Tasks

- [ ] **T7: Integrate Plate editor for narrative editing** (AC: rich text editor with formatting)
  - [ ] T7.1: Install and configure `@udecode/plate` in `apps/web/`:
    - Install: `@udecode/plate-common`, `@udecode/plate-heading`, `@udecode/plate-list`, `@udecode/plate-table`, `@udecode/plate-basic-marks` (bold, italic), `@udecode/plate-paragraph`
    - Configure Plate plugins for required formatting: headings (H2, H3), bold, italic, lists (ordered, unordered), tables, paragraphs
    - Apply CORTEX theming: Inter font, standard spacing
  - [ ] T7.2: Update `apps/web/src/features/soa/components/SectionEditor.tsx`:
    - Replace placeholder textarea with Plate editor
    - Toolbar: Bold (Ctrl+B), Italic (Ctrl+I), Headings (H2, H3), Ordered List, Unordered List, Table Insert, Reference Insert
    - Toolbar follows UX spec: horizontal, above editor area
  - [ ] T7.3: Configure Plate serialization: save as Plate JSON (Slate nodes format)

- [ ] **T8: Implement inline references in Plate** (AC: [1], [2] with hover popover)
  - [ ] T8.1: Create custom Plate plugin for inline references:
    - Reference node type: `{ type: 'reference', referenceIndex: 1, articleId: 'uuid', children: [{ text: '[1]' }] }`
    - Rendered as clickable badge: `[1]` in blue with hover popover
  - [ ] T8.2: Hover popover shows: article title, authors, year, journal, source quote (if available)
  - [ ] T8.3: Click on reference: option to "View Article" (navigates to article detail) or "Remove Reference"
  - [ ] T8.4: "Insert Reference" toolbar button: opens search popover to find and link article from SLS dataset

- [ ] **T9: Add "Generate Narrative" button and flow** (AC: trigger AI drafting)
  - [ ] T9.1: Add "Generate Narrative" button to `SectionEditor.tsx`:
    - Primary style + Brain icon (Lucide)
    - Disabled if: no grid data, SOA locked, or narrative already generating
    - If narrative already exists: "Regenerate Narrative" with warning "This will replace the current AI draft"
  - [ ] T9.2: On click: confirmation dialog "Generate AI narrative for [Section Title]? This uses extraction grid data from X articles."
  - [ ] T9.3: Show progress in AsyncTaskPanel: "Generating narrative: [Section Title]"
  - [ ] T9.4: On completion: Plate editor loads the AI-drafted content, toast notification

- [ ] **T10: Implement auto-save for narrative** (AC: auto-save every 10 seconds)
  - [ ] T10.1: Create/use `apps/web/src/shared/hooks/use-auto-save.ts`:
    - Debounced save: watch Plate editor content changes, save via Apollo mutation after 10s of no changes
    - Status indicator in statusbar: "Saving..." -> "Saved" -> "Unsaved changes"
    - On error: show inline warning "Auto-save failed. Your changes are preserved locally."
  - [ ] T10.2: Integrate auto-save with SectionEditor

- [ ] **T11: Track AI vs human content** (AC: acceptance rate metrics)
  - [ ] T11.1: Display AI acceptance rate indicator in section header:
    - "AI content: 85% retained" or "AI content: 45% modified"
    - Visual: small text + colored indicator (green if >70%, orange if 30-70%, red if <30%)
  - [ ] T11.2: Option to "Show AI Diff": toggle view showing original AI text vs current (side-by-side or inline diff)

- [ ] **T12: Write frontend tests**
  - [ ] T12.1: Test Plate editor renders with correct plugins and toolbar
  - [ ] T12.2: Test inline reference renders as clickable badge with hover popover
  - [ ] T12.3: Test "Generate Narrative" button disabled states
  - [ ] T12.4: Test auto-save fires mutation after debounce period
  - [ ] T12.5: Test reference insertion flow

## Dev Notes

### Technology Stack & Versions

- **Rich Text Editor**: Plate (`@udecode/plate`) — Slate-based, plugin architecture
  - `@udecode/plate-common`: Core
  - `@udecode/plate-heading`: H2, H3
  - `@udecode/plate-list`: OL, UL
  - `@udecode/plate-table`: Tables
  - `@udecode/plate-basic-marks`: Bold, Italic
  - `@udecode/plate-paragraph`: Paragraphs
- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, BullMQ 5.69
- **Workers**: BullMQ for async narrative generation
- **LLM**: Multi-provider via `apps/workers/src/shared/llm/llm-abstraction.ts`

### Architecture Patterns

- **Plate editor JSON storage**: Narrative content stored as JSON (Plate/Slate document format) in `ThematicSection.narrativeContent` (PostgreSQL JSONB). This preserves formatting, references, and structure.
- **AI draft preservation**: `narrativeAiDraft` field stores the original AI output, never modified by user edits. This enables acceptance rate tracking and "Show AI Diff" feature.
- **Reference resolution**: Inline references stored both in the Plate document (as nodes) and in a separate `NarrativeReference` table for stable reference resolution and cross-module traceability.
- **Auto-save**: Uses debounced Apollo mutation (10s) per R3. The `use-auto-save.ts` shared hook is used across SOA narrative, CER sections, and other rich text editors.

### Plate Editor Configuration

Plate is configured with shadcn/ui components for the toolbar and editor chrome. Key plugins:

- `createParagraphPlugin()` — basic paragraph blocks
- `createHeadingPlugin()` — H2, H3 levels
- `createBoldPlugin()`, `createItalicPlugin()` — basic marks
- `createListPlugin()` — ordered and unordered lists
- `createTablePlugin()` — data tables within narrative
- Custom `createReferencePlugin()` — inline article references `[1]`, `[2]`

### Narrative Prompt Design

The AI narrative prompt should:

1. System context: "You are a medical device regulatory writer."
2. Section context: title, description, MDR alignment
3. Extraction grid data: structured summary of articles and findings
4. Quality assessment results: if available
5. Output format: Markdown with `[Author Year]` references
6. Tone: formal, scientific, regulatory-appropriate
7. Structure: follow MDR section expectations (varies by section type)

### BullMQ Queue Configuration

- Queue name: `soa:draft-narrative`
- Concurrency: 2 (narrative generation is a large LLM call — fewer concurrent)
- Job timeout: 5 minutes per section
- Retry: 1 attempt (narrative can be regenerated manually)

### UX Design Notes

- Plate editor is inline in the section editor — no modal, no context switch (line 909 of UX spec)
- Toolbar above editor area: Bold, Italic, Headings, Lists, Table, Reference Insert
- AI-drafted content includes inline references `[1]`, `[2]` with hover popover (lines 1092-1096 of UX spec)
- "Generate Narrative" button: Primary + Brain icon, first button in toolbar
- Auto-save status visible in statusbar: "Saving..." / "Saved" (R3)
- Section progress: sidebar shows section status updated when narrative is finalized

### Naming Conventions

- **BullMQ queue**: `soa:draft-narrative`
- **Worker file**: `draft-narrative.ts`
- **Use case**: `draft-narrative.ts`
- **GraphQL mutation**: `generateSectionNarrative`
- **Plate plugin**: `createReferencePlugin`
- **Prisma model**: `NarrativeReference`
- **Components**: `SectionEditor.tsx` (extend with Plate)
- **Hooks**: `use-auto-save.ts` (shared)

### Project Structure Notes

**Backend files to create/modify:**

- `apps/workers/src/processors/soa/draft-narrative.ts` (create)
- `apps/api/src/modules/soa/application/use-cases/draft-narrative.ts` (create)
- `apps/api/src/modules/soa/domain/entities/narrative-reference.ts` (create)
- `packages/prisma/schema/soa.prisma` (add NarrativeReference model)
- `apps/api/src/modules/soa/graphql/types.ts` (extend)
- `apps/api/src/modules/soa/graphql/queries.ts` (extend)
- `apps/api/src/modules/soa/graphql/mutations.ts` (extend)
- `apps/api/src/modules/soa/graphql/subscriptions.ts` (extend)
- `apps/workers/src/index.ts` (register processor)

**Frontend files to create/modify:**

- `apps/web/src/features/soa/components/SectionEditor.tsx` (extend with Plate editor)
- `apps/web/src/shared/hooks/use-auto-save.ts` (create — shared auto-save hook)
- `apps/web/src/features/soa/graphql/queries.ts` (extend)
- `apps/web/src/features/soa/graphql/mutations.ts` (extend)
- `apps/web/src/features/soa/graphql/subscriptions.ts` (extend)

**Plate editor custom plugin:**

- Custom reference plugin for inline article references (can be in `apps/web/src/features/soa/components/` or `apps/web/src/shared/components/` if reused in CER)

### References

- **Epics file**: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.8 (lines 919-936)
- **Architecture**: `_bmad-output/planning-artifacts/architecture.md` — Plate editor choice, rich text storage, worker patterns
- **UX Design Spec**: `_bmad-output/planning-artifacts/ux-design-specification.md` — Plate usage (lines 1088-1096), Journey 3 narrative flow (lines 893-897), editor inline (line 909), auto-save (line 80)
- **Functional Requirements**: FR28 (AI narrative drafting), FR29 (review/edit/approve), FR87 (AI narrative), FR90 (AI acceptance rate)
- **Non-Functional Requirements**: R3 (auto-save 10 seconds)

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

- [x] **Generate narrative from grid (FR28, FR87)** — `draftNarrative` mutation exists. DraftNarrativeUseCase enqueues job to 'soa:draft-narrative' queue with sectionId and soaAnalysisId.

- [!] **Plate rich text editor (FR29)** — Backend mutation exists but Plate integration NOT verified. Frontend SectionEditor NOT in File List.

- [!] **Inline references [1], [2]** — No evidence of NarrativeReference model in schema (Task T4.1). No queries for references (Task T4.3).

- [!] **Review, edit, approve narrative (FR29)** — updateSectionContent mutation handles edits. HOWEVER: no AI acceptance rate tracking found (FR90).

- [!] **Editor supports formatting** — Plate plugins NOT verified without frontend file.

- [x] **Auto-save 10s (R3)** — Backend supports updateSectionContent mutation. Frontend auto-save hook NOT verified.

- [!] **Track AI vs human edits (FR90)** — Schema has narrativeContent field but NO narrativeAiDraft field to preserve original. Task T3.1 specifies preserving AI draft — NOT implemented in schema or use case.

### Test Coverage

- draft-narrative.test.ts exists (3 tests): validates section exists, prevents locked SOA, enqueues task.
- manage-section.test.ts covers content updates.
- **Gap:** No tests for AI acceptance rate calculation. No tests for reference management. No worker tests.

### Code Quality Notes

**Issues found:**

1. **Worker NOT implemented:** BullMQ processor `apps/workers/src/processors/soa/draft-narrative.ts` not confirmed. Critical piece missing.
2. **No narrativeAiDraft field:** ThematicSection schema line 84 shows only narrativeContent. Task T3.1 requires separate narrativeAiDraft field to preserve original AI version for acceptance tracking (FR90). NOT found.
3. **No reference system:** NarrativeReference model NOT in soa.prisma despite Task T4.1-T4.4. Cannot track inline references [1], [2].
4. **No acceptance rate tracking:** Use case for computing diff between AI draft and final content NOT found (Task T3.2).
5. **Plate editor:** Frontend integration unverified. No custom reference plugin.

**Strengths:**

- Use case structure correct: validates prerequisites, creates AsyncTask, enqueues job.
- Lock and finalized section checks present.

### Security Notes

- RBAC enforced on draftNarrative mutation.
- Locked/finalized sections protected.

### Verdict

**CHANGES REQUESTED.** Story significantly incomplete. Infrastructure (mutation, use case, task) exists BUT:

1. **Worker NOT implemented** — no actual AI narrative generation
2. **No AI draft preservation** — cannot track acceptance rate (FR90 not met)
3. **No reference system** — inline references [1], [2] not implemented
4. **Plate editor unverified** — frontend integration missing
5. **Schema incomplete** — missing narrativeAiDraft field and NarrativeReference model

Current implementation is skeleton only (~20% complete).

**Required changes:**

1. Add `narrativeAiDraft` field to ThematicSection schema
2. Implement worker `apps/workers/src/processors/soa/draft-narrative.ts` with LLM integration
3. Add NarrativeReference model to schema per Task T4.1
4. Implement queries/mutations for reference management (Task T4.3-T4.4)
5. Implement AI acceptance rate tracking (Task T3.2)
6. Verify Plate editor integration with custom reference plugin
7. Update ManageSectionUseCase.updateContent() to preserve narrativeAiDraft
8. Add worker tests with mocked LLM
9. Add tests for acceptance rate computation

**Change Log:**

- 2026-02-16: Senior review completed. Changes requested. Worker missing (critical). Schema incomplete (narrativeAiDraft, NarrativeReference). FR90 not implemented. Frontend unverified.
- 2026-02-16: Code review fixes applied:
  - ✅ Added `narrativeAiDraft Json?` field to ThematicSection schema
  - ✅ Updated ThematicSectionObjectType to expose narrativeAiDraft
  - ✅ Implemented DraftNarrativeProcessor with progress tracking
  - ✅ Worker saves AI draft to narrativeAiDraft (preserves for acceptance tracking)
  - ⏳ Pending: Actual LLM integration (currently placeholder)
  - ⏳ Pending: NarrativeReference model for inline citations [1], [2]
  - ⏳ Pending: AI acceptance rate computation use case
  - ⏳ Pending: Frontend Plate editor integration
  - 📋 Next: Run Prisma migration: `pnpm --filter @cortex/prisma db:migrate:dev --name add-narrative-ai-draft`
