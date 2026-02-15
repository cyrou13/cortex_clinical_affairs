# Story 6.9: CER Update Decision & Regulatory Loop Closure

Status: ready-for-dev

## Story

As an RA Manager,
I want to document CER Update Decisions based on PMS findings and close the regulatory loop,
So that the device's clinical evaluation is continuously maintained.

## Acceptance Criteria

**Given** a completed PSUR with trend analysis and benefit-risk re-assessment
**When** the RA Manager documents the CER Update Decision
**Then** the decision includes: benefit-risk re-assessment, conclusion (update required / not required), justification (FR65)
**And** the Gap Registry is updated based on PMS findings (new gaps identified, existing gaps resolved) (FR66)
**And** if the PSUR identifies material changes, the system can trigger a CER version update (FR67)
**And** the CER update creates a new version (annual_update or patch_update) linked to the PMS findings
**And** updated gaps feed into the next PMCF planning cycle (regulatory loop closure)
**And** the pipeline progress bar shows the full cycle: SLS -> SOA -> Validation -> CER -> PMS (all completed)
**And** a success notification confirms: "PMS Cycle completed. Regulatory loop closed."

## Tasks / Subtasks

### Backend

- [ ] Add `CerUpdateDecision` model to `packages/prisma/schema/pms.prisma`:
  - id (UUID v7), pmsCycleId, psurReportId
  - benefitRiskReAssessment (Text) — narrative re-assessment
  - conclusion (CER_UPDATE_REQUIRED / CER_UPDATE_NOT_REQUIRED / CER_PATCH_REQUIRED)
  - justification (Text) — mandatory justification for the decision
  - materialChangesIdentified (Boolean)
  - materialChangesDescription (Text, optional)
  - newGapsIdentified (Json - array of new gap descriptions)
  - gapsResolved (Json - array of resolved gap IDs)
  - triggeredCerVersionId (UUID, optional) — if CER update was triggered
  - decidedBy (UUID, references User), decidedAt (DateTime)
  - status (DRAFT/FINALIZED)
  - createdAt, updatedAt
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/cer-update-decision.ts`:
  - Accept: pmsCycleId, psurReportId, decision data
  - Validate: PSUR must be generated for this cycle
  - Validate: benefit-risk re-assessment and justification are non-empty
  - Create CerUpdateDecision record in DRAFT status
  - Save decision
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/finalize-cer-update-decision.ts`:
  - Transition DRAFT -> FINALIZED
  - On finalization:
    - Update Gap Registry based on decision:
      - Resolve gaps listed in `gapsResolved`
      - Create new gap entries for `newGapsIdentified`
    - If conclusion is CER_UPDATE_REQUIRED or CER_PATCH_REQUIRED:
      - Emit domain event `pms.cer-update-required` with:
        - projectId, cerVersionId (current), pmsCycleId
        - versionType: 'annual_update' or 'patch_update'
        - justification
      - CER module listens and can create a new CER version (per FR67)
    - If conclusion is CER_UPDATE_NOT_REQUIRED:
      - Emit domain event `pms.cer-update-not-required` (for audit)
    - Emit domain event `pms.update-decision.finalized`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/close-pms-cycle.ts`:
  - Called after CER Update Decision is finalized
  - Validate: all activities completed, PSUR generated, CER Update Decision finalized
  - Mark PMS Cycle as COMPLETED
  - Update pipeline status: PMS node -> "completed"
  - Emit domain event `pms.cycle.completed`
  - If CER update was triggered, emit `pms.regulatory-loop.new-cycle-pending`
  - Return success with summary
- [ ] Create domain event listener for `pms.cer-update-required`:
  - In the CER module, listen for this event
  - When received: create a new CER version (annual_update or patch_update) as per FR55
  - The new CER version is pre-linked to the PMS findings
  - Duplicate the previous locked CER (per FR55a) as starting point
  - Flag sections requiring updates (per FR55c)
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/prepare-next-cycle.ts`:
  - Called after closing the current cycle
  - Refresh the Gap Registry with new/updated gaps
  - Suggest parameters for the next PMS Cycle:
    - Recommended activities based on open gaps
    - Suggested date range (based on PMS Plan frequency)
  - This implements the "regulatory loop closure" — findings feed into next planning
