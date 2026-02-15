# Story 3.11: SOA Locking

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to lock the completed SOA analysis as immutable,
So that downstream modules (Validation, CER) build on finalized evidence.

## Acceptance Criteria

**Given** all SOA sections are finalized and all required extractions are complete
**When** the Clinical Specialist clicks "Lock SOA"
**Then** a LockConfirmation dialog shows: section count, article count, claim count
**And** upon confirmation, the SOA status changes to "locked" (immutable) (FR34)
**And** the lock triggers domain event `soa.analysis.locked` via RabbitMQ
**And** the pipeline progress bar updates: SOA node -> "completed"
**And** downstream modules (Validation, CER) are unblocked
**And** if this is the Clinical SOA, Section 6 data unlocks Device SOA creation

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create SOA locking use case** (AC: lock with validation and immutability)
  - [ ] T1.1: Create `apps/api/src/modules/soa/application/use-cases/lock-soa.ts`:
    - **Pre-lock validation checks:**
      1. SOA status is not already LOCKED
      2. All thematic sections have status FINALIZED
      3. All extraction grids have at least some reviewed articles
      4. Traceability: all claims have at least one article link (100% traceability)
      5. If Clinical SOA: Section 6 has at least one similar device registered
    - **On validation failure:** Return detailed error listing all blocking issues
    - **On success:**
      1. Set SOA status to LOCKED
      2. Set `lockedAt` timestamp and `lockedById`
      3. Emit domain event `soa.analysis.locked` via RabbitMQ event bus
      4. If Clinical SOA: emit `soa.similar-devices.registered` to unblock Device SOA
  - [ ] T1.2: Domain event payload for `soa.analysis.locked`:
    ```typescript
    {
      eventType: 'soa.analysis.locked',
      aggregateId: soaAnalysisId,
      aggregateType: 'SoaAnalysis',
      data: {
        projectId,
        soaType,
        sectionCount,
        articleCount,
        claimCount,
        traceabilityPercentage: 100,
      },
      metadata: { userId, timestamp, correlationId, version: 1 }
    }
    ```

- [ ] **T2: Implement immutability enforcement** (AC: locked SOA cannot be modified)
  - [ ] T2.1: Add lock check to all SOA write operations:
    - `configure-grid.ts`: reject if SOA locked
    - `update-cell.ts`: reject if SOA locked
    - `validate-extraction.ts`: reject if SOA locked
    - `create-section.ts`: reject if SOA locked
    - `draft-narrative.ts`: reject if SOA locked
    - `manage-claims.ts`: reject if SOA locked
    - `manage-similar-devices.ts`: reject if SOA locked
    - `manage-benchmarks.ts`: reject if SOA locked
    - `assess-quality.ts`: reject if SOA locked
  - [ ] T2.2: Create helper function `assertSoaNotLocked(soaAnalysisId)` in shared utilities:
    - Loads SOA, checks status, throws `LockConflictError` if locked
    - Called at the beginning of all SOA write use cases
  - [ ] T2.3: Add `LockConflictError` handling in GraphQL error handler (return user-friendly message)

- [ ] **T3: Create pre-lock validation query** (AC: LockConfirmation shows detailed recap)
  - [ ] T3.1: Add query `soaLockReadiness(soaAnalysisId)`:
    - Returns: `{ canLock: boolean, blockers: string[], summary: { sectionCount, finalized, articleCount, reviewedArticles, claimCount, linkedClaims, traceabilityPercentage, similarDeviceCount } }`
    - Blockers list human-readable issues: "Section Clinical_3 is not finalized", "5 claims have no article links", "120 articles not reviewed"
  - [ ] T3.2: Summary data used to populate the LockConfirmation dialog

- [ ] **T4: Add GraphQL mutation for locking** (AC: lock mutation)
  - [ ] T4.1: Add mutation `lockSoaAnalysis(soaAnalysisId)`:
    - Calls `lock-soa.ts` use case
    - Returns locked SOA analysis with timestamp
    - On failure: returns validation errors with blocker list
  - [ ] T4.2: Add query `soaLockReadiness(soaAnalysisId)` to `queries.ts`

- [ ] **T5: Handle downstream pipeline updates** (AC: pipeline progress, downstream unblocking)
  - [ ] T5.1: Create event handler for `soa.analysis.locked`:
    - Update project pipeline status: SOA node -> COMPLETED
    - Check if Validation and CER modules can be unblocked (all required upstream locked)
  - [ ] T5.2: For Clinical SOA lock: check if Device SOA can now be created without warning
  - [ ] T5.3: Event handler in `apps/api/src/shared/events/` or `apps/api/src/modules/project/`

