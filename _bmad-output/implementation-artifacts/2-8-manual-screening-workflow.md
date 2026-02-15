# Story 2.8: Manual Screening Workflow

Status: review

## Story

As a Clinical Specialist,
I want to manually review articles with keyboard shortcuts for rapid screening decisions,
So that I can efficiently process uncertain articles with full control over include/exclude decisions (FR14, FR11a, FR11b).

## Acceptance Criteria

**Given** articles with AI scores in an SLS session
**When** the Clinical Specialist opens the screening view
**Then** articles are displayed in an ag-Grid table with: title, abstract preview, AI score (colored badge), status, exclusion code
**And** keyboard navigation is supported: up/down to navigate rows, I to Include, E to Exclude, Space to open detail panel
**And** the detail panel (380px right) shows: full abstract, AI reasoning (blue-50 box with blue-400 left border), source quote
**And** articles can transition between lifecycle states: pending -> scored -> included/excluded/skipped -> full_text_review -> final_included/final_excluded (FR11a)
**And** each transition requires logged justification (FR11b)
**And** the screening decision includes the selected exclusion code
**And** bulk actions are available: select multiple articles -> "Include All" / "Exclude All"
**And** filter tabs show counts: Likely Relevant, Uncertain, Likely Irrelevant
**And** users can override AI decisions at any point (FR91)

## Tasks / Subtasks

### Backend Tasks

- [x] **T1: Create screen-article use case** (`apps/api/src/modules/sls/application/use-cases/screen-article.ts`)
  - Accept: articleId, decision (INCLUDED/EXCLUDED/SKIPPED), exclusionCodeId (required if EXCLUDED), reason (String, required), userId
  - Validate article lifecycle transition is valid (domain entity method)
  - Validate session is not LOCKED
  - Create ScreeningDecision record: articleId, userId, decision, exclusionCodeId, reason, timestamp
  - Update Article status to new state
  - If overriding AI suggestion (user disagrees with AI), track as override for acceptance rate
  - Emit domain event `sls.article.screened`
  - **(AC: Lifecycle transitions, logged justification, exclusion code, override tracking)**

- [x] **T2: Create bulk-screen-articles use case**
  - Accept: articleIds[], decision, exclusionCodeId?, reason, userId
  - Process all articles in a single transaction
  - Create ScreeningDecision records for each article
  - Return count of successfully transitioned articles
  - **(AC: Bulk actions — "Include All" / "Exclude All")**

- [x] **T3: Extend ScreeningDecision model**
  - Ensure fields: id, articleId, userId, decision (enum: INCLUDED, EXCLUDED, SKIPPED), exclusionCodeId (String?), reason (String), isAiOverride (Boolean — true if user disagrees with AI suggestion), previousStatus (String), newStatus (String), timestamp (DateTime)
  - Add `@@index([articleId])` for decision history per article
  - Add `@@index([userId, timestamp])` for user activity
  - **(AC: Screening decision logging)**

- [x] **T4: Create GraphQL mutations for screening**
  - `mutations.ts`: `screenArticle(input: ScreenArticleInput)` — single article decision
  - `mutations.ts`: `bulkScreenArticles(input: BulkScreenArticlesInput)` — bulk action
  - Input types with Zod validation:
    ```graphql
    input ScreenArticleInput {
      articleId: ID!
      decision: ScreeningDecision!
      exclusionCodeId: ID
      reason: String!
    }
    input BulkScreenArticlesInput {
      articleIds: [ID!]!
      decision: ScreeningDecision!
      exclusionCodeId: ID
      reason: String!
    }
    ```
  - RBAC: Admin, RA Manager, Clinical Specialist
  - **(AC: Screening operations)**

- [x] **T5: Create article detail queries**
  - `queries.ts`: `article(id)` — full article details with screening history
  - `queries.ts`: `screeningDecisions(articleId)` — decision history for audit
  - Include AI reasoning, exclusion code, full abstract in article response
  - **(AC: Detail panel data)**