- [ ] Add domain events:
  - `pms.update-decision.finalized` — in `apps/api/src/modules/pms/domain/events/`
  - `pms.cer-update-required` — triggers CER module action
  - `pms.cer-update-not-required` — for audit trail
  - `pms.regulatory-loop.closed` — full cycle complete
- [ ] Add GraphQL types:
  - CerUpdateDecision type
  - CerUpdateConclusion enum (CER_UPDATE_REQUIRED, CER_UPDATE_NOT_REQUIRED, CER_PATCH_REQUIRED)
  - CerUpdateDecisionStatus enum (DRAFT, FINALIZED)
  - PmsCycleSummary type (for cycle closure confirmation)
  - NextCycleSuggestion type (suggestedActivities, suggestedDateRange, openGapsCount)
- [ ] Add GraphQL queries:
  - `cerUpdateDecision(cycleId: UUID!)` — get decision for cycle
  - `cerUpdateDecisions(projectId: UUID!)` — all decisions across cycles (history)
  - `nextCycleSuggestion(pmsPlanId: UUID!)` — suggestion for next cycle
- [ ] Add GraphQL mutations:
  - `createCerUpdateDecision(cycleId: UUID!, input: CerUpdateDecisionInput!)` — create draft
  - `updateCerUpdateDecision(id: UUID!, input: CerUpdateDecisionInput!)` — update draft
  - `finalizeCerUpdateDecision(id: UUID!)` — finalize (triggers gap registry update + CER version trigger)
  - `closePmsCycle(cycleId: UUID!)` — close the cycle (after decision finalized)
  - `prepareNextCycle(pmsPlanId: UUID!)` — get suggestions for next cycle
- [ ] Write unit tests for CER Update Decision lifecycle
- [ ] Write unit tests for Gap Registry update logic (resolve + create new gaps)
- [ ] Write integration test for the full regulatory loop: decision -> gap update -> CER trigger

### Frontend

- [ ] Create `apps/web/src/features/pms/components/CerUpdateDecision.tsx`:
  - Main decision form (full page or large panel):
    - **Benefit-Risk Re-Assessment section:**
      - Reference to CER's original Benefit-Risk Determination (read-only card)
      - PSUR trend analysis summary (read-only card)
      - Re-assessment narrative editor (textarea with auto-save)
    - **Decision section:**
      - Radio group: "CER Update Required" / "CER Patch Required" / "No CER Update Required"
      - Justification textarea (mandatory, auto-save)
      - Material changes toggle + description field (if material changes identified)
    - **Gap Registry Updates section:**
      - "Gaps Resolved" — multi-select from open gaps in registry
      - "New Gaps Identified" — add new gap entries (description, severity, recommended activity)
    - **Summary section:**
      - Preview of what will happen on finalization:
        - Gap Registry changes (X resolved, Y new)
        - CER action (new version triggered / no action)
    - Action buttons:
      - "Save Draft" (Secondary) — save without finalizing
      - "Finalize Decision" (Success) — LockConfirmation dialog before finalization
- [ ] Create `CerUpdateDecisionSummary.tsx`:
  - Compact card showing decision summary (for dashboard/cycle view)
  - Conclusion badge (green "No Update" / orange "Patch Required" / red "Update Required")
  - Justification excerpt
  - Date and decider
- [ ] Create `RegulatoryLoopClosurePanel.tsx`:
  - Visual summary of the complete regulatory loop
  - Shows the full pipeline: SLS -> SOA -> Validation -> CER -> PMS (all with check marks)
  - Summary metrics:
    - PMS Cycle duration
    - Activities completed
    - Complaints processed
    - Gaps resolved / new gaps
    - CER update decision
  - Success message: "PMS Cycle completed. Regulatory loop closed."
  - Next steps:
    - If CER update required: "A new CER version has been created. [Go to CER Module]"
    - If no update: "Next PMS Cycle planned for [date]. [Create Next Cycle]"
    - "Prepare Next Cycle" button — shows NextCycleSuggestion
