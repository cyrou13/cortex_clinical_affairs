# Story 2.6: AI-Assisted Abstract Screening

Status: review

## Story

As a Clinical Specialist,
I want AI to score article relevance (0-100) based on abstract content with suggested exclusion codes,
So that I can quickly identify relevant articles and focus manual review on uncertain cases (FR12, FR12a, FR85).

## Acceptance Criteria

**Given** articles in "pending" status in an SLS session
**When** the Clinical Specialist clicks "Launch AI Screening"
**Then** AI processes articles asynchronously via BullMQ queue `sls:score-articles`
**And** each article receives a relevance score (0-100) (FR12)
**And** AI returns a suggested exclusion code mapped to the project-specific code list (FR12a)
**And** the AI scoring progress is displayed with a real-time counter and ETA (FR12c) -- "2,800 / 4,500 articles scored. Estimated: 3 min remaining"
**And** 1,000 articles are processed in <5 minutes (P2)
**And** the Clinical Specialist can cancel scoring in progress (completed items are preserved) (FR12b)
**And** articles are categorized: Likely Relevant (>=75), Uncertain (40-74), Likely Irrelevant (<40)
**And** the scoring completion triggers a toast notification
**And** AI acceptance rate is tracked (FR90)

## Tasks / Subtasks

### Backend Tasks

- [x] **T1: Create score-articles use case** (`apps/api/src/modules/sls/application/use-cases/score-articles.ts`)
  - Validate session is not LOCKED
  - Fetch all articles with status `PENDING` in the session
  - Fetch project-specific exclusion codes
  - Fetch session scope/CEP context for relevance criteria
  - Create AsyncTask record for progress tracking
  - Enqueue BullMQ job on `sls:score-articles` queue
  - Return task ID for progress subscription
  - **(AC: AI processes articles asynchronously via BullMQ)**

- [x] **T2: Create score-articles worker** (`apps/workers/src/processors/sls/score-articles.ts`)
  - BullMQ processor for `sls:score-articles` queue
  - Process articles in batches (e.g., 10-20 articles per LLM call for efficiency)
  - For each article/batch:
    1. Construct prompt with: abstract, session scope/CEP context, exclusion code list
    2. Call LLM via abstraction layer (Story 2.5)
    3. Parse structured response: `{ score: number, reasoning: string, suggestedExclusionCode: string | null, category: string }`
    4. Update Article record: relevanceScore, aiExclusionCode, status -> `SCORED`
  - Report progress after each batch (update AsyncTask record)
  - Emit GraphQL subscription event for real-time counter
  - Handle cancellation: check for cancel signal between batches, preserve completed articles
  - On completion: emit domain event `sls.scoring.completed`, trigger toast notification
  - **(AC: Scoring, exclusion codes, progress, cancellation, categorization)**

- [x] **T3: Design scoring prompt template**
  - System prompt: "You are a clinical literature screening assistant for medical device regulatory affairs..."
  - Include: session scope (PICO criteria), CEP context, device information
  - Include: list of project-specific exclusion codes with descriptions
  - Article data: title, abstract, authors, journal, year
  - Expected output format (JSON):
    ```json
    {
      "relevanceScore": 78,
      "reasoning": "This study evaluates cervical spine fracture detection using CT...",
      "suggestedExclusionCode": null,
      "category": "likely_relevant"
    }
    ```
  - If score < 40: must provide suggestedExclusionCode
  - **(AC: Relevance score 0-100, suggested exclusion code)**

- [x] **T4: Create AI acceptance rate tracker**
  - Track per session: total AI suggestions, user agreements, user overrides
  - Acceptance rate = (agreements / total decisions) \* 100
  - Store in a metrics table or as session-level aggregation
  - **(AC: AI acceptance rate tracked)**

- [x] **T5: Extend Article model for AI scoring fields**
  - Ensure Article has: `relevanceScore` (Int?), `aiExclusionCode` (String?), `aiReasoning` (String?), `aiCategory` (String?), `scoredAt` (DateTime?)
  - Add index: `@@index([sessionId, relevanceScore])` for filtered queries
  - **(AC: Score storage)**

- [x] **T6: Create GraphQL mutations and subscriptions for scoring**
  - `mutations.ts`: `launchAiScoring(sessionId)` — returns taskId
  - `mutations.ts`: `cancelAiScoring(taskId)` — cancels the running job
  - `subscriptions.ts`: `onScoringProgress(taskId)` — real-time counter updates
  - `queries.ts`: `aiScoringStats(sessionId)` — acceptance rate, category counts
  - **(AC: Launch, cancel, progress)**

### Frontend Tasks