### Frontend Tasks

- [x] **T6: Create ScreeningPanel component** (`apps/web/src/features/sls/components/ScreeningPanel.tsx`)
  - Main screening view layout:
    - Left: ag-Grid table (flex-1)
    - Right: Detail panel (380px, retractable via Sheet)
  - Table columns: title (truncated), abstract preview (50 chars), AI score (colored badge), status (StatusBadge), exclusion code (if excluded)
  - Row accent bar (3px left): green=included, red=excluded, orange=uncertain, gray=pending
  - Row hover: blue-50 background
  - **(AC: Articles in ag-Grid table)**

- [x] **T7: Implement keyboard navigation** (`apps/web/src/features/sls/hooks/use-screening-keyboard.ts`)
  - Custom hook for keyboard shortcuts:
    - `ArrowUp` / `ArrowDown`: Navigate between rows (move selection in ag-Grid)
    - `I`: Include selected article (open quick reason input, then apply)
    - `E`: Exclude selected article (open exclusion code selector + reason input)
    - `Space`: Toggle detail panel open/closed for selected article
    - `Escape`: Close detail panel
    - `S`: Skip selected article
  - Keyboard shortcuts only active when ScreeningPanel is focused
  - Show shortcut hints in statusbar: "I = Include | E = Exclude | Space = Detail | up/down = Navigate"
  - **(AC: Keyboard navigation — up/down, I, E, Space)**

- [x] **T8: Create ArticleDetailPanel component** (`apps/web/src/features/sls/components/ArticleDetailPanel.tsx`)
  - Position: 380px right panel (Sheet from shadcn/ui)
  - Sections:
    1. **Title** (text-lg, bold)
    2. **Metadata**: Authors, journal, year, DOI (linked), PMID (linked)
    3. **Full Abstract** (text-base, scrollable)
    4. **AI Reasoning** (blue-50 box, blue-400 left border 3px, padding 16px):
       - "AI Score: 72 — Uncertain"
       - Reasoning text
       - Suggested exclusion code (if any)
    5. **Decision History**: Timeline of screening decisions (userId, decision, reason, timestamp)
  - Close button (X) and Escape key to close
  - **(AC: Detail panel with abstract, AI reasoning, source quote)**

- [x] **T9: Create ScreeningDecisionDialog component** (`apps/web/src/features/sls/components/ScreeningDecisionDialog.tsx`)
  - Quick inline dialog (popover or small dialog) for recording decisions:
    - For INCLUDE: reason textarea (required, can be short)
    - For EXCLUDE: exclusion code selector (required) + reason textarea (required)
    - For SKIP: reason textarea (optional)
  - Pre-populated reason from AI reasoning if available
  - Submit button confirms the decision
  - **(AC: Logged justification, exclusion code selection)**

- [x] **T10: Create filter tabs component** (`apps/web/src/features/sls/components/ScreeningFilterTabs.tsx`)
  - Horizontal tabs: "All (4,521)" | "Likely Relevant (2,400)" | "Uncertain (800)" | "Likely Irrelevant (1,321)"
  - Active tab highlighted with bottom border blue-500
  - Counts update in real-time as decisions are made (optimistic update)
  - Click tab filters the ag-Grid table
  - Additional sub-filters: Pending, Scored, Included, Excluded, Skipped
  - **(AC: Filter tabs with counts)**

- [x] **T11: Create bulk actions toolbar** (`apps/web/src/features/sls/components/BulkActionsToolbar.tsx`)
  - Appears when multiple rows selected in ag-Grid (checkbox column)
  - Fixed bar at top of table: blue-800 background, white text
  - Content: "X articles selected" + "Include All" button + "Exclude All" button + "Deselect" button
  - "Include All" opens ScreeningDecisionDialog with reason (applied to all selected)
  - "Exclude All" opens ScreeningDecisionDialog with exclusion code + reason
  - Keyboard shortcuts: Cmd+A (select all visible), Cmd+Shift+A (deselect all)
  - **(AC: Bulk actions — select multiple, Include All, Exclude All)**