- [ ] Create `NextCycleSuggestionPanel.tsx`:
  - Shows suggestion for next PMS Cycle:
    - Open gaps that need addressing
    - Recommended PMCF activities based on gaps
    - Suggested date range (from PMS Plan frequency)
  - "Create Next Cycle" button (pre-fills cycle creation form with suggestions)
- [ ] Create `PmsDecisionHistory.tsx`:
  - Timeline of all CER Update Decisions for the project
  - Each entry: cycle name, decision date, conclusion badge, justification excerpt
  - Click expands to full decision detail
  - Useful for auditors to see the history of PMS decisions
- [ ] Update `CycleDashboard.tsx` (from Story 6.3):
  - Add "CER Update Decision" section at the bottom
  - Show decision status (not started / draft / finalized)
  - Action button: "Document Decision" (navigates to CerUpdateDecision form)
  - After decision finalized: show "Close Cycle" button
- [ ] Update `PmsDashboard.tsx` (from Story 6.1):
  - After cycle is closed and regulatory loop is complete:
    - Show green "Regulatory Loop Closed" banner with celebration
    - PipelineProgressBar: all nodes completed
    - "Prepare Next Cycle" CTA
- [ ] Add LockConfirmation dialog for "Finalize Decision":
  - Summary of decision: conclusion, gap changes, CER action
  - Checkbox: "I understand this decision is final and will trigger the described actions"
  - This follows the "irréversible action" pattern from UX spec
- [ ] Add "CER Update Decision" section to PMS sidebar navigation
- [ ] Connect pipeline progress bar: PMS node -> "completed" when cycle is closed
- [ ] Write component tests for CerUpdateDecision form validation
- [ ] Write component tests for LockConfirmation flow

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Frontend:** React 19, Apollo Client 3.x, shadcn/ui + Tailwind CSS 4
- **Events:** RabbitMQ for cross-module domain events (critical for CER trigger)

### Regulatory Loop Closure Architecture

This story is the capstone of the entire CORTEX pipeline. The regulatory loop is:

```
SLS (evidence) -> SOA (analysis) -> Validation (performance) -> CER (evaluation)
-> PMS (surveillance) -> CER Update Decision -> new CER version (if needed) -> new PMS cycle
```

- The loop closure happens when:
  1. PSUR is generated (Story 6.8)
  2. CER Update Decision is documented and finalized (this story)
  3. Gap Registry is updated with PMS findings (FR66)
  4. If needed, a new CER version is triggered (FR67)
  5. The next PMS cycle is planned with updated gaps
- This is the "epilogue" of the CORTEX experience (per UX spec): "Le PMS est l'epilogue -- la boucle se ferme, le cycle continue."

### Cross-Module Event-Driven Integration

- **Critical event:** `pms.cer-update-required`
  - Published by PMS module when CER Update Decision is finalized with `CER_UPDATE_REQUIRED` or `CER_PATCH_REQUIRED`
  - Consumed by CER module to create a new CER version
  - Event payload: `{ projectId, currentCerVersionId, pmsCycleId, versionType, justification }`
  - The CER module's event handler calls `manage-versions.ts` use case to duplicate the previous CER
- This is the only cross-module write triggered by PMS (via events, not direct calls)
- Per architecture: "Modules do NOT call each other directly -- communication via domain events (RabbitMQ)"

### Gap Registry Update Logic

- On finalization:
  1. For each gap ID in `gapsResolved`: set status to RESOLVED, add resolution notes
  2. For each entry in `newGapsIdentified`: create new GapRegistryEntry with sourceModule=PMS
  3. Existing gaps not mentioned remain unchanged
- Updated Gap Registry feeds into next PMS cycle planning (closed loop)

### LockConfirmation Pattern for Decision Finalization

- This follows the "irréversible action" UX pattern (from UX spec Step 14):
  - **Important level:** LockConfirmation with checkbox (same as dataset locking)
  - Dialog content:
    - Decision summary
    - Gap Registry changes preview
    - CER action that will be triggered
    - Checkbox: "I understand this decision is final"
    - Disabled "Finalize" button until checkbox checked