- [ ] **T6: Write backend tests**
  - [ ] T6.1: Test lock succeeds when all validations pass
  - [ ] T6.2: Test lock fails when sections not all finalized — returns correct blockers
  - [ ] T6.3: Test lock fails when traceability < 100%
  - [ ] T6.4: Test lock fails when already locked (LockConflictError)
  - [ ] T6.5: Test immutability: all write operations rejected on locked SOA
  - [ ] T6.6: Test domain event emission with correct payload
  - [ ] T6.7: Test pre-lock readiness query returns accurate summary
  - [ ] T6.8: Test Clinical SOA Section 6 -> Device SOA unblocking

### Frontend Tasks

- [ ] **T7: Implement "Lock SOA" button** (AC: visible when conditions met)
  - [ ] T7.1: Add "Lock SOA" button to SOA dashboard:
    - Success style (green) + Lock icon (Lucide `Lock`)
    - Visible only when all sections are finalized (use `soaLockReadiness` query)
    - Disabled with tooltip if blockers exist: "Cannot lock: 2 sections not finalized"
  - [ ] T7.2: Pre-lock check: fetch `soaLockReadiness` on button hover/click to get current status

- [ ] **T8: Create LockConfirmation dialog for SOA** (AC: dialog with recap)
  - [ ] T8.1: Use shared `LockConfirmation` component (`apps/web/src/shared/components/LockConfirmation.tsx`):
    - Dialog centred, backdrop blur (distinctif des dialogs normaux)
    - Lock icon (40px) in blue-800
    - Title: "Lock SOA Analysis"
    - Message: "This action is irreversible. Once locked, no modifications can be made to this SOA analysis."
    - Recap metrics from `soaLockReadiness`:
      - "Sections: 6/6 finalized"
      - "Articles: 187 reviewed"
      - "Claims: 45 (100% traced)"
      - "Similar Devices: 3 registered"
    - Checkbox: "I understand this action is irreversible"
    - Buttons: "Cancel" (secondary) + "Lock SOA" (success, disabled until checkbox checked)
  - [ ] T8.2: States: Default -> Checkbox checked -> Processing (spinner) -> Success (check animation)
  - [ ] T8.3: On success: toast notification "SOA Analysis locked. 6 sections finalized. 45 claims traced."
  - [ ] T8.4: Pipeline progress bar auto-updates: SOA node -> "completed" with check icon

- [ ] **T9: Show blocker list when lock not possible** (AC: inform user of blocking issues)
  - [ ] T9.1: If `soaLockReadiness.canLock === false`:
    - Show inline alert in SOA dashboard: "SOA cannot be locked. Resolve the following issues:"
    - Bulleted list of blockers
    - Each blocker is clickable: navigates to the relevant section/claim/article
  - [ ] T9.2: Example blockers:
    - "Section 'Clinical Data Appraisal' is not finalized" -> click -> navigate to section
    - "3 claims have no source articles" -> click -> navigate to Claims Manager with filter

- [ ] **T10: Update pipeline after locking** (AC: downstream modules unblocked)
  - [ ] T10.1: After successful lock, pipeline progress bar updates via Apollo cache:
    - SOA node: completed (green check)
    - Validation/CER nodes: update from "blocked" to "not started" (if other deps met)
  - [ ] T10.2: Show next step suggestion: toast or inline prompt "SOA locked. Continue to Validation?" with link
  - [ ] T10.3: If Clinical SOA locked: Device SOA creation no longer shows dependency warning

- [ ] **T11: Implement read-only mode for locked SOA** (AC: no modifications after lock)
  - [ ] T11.1: When SOA is locked, all edit controls are disabled:
    - Extraction grid: read-only (no inline editing)
    - Section editor: Plate editor in read-only mode
    - Claims manager: no add/edit/delete
    - Similar device registry: no add/edit/delete
    - Benchmark manager: no add/edit/delete
  - [ ] T11.2: Show "Locked" badge (StatusBadge variant "locked") in SOA header
  - [ ] T11.3: All edit buttons hidden or disabled with tooltip "This SOA is locked"
  - [ ] T11.4: Grid cells show no editable cursor, only view-only popovers

- [ ] **T12: Write frontend tests**
  - [ ] T12.1: Test "Lock SOA" button visibility based on readiness
  - [ ] T12.2: Test LockConfirmation dialog renders recap metrics
  - [ ] T12.3: Test checkbox enables Lock button
  - [ ] T12.4: Test blocker list display and navigation
  - [ ] T12.5: Test read-only mode after locking (all edit controls disabled)
  - [ ] T12.6: Test pipeline progress bar update after lock
  - [ ] T12.7: Test toast notification on successful lock

## Dev Notes

### Technology Stack & Versions

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, Node.js 20 LTS+
- **Event Bus**: RabbitMQ with `DomainEvent<T>` format
- **Frontend**: React 19, Apollo Client 3.x, Tailwind CSS 4
- **UI Components**: LockConfirmation shared component, StatusBadge, shadcn/ui Dialog

### Architecture Patterns