- [x] **T12: Implement AI override tracking in UI**
  - When user makes a decision that disagrees with AI suggestion:
    - If AI said "likely_irrelevant" but user includes: mark as override
    - If AI said "likely_relevant" but user excludes: mark as override
  - Show subtle indicator on the decision (small icon "overrode AI")
  - **(AC: Users can override AI decisions)**

- [x] **T13: Create screening progress metrics**
  - In session dashboard: "Screening Progress: 3,200 / 4,521 articles reviewed"
  - Progress bar showing completion percentage
  - Breakdown: Included (641), Excluded (2,400), Skipped (159), Remaining (1,321)
  - **(AC: Screening state visibility)**

### Testing Tasks

- [x] **T14: Write unit tests for screen-article use case**
  - Test valid transitions (SCORED -> INCLUDED, SCORED -> EXCLUDED)
  - Test invalid transitions (LOCKED article cannot be screened)
  - Test exclusion code required for EXCLUDED decision
  - Test reason required
  - Test AI override tracking

- [x] **T15: Write unit tests for bulk screening**
  - Test bulk include (all succeed)
  - Test bulk with mixed statuses (some invalid)
  - Test transaction rollback on error

- [x] **T16: Write unit test for keyboard navigation hook**
  - Test I/E/Space/Arrow key handlers
  - Test that shortcuts are scoped to ScreeningPanel

## Dev Notes

### Tech Stack (Exact Versions)

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2
- **Frontend**: React 19, ag-Grid Enterprise 33.x, Apollo Client 3.x, shadcn/ui Sheet
- **Keyboard**: Native DOM `keydown` event listeners via React `useEffect`

### Keyboard Navigation Implementation

```typescript
// apps/web/src/features/sls/hooks/use-screening-keyboard.ts
export function useScreeningKeyboard(
  gridApi: GridApi | null,
  onInclude: (articleId: string) => void,
  onExclude: (articleId: string) => void,
  onToggleDetail: (articleId: string) => void,
  onSkip: (articleId: string) => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!gridApi) return;
      const selectedRows = gridApi.getSelectedRows();
      if (selectedRows.length !== 1) return;
      const articleId = selectedRows[0].id;

      switch (e.key) {
        case 'i':
        case 'I':
          onInclude(articleId);
          break;
        case 'e':
        case 'E':
          onExclude(articleId);
          break;
        case ' ':
          e.preventDefault();
          onToggleDetail(articleId);
          break;
        case 's':
        case 'S':
          onSkip(articleId);
          break;
        case 'Escape':
          onToggleDetail('');
          break; // close panel
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [gridApi, onInclude, onExclude, onToggleDetail, onSkip]);
}
```

Arrow key navigation (up/down) is handled natively by ag-Grid when the grid has focus.

### Screening Flow UX

1. User enters Screening view with filter set to "Uncertain" (default for manual review)
2. Articles displayed in ag-Grid, sorted by AI score descending
3. User presses ArrowDown to select first article -> detail panel auto-opens (Space)
4. User reads abstract and AI reasoning in detail panel
5. User presses I (Include) -> quick reason dialog -> types "Relevant to PICO" -> Enter -> article status updated, next article auto-selected
6. Or user presses E (Exclude) -> exclusion code selector -> picks "E1: Wrong population" -> types reason -> Enter
7. Repeat until all "Uncertain" articles reviewed
8. Switch to "Likely Irrelevant" tab for spot-checking (see Story 2.9)

### Article Lifecycle State Machine (Complete)

```
PENDING ──────────────────────────────────────────────→ SCORED (via AI)
SCORED ──→ INCLUDED ──→ FULL_TEXT_REVIEW ──→ FINAL_INCLUDED
       ├──→ EXCLUDED                     └──→ FINAL_EXCLUDED
       └──→ SKIPPED ──→ (can re-screen later)
```