- NOT an e-signature action (that's only for CER finalization); this uses the LockConfirmation pattern

### Pipeline Progress Bar Update

- When PMS Cycle is closed with finalized decision:
  - PMS node in PipelineProgressBar -> "completed" (green check)
  - All 5 nodes should show completed: SLS, SOA, Validation, CER, PMS
  - This is the culmination of the entire pipeline
- If CER update is triggered:
  - CER node may transition back to "active" (new version in progress)
  - This visually shows the loop continuing

### Next Cycle Suggestion Algorithm

- Query open gaps from Gap Registry
- Map gaps to recommended PMCF activity types (using `recommendedActivity` field)
- Calculate suggested date range from PMS Plan frequency (e.g., if annual: start = previous cycle end + 1 day)
- Count unique activity types needed
- Return structured suggestion for pre-filling cycle creation form

### Naming Conventions

- Domain events: `pms.update-decision.finalized`, `pms.cer-update-required`, `pms.cer-update-not-required`, `pms.regulatory-loop.closed`
- GraphQL: `finalizeCerUpdateDecision`, `closePmsCycle`, `prepareNextCycle`
- Files: `cer-update-decision.ts`, `CerUpdateDecision.tsx`, `RegulatoryLoopClosurePanel.tsx`
- Prisma model: `CerUpdateDecision`

### UX Patterns

- Decision form follows the multi-section form pattern (not a stepper, but clearly separated sections)
- Read-only reference cards for CER and PSUR data (blue-50 background with blue-400 left border)
- Decision conclusion as radio group with distinct visual weight
- LockConfirmation for finalization (important action pattern)
- Celebration moment: green banner + success notification when loop is closed
- "Pas de cul-de-sac": after loop closure, suggest "Create Next Cycle" or "Go to CER Module" (if update triggered)
- PMS Decision History as a timeline component for auditor review

### Anti-Patterns to Avoid

- Do NOT call CER module directly — use domain events via RabbitMQ
- Do NOT allow finalizing a decision without a PSUR generated
- Do NOT allow empty justification — it is mandatory for regulatory compliance
- Do NOT skip Gap Registry updates — they are the mechanism for loop closure
- Do NOT allow reopening a finalized decision — it is immutable
- Do NOT modify the PipelineProgressBar status from the frontend — backend must drive pipeline state

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    cer-update-decision.ts            # NEW
    finalize-cer-update-decision.ts   # NEW
    close-pms-cycle.ts                # NEW
    prepare-next-cycle.ts             # NEW
  domain/events/
    pms-update-decision-finalized.ts  # NEW
    pms-cer-update-required.ts        # NEW
    pms-regulatory-loop-closed.ts     # NEW

apps/api/src/modules/cer/
  # Event listener (added to CER module):
  infrastructure/services/
    pms-event-listener.ts             # NEW — listens for pms.cer-update-required

apps/web/src/features/pms/
  components/
    CerUpdateDecision.tsx              # NEW
    CerUpdateDecisionSummary.tsx       # NEW
    RegulatoryLoopClosurePanel.tsx     # NEW
    NextCycleSuggestionPanel.tsx       # NEW
    PmsDecisionHistory.tsx             # NEW

packages/prisma/schema/pms.prisma     # UPDATE (add CerUpdateDecision model)
```

### References

- **PRD FRs:** FR65, FR66, FR67
- **Architecture:** Domain events via RabbitMQ for cross-module integration, DomainEvent<T> format, "modules do NOT call each other directly", Gap Registry as feedback mechanism
- **UX Spec:** LockConfirmation for irréversible actions, PipelineProgressBar completion state, success celebration pattern, "Pas de cul-de-sac" navigation, regulatory loop as "epilogue" of the CORTEX experience
- **Dependencies:** Story 6.8 (PSUR with benefit-risk re-assessment), Story 6.2 (Gap Registry), Story 6.3 (PMS Cycle), Story 5.12 (CER Version Management for triggered updates), Story 5.8 (Benefit-Risk Determination)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