- **Locking as domain operation**: The lock operation is a significant domain event that transitions the SOA aggregate state. It includes pre-lock validation, state change, immutability enforcement, and event emission. All of this lives in the `lock-soa.ts` use case.
- **Immutability enforcement**: A shared `assertSoaNotLocked()` helper is called at the beginning of every write use case. This is the enforcement mechanism — not just UI disabling.
- **Domain event propagation**: `soa.analysis.locked` event consumed by:
  1. Project module: updates pipeline status
  2. Validation module: checks if Validation can be unblocked
  3. CER module: checks if CER can be unblocked
- **Pre-lock readiness pattern**: The `soaLockReadiness` query is idempotent and can be called multiple times without side effects. It provides the frontend with blocking issues and summary metrics for the LockConfirmation dialog.

### Lock Validation Rules (complete list)

1. SOA status is DRAFT or IN_PROGRESS (not already LOCKED)
2. All thematic sections have status FINALIZED
3. All extraction grids have reviewed articles (no completely empty grids)
4. All claims have at least one article link (100% traceability)
5. If Clinical SOA: Section 6 (Similar Devices) has at least one similar device
6. No active async tasks running for this SOA (extraction, quality assessment, narrative generation)

### UX Design Notes

**LockConfirmation component (from UX spec lines 1142-1155):**

- Dialog centered, backdrop blur (stronger than normal dialogs)
- Lock icon 40px in blue-800
- Title: "Lock [element name]"
- Message: clear irréversibilité + consequences
- Recap: key metrics (sections, articles, claims)
- Checkbox: "I understand this action is irreversible"
- Buttons: "Cancel" (secondary) + "Lock" (success/green, disabled until checkbox checked)
- States: Default -> Checked -> Processing (spinner) -> Success (check animation)

**Post-lock behavior:**

- Toast: "SOA Analysis locked. X sections finalized. Y claims traced."
- Pipeline progress: SOA -> completed (green check)
- Next step prompt: "Continue to Validation?"
- All SOA views switch to read-only mode

### Domain Event Format

```typescript
const event: DomainEvent<SoaLockedPayload> = {
  eventType: 'soa.analysis.locked',
  aggregateId: soaAnalysisId,
  aggregateType: 'SoaAnalysis',
  data: {
    projectId: string,
    soaType: 'CLINICAL' | 'SIMILAR_DEVICE' | 'ALTERNATIVE',
    sectionCount: number,
    articleCount: number,
    claimCount: number,
    traceabilityPercentage: 100,
  },
  metadata: {
    userId: string,
    timestamp: string, // ISO 8601
    correlationId: string, // UUID
    version: 1,
  },
};
```

### Naming Conventions

- **Use case**: `lock-soa.ts`
- **GraphQL mutation**: `lockSoaAnalysis`
- **GraphQL query**: `soaLockReadiness`
- **Domain event**: `soa.analysis.locked`
- **Error class**: `LockConflictError` (from `apps/api/src/shared/errors/lock-conflict.ts`)
- **Helper**: `assertSoaNotLocked()`
- **Components**: Use shared `LockConfirmation` component

### Project Structure Notes

**Backend files to create/modify:**

- `apps/api/src/modules/soa/application/use-cases/lock-soa.ts` (create)
- `apps/api/src/modules/soa/graphql/mutations.ts` (extend with lockSoaAnalysis)
- `apps/api/src/modules/soa/graphql/queries.ts` (extend with soaLockReadiness)
- All SOA write use cases (extend with `assertSoaNotLocked` check)
- `apps/api/src/shared/events/` (event handler for pipeline updates)
- `apps/api/src/modules/soa/domain/events/soa-locked.ts` (event definition)

**Frontend files to create/modify:**

- `apps/web/src/features/soa/components/SoaDashboard.tsx` (extend with Lock button, blocker list)
- `apps/web/src/shared/components/LockConfirmation.tsx` (use shared component — may already exist from SLS)
- `apps/web/src/features/soa/components/ExtractionGrid.tsx` (read-only mode)
- `apps/web/src/features/soa/components/SectionEditor.tsx` (read-only mode)
- `apps/web/src/features/soa/components/ClaimsManager.tsx` (read-only mode)
- `apps/web/src/features/soa/components/SimilarDeviceRegistry.tsx` (read-only mode)
- `apps/web/src/features/soa/graphql/mutations.ts` (extend)
- `apps/web/src/features/soa/graphql/queries.ts` (extend with readiness query)

### References

- **Epics file**: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.11 (lines 970-985)
- **Architecture**: `_bmad-output/planning-artifacts/architecture.md` — Domain event format, LockConflictError, immutability enforcement, event bus patterns
- **UX Design Spec**: `_bmad-output/planning-artifacts/ux-design-specification.md` — LockConfirmation component (lines 1142-1155), Pipeline progress bar (lines 1104-1121), Journey 3 SOA lock (line 903)
- **Functional Requirements**: FR34 (SOA locking)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