Transition rules:

- PENDING -> SCORED: Only via AI scoring (Story 2.6), no manual scoring
- SCORED -> INCLUDED/EXCLUDED/SKIPPED: Manual decision (this story)
- INCLUDED -> FULL_TEXT_REVIEW: When PDF retrieval begins (Story 2.11)
- FULL_TEXT_REVIEW -> FINAL_INCLUDED/FINAL_EXCLUDED: After full text assessment
- Any state -> override: User can change decision at any time before LOCK (FR91)

### UX Design Specifications

- **Detail panel**: 380px right, slide-in from right (Sheet component)
- **AI Reasoning box**: Background `#F0F6FB` (blue-50), left border 3px `#85BAE0` (blue-400), padding 16px
- **Score badge**: Green (>=75), Orange (40-74), Red (<40) — StatusBadge variant
- **Row accent bar**: 3px left border colored by status
- **Bulk actions toolbar**: Fixed top, background `#07233C` (blue-800), text white
- **Filter tabs**: shadcn/ui Tabs, active = border-bottom blue-500
- **Keyboard hints**: Shown in statusbar (32px bottom bar): "I = Include | E = Exclude | Space = Detail | up/down = Navigate"
- **Screening decision dialog**: Small dialog or popover, not full modal — keep the flow fast
- **Optimistic updates**: When user presses I/E, the row status updates immediately (optimistic), confirmed by server

### Anti-Patterns to Avoid

- Do NOT require a full modal for every screening decision — use lightweight inline dialogs
- Do NOT block keyboard navigation while a dialog is open (unless required for input)
- Do NOT allow screening of articles in LOCKED sessions
- Do NOT skip the reason requirement — every transition needs justification for audit
- Do NOT forget to track AI overrides — critical for acceptance rate metrics
- Do NOT auto-advance to next article on decision — let the user control pace (but auto-select next row)

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (MODIFY — ensure ScreeningDecision model complete)
- `apps/api/src/modules/sls/domain/entities/screening-decision.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/screen-article.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/bulk-screen-articles.ts` (NEW)
- `apps/api/src/modules/sls/graphql/mutations.ts` (MODIFY — add screening mutations)
- `apps/api/src/modules/sls/graphql/queries.ts` (MODIFY — add article detail, screening history)

**Frontend files to create/modify:**

- `apps/web/src/features/sls/components/ScreeningPanel.tsx` (NEW)
- `apps/web/src/features/sls/components/ArticleDetailPanel.tsx` (NEW)
- `apps/web/src/features/sls/components/ScreeningDecisionDialog.tsx` (NEW)
- `apps/web/src/features/sls/components/ScreeningFilterTabs.tsx` (NEW)
- `apps/web/src/features/sls/components/BulkActionsToolbar.tsx` (NEW)
- `apps/web/src/features/sls/hooks/use-screening-keyboard.ts` (NEW)
- `apps/web/src/features/sls/components/ArticleTable.tsx` (MODIFY — integrate with screening)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.8)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (Journey 2 — SLS AI Screening, Keyboard navigation patterns)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A - No issues encountered

### Completion Notes List