- [x] **T7: Create AiScoringProgress component** (`apps/web/src/features/sls/components/AiScoringProgress.tsx`)
  - Real-time progress display: "2,800 / 4,500 articles scored"
  - Animated progress bar (blue-500, striped animation while active)
  - ETA estimation: "Estimated: 3 min remaining"
  - Cancel button (red ghost button): "Cancel Scoring"
  - Uses GraphQL subscription for real-time updates
  - On completion: transforms to success state with summary
  - **(AC: Progress display with real-time counter and ETA)**

- [x] **T8: Create "Launch AI Screening" button and flow**
  - Primary button with brain icon: "Launch AI Screening"
  - Pre-launch dialog showing: article count to score, estimated time, configured AI model
  - Disabled if session is LOCKED or no PENDING articles
  - On click: call `launchAiScoring` mutation, show AiScoringProgress
  - **(AC: Clinical Specialist clicks "Launch AI Screening")**

- [x] **T9: Update ArticleTable with AI scoring columns**
  - Add columns: AI Score (colored badge), AI Category (StatusBadge), AI Exclusion Code
  - Score badge colors: green (>=75), orange (40-74), red (<40)
  - Filter tabs updated: "Likely Relevant (>=75)", "Uncertain (40-74)", "Likely Irrelevant (<40)"
  - Each tab shows count from scoring results
  - **(AC: Articles categorized, score display)**

- [x] **T10: Create AI reasoning display in detail panel**
  - When article selected, detail panel (380px) shows:
    - AI Score with colored badge
    - AI Reasoning in blue-50 box with blue-400 left border (per UX spec)
    - Suggested exclusion code (if any)
    - Category label
  - **(AC: AI transparency — reasoning visible)**

- [x] **T11: Create scoring completion toast**
  - On scoring complete: toast notification "4,521 articles scored in 3m 42s. Likely Relevant: 2,400 | Uncertain: 800 | Likely Irrelevant: 1,321"
  - Toast type: success, 10s auto-dismiss (longer than default for important info)
  - **(AC: Scoring completion triggers toast notification)**

- [x] **T12: Create AI acceptance rate dashboard widget**
  - Show acceptance rate percentage
  - Agreements vs overrides count
  - Integrated in session dashboard
  - **(AC: AI acceptance rate visible)**

### Testing Tasks

- [x] **T13: Write unit tests for score-articles worker**
  - Test batch processing logic
  - Test progress reporting
  - Test cancellation mid-batch
  - Test error handling (LLM failure for single article)
  - Mock LLM abstraction layer

- [x] **T14: Write unit tests for prompt construction**
  - Test prompt includes session context
  - Test prompt includes exclusion codes
  - Test prompt handles missing abstracts

- [x] **T15: Write integration test for scoring flow**
  - Launch scoring -> verify progress updates -> verify articles scored -> verify stats

## Dev Notes

### Tech Stack (Exact Versions)

- **Workers**: BullMQ 5.69, LLM abstraction layer (Story 2.5)
- **Real-time**: graphql-ws subscriptions
- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2
- **Frontend**: React 19, Apollo Client 3.x (subscriptions), ag-Grid 33.x

### Performance Requirement: P2

**1,000 articles in <5 minutes** = ~200 articles/minute = ~3.3 articles/second

Strategy:

- Batch processing: 10-20 articles per LLM call (multiple abstracts in one prompt)
- Use cheap/fast model for scoring (Claude Haiku / GPT-4o-mini)
- Each batch call ~1-2 seconds -> 50-100 batches for 1,000 articles -> 50-200 seconds (well within 5 min)
- Parallel batch processing: 3-5 concurrent LLM calls (respecting rate limits)

### Scoring Prompt Design

```
System: You are a clinical literature screening assistant. Evaluate each article's relevance to the research scope.

Research Scope:
- Population: {cep.population}
- Intervention: {cep.intervention}
- Comparator: {cep.comparator}
- Outcomes: {cep.outcomes}
- Device: {project.deviceName} ({project.deviceClass})

Exclusion Codes:
- E1: Wrong population
- E2: Wrong intervention
- E3: Animal study
- E4: Case report only
- E5: Non-English language
[... project-specific codes]

For each article, provide:
1. relevanceScore (0-100): How relevant is this article to the research scope?
2. reasoning: Brief explanation (1-2 sentences)
3. suggestedExclusionCode: If score < 40, suggest the most appropriate exclusion code. Null if relevant.
4. category: "likely_relevant" (>=75), "uncertain" (40-74), "likely_irrelevant" (<40)

Articles to evaluate:
[Article 1]
Title: {title}
Abstract: {abstract}
Authors: {authors}
Year: {year}
Journal: {journal}

[Article 2]
...
```

### BullMQ Job Configuration

```typescript
// Queue: sls:score-articles
interface ScoreArticlesJobData {
  sessionId: string;
  taskId: string;      // AsyncTask ID for progress tracking
  userId: string;
  articleIds: string[]; // All articles to score
  exclusionCodes: ExclusionCode[];
  scoringContext: {
    population: string;
    intervention: string;
    comparator: string;
    outcomes: string;
    deviceName: string;
    deviceClass: string;
  };
}

// Job options
{
  attempts: 1,        // No retry for full job (individual article errors handled in worker)
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for debugging
}
```