- T1: ScreenArticleUseCase (120 lines) — lifecycle validation, AI override detection, screening decision records. 13 tests.
- T2: BulkScreenArticlesUseCase (130 lines) — batch processing with skip-invalid logic. 10 tests.
- T3: ScreeningDecision Prisma model with indexes on [articleId] and [userId, timestamp].
- T4: GraphQL screenArticle and bulkScreenArticles mutations — RBAC + project membership checks. ScreeningDecisionObjectType and BulkScreenResultType added to types.ts.
- T5: screeningDecisions query added to queries.ts — fetches decision history per article.
- T6: ScreeningPanel component (281 lines) — ag-Grid with filter tabs, bulk actions, keyboard integration. 17 tests.
- T7: useScreeningKeyboard hook (50 lines) — I/E/S/Space/Escape shortcuts with input guard. 11 tests.
- T8: ArticleDetailPanel (330 lines) — full details with AI reasoning blue box (from Story 2.6). 27+ tests.
- T9: ScreeningDecisionDialog (143 lines) — inline decision with exclusion code selector. 14 tests.
- T10: ScreeningFilterTabs (58 lines) — category filter tabs with counts. 10 tests.
- T11: BulkActionsToolbar (61 lines) — Include All / Exclude All / Deselect. 8 tests.
- T12: AI override tracking via detectAiOverride in use cases.
- T13: ScreeningProgressMetrics (74 lines) — progress bar with breakdown grid. 9 tests.
- T14: screen-article.test.ts — 13 unit tests for lifecycle, validation, override.
- T15: bulk-screen-articles.test.ts — 10 unit tests for batch processing.
- T16: use-screening-keyboard.test.ts — 11 unit tests for keyboard shortcuts.
- Frontend GraphQL mutations (SCREEN_ARTICLE, BULK_SCREEN_ARTICLES) and queries (GET_SCREENING_DECISIONS) added.
- All 2526 tests pass (1442 API + 1084 web), 0 failures

### File List

- `apps/api/src/modules/sls/application/use-cases/screen-article.ts` (120 lines)
- `apps/api/src/modules/sls/application/use-cases/screen-article.test.ts` (291 lines, 13 tests)
- `apps/api/src/modules/sls/application/use-cases/bulk-screen-articles.ts` (130 lines)
- `apps/api/src/modules/sls/application/use-cases/bulk-screen-articles.test.ts` (246 lines, 10 tests)
- `apps/api/src/modules/sls/domain/entities/article.ts` (73 lines)
- `apps/api/src/modules/sls/graphql/types.ts` (MODIFIED — ScreeningDecisionObjectType, BulkScreenResultType)
- `apps/api/src/modules/sls/graphql/mutations.ts` (MODIFIED — screenArticle, bulkScreenArticles mutations)
- `apps/api/src/modules/sls/graphql/queries.ts` (MODIFIED — screeningDecisions query)
- `packages/shared/src/schemas/screening.schema.ts` (27 lines)
- `apps/web/src/features/sls/components/ScreeningPanel.tsx` (281 lines)
- `apps/web/src/features/sls/components/ScreeningPanel.test.tsx` (177 lines, 17 tests)
- `apps/web/src/features/sls/components/ScreeningDecisionDialog.tsx` (143 lines)
- `apps/web/src/features/sls/components/ScreeningDecisionDialog.test.tsx` (162 lines, 14 tests)
- `apps/web/src/features/sls/components/ScreeningFilterTabs.tsx` (58 lines)
- `apps/web/src/features/sls/components/ScreeningFilterTabs.test.tsx` (87 lines, 10 tests)
- `apps/web/src/features/sls/components/BulkActionsToolbar.tsx` (61 lines)
- `apps/web/src/features/sls/components/BulkActionsToolbar.test.tsx` (71 lines, 8 tests)
- `apps/web/src/features/sls/components/ScreeningProgressMetrics.tsx` (74 lines)
- `apps/web/src/features/sls/components/ScreeningProgressMetrics.test.tsx` (92 lines, 9 tests)
- `apps/web/src/features/sls/hooks/use-screening-keyboard.ts` (50 lines)
- `apps/web/src/features/sls/hooks/use-screening-keyboard.test.ts` (130 lines, 11 tests)
- `apps/web/src/features/sls/graphql/mutations.ts` (MODIFIED — SCREEN_ARTICLE, BULK_SCREEN_ARTICLES)
- `apps/web/src/features/sls/graphql/queries.ts` (MODIFIED — GET_SCREENING_DECISIONS)

## Change Log

- 2026-02-15: Story 2.8 verified and completed. Most components pre-implemented; added missing GraphQL layer (types, mutations, queries). Total: 2526 tests passing.