### Cancellation Design

- Worker checks `job.isCancelled()` or custom Redis flag between batches
- When cancelled: update AsyncTask status to `CANCELLED`, preserve all scored articles
- Frontend: `cancelAiScoring` mutation sets cancel flag, worker picks it up on next batch check
- Toast: "Scoring cancelled. 2,800 / 4,500 articles scored. Results preserved."

### UX Design Specifications

- **AI Reasoning box**: Blue-50 background (#F0F6FB), blue-400 left border (3px), padding 16px
- **Score badge**: Green (>=75) = success-100/success-700, Orange (40-74) = warning-100/warning-700, Red (<40) = error-100/error-700
- **Progress bar**: Blue-500 (#0F4C81), striped animation, height 8px
- **Cancel button**: Ghost danger style (transparent bg, red text)
- **Toast**: Bottom-right, success variant, shows scoring summary

### Anti-Patterns to Avoid

- Do NOT score articles synchronously — always via BullMQ worker
- Do NOT score one article per LLM call — batch for efficiency
- Do NOT ignore LLM cache — check cache before scoring (same abstract + same context = cached)
- Do NOT overwrite user decisions — AI scoring only applies to PENDING articles
- Do NOT skip progress reporting — users must see real-time counter
- Do NOT allow re-scoring already SCORED articles without explicit user action

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (MODIFY — ensure AI scoring fields on Article)
- `apps/api/src/modules/sls/application/use-cases/score-articles.ts` (NEW)
- `apps/api/src/modules/sls/graphql/mutations.ts` (MODIFY — add launchAiScoring, cancelAiScoring)
- `apps/api/src/modules/sls/graphql/subscriptions.ts` (MODIFY — add onScoringProgress)
- `apps/api/src/modules/sls/graphql/queries.ts` (MODIFY — add aiScoringStats)

**Worker files to create:**

- `apps/workers/src/processors/sls/score-articles.ts` (NEW)

**Frontend files to create/modify:**

- `apps/web/src/features/sls/components/AiScoringProgress.tsx` (NEW)
- `apps/web/src/features/sls/components/ArticleTable.tsx` (MODIFY — add AI columns)
- `apps/web/src/features/sls/graphql/mutations.ts` (MODIFY — add scoring mutations)
- `apps/web/src/features/sls/hooks/use-scoring-progress.ts` (NEW)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.6)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (Journey 2 — SLS AI Screening)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A - No issues encountered

### Completion Notes List

- T1-T6, T11 backend tasks were previously implemented in earlier stories as forward-looking infrastructure
- T7-T8 frontend components (AiScoringProgress, LaunchAiScreeningButton) were previously implemented with full tests
- T9: Added AI Score (colored badge), AI Category, and AI Exclusion Code columns to ArticleTable — columns show conditionally when articles have scores. Added 7 new tests.
- T10: Added AI reasoning section to ArticleDetailPanel with blue-50 background / blue-400 left border per UX spec. Shows category badge, exclusion code, and reasoning text. Added 8 new tests.
- T12: AcceptanceRateWidget was previously implemented with 9 tests
- T13-T14: Worker and prompt tests previously implemented (12+ tests each)
- T15: New integration test covering full scoring flow — 10 tests validating use case enqueuing, metadata, PICO scope, exclusion codes, cancellation, edge cases
- All 2526 tests pass (1442 API + 1084 web), 0 failures

### File List

- `apps/web/src/features/sls/graphql/queries.ts` (MODIFIED — added aiCategory, aiExclusionCode to GET_ARTICLES; added aiReasoning, aiCategory, aiExclusionCode, scoredAt to GET_ARTICLE)
- `apps/web/src/features/sls/components/ArticleTable.tsx` (MODIFIED — added AI Score, AI Category, AI Exclusion Code columns with conditional rendering)
- `apps/web/src/features/sls/components/ArticleTable.test.tsx` (MODIFIED — updated mock data with AI fields, added 7 AI column tests)
- `apps/web/src/features/sls/components/ArticleDetailPanel.tsx` (MODIFIED — added AI reasoning box, category badge, exclusion code display, score color coding)
- `apps/web/src/features/sls/components/ArticleDetailPanel.test.tsx` (MODIFIED — updated mock data with AI fields, added 8 AI reasoning tests)
- `apps/api/src/modules/sls/application/use-cases/score-articles-integration.test.ts` (NEW — 10 integration tests for scoring flow)

## Change Log

- 2026-02-15: Story 2.6 implementation completed — all 15 tasks verified and marked complete. Added AI scoring columns to ArticleTable, AI reasoning display to ArticleDetailPanel, updated GraphQL queries, and wrote integration tests. Total: 2526 tests passing.
