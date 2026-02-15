# Story 5.10: PCCP Deviation Workflow

Status: ready-for-dev

## Story

As an RA Manager,
I want to track deviations from the PCCP with significance thresholds,
So that significant deviations are justified and documented.

## Acceptance Criteria

**Given** a CER with a linked PCCP
**When** deviations from the PCCP are identified
**Then** the RA Manager can track deviations with description and justification (FR58h)
**And** deviation significance thresholds can be configured (FR58i)
**And** the system flags significant deviations requiring justification (FR58j)
**And** deviations are included in the CER documentation

## Tasks / Subtasks

### Backend

- [ ] Extend `PccpDeviation` model in `cer.prisma` (created in Story 5.1):
  - `id` UUID
  - `cerVersionId` UUID (relation to CerVersion)
  - `pccpSection` String (which PCCP section the deviation relates to)
  - `description` Text (what deviated)
  - `expectedValue` String (what the PCCP specified)
  - `actualValue` String (what actually occurred)
  - `significance` enum: LOW, MEDIUM, HIGH, CRITICAL
  - `justification` Text (required for HIGH and CRITICAL)
  - `justificationApproved` Boolean
  - `approvedById` UUID (relation to User)
  - `approvedAt` DateTime
  - `impactedSections` String[] (CER section numbers affected)
  - `resolutionAction` Text (what corrective action was taken)
  - `status` enum: IDENTIFIED, JUSTIFIED, APPROVED, RESOLVED
  - `createdAt`, `updatedAt`, `createdById`
- [ ] Create `PccpDeviationConfig` model in `cer.prisma`:
  - `id` UUID
  - `cerVersionId` UUID
  - `significanceThresholds` Json (configurable threshold definitions per metric type)
  - `autoFlagThreshold` enum: MEDIUM, HIGH, CRITICAL (deviations at or above this level require justification)
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/track-deviations.ts`:
  - CRUD operations for PccpDeviation
  - Validate justification is provided for significant deviations (HIGH, CRITICAL)
  - Flag deviations that exceed configured significance thresholds
  - Check impacted CER sections
  - Emit domain event `cer.pccp-deviation.created`
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/configure-deviation-thresholds.ts`:
  - Set significance thresholds per CER version
  - Define which significance levels require mandatory justification
  - Store configuration in PccpDeviationConfig
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/approve-deviation-justification.ts`:
  - Accept deviation ID and approval action
  - Validate approver has RA Manager or Admin role
  - Set justificationApproved = true, record approver and timestamp
  - Update deviation status to APPROVED
  - Emit domain event `cer.pccp-deviation.approved`
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/detect-deviations.ts`:
  - Compare PCCP expected outcomes with actual CER data
  - Auto-detect potential deviations based on:
    - Validation results vs PCCP acceptance criteria
    - SOA benchmark differences from PCCP expectations
    - Literature search scope differences
  - Create PccpDeviation records for detected deviations
  - Flag significance based on configured thresholds
- [ ] Create GraphQL types for PccpDeviation, PccpDeviationConfig
- [ ] Create GraphQL queries:
  - `pccpDeviations(cerVersionId: UUID!)` - list all deviations
  - `pccpDeviationConfig(cerVersionId: UUID!)` - get threshold configuration
  - `significantDeviations(cerVersionId: UUID!)` - only HIGH/CRITICAL deviations
  - `unjustifiedDeviations(cerVersionId: UUID!)` - deviations needing justification
- [ ] Create GraphQL mutations:
  - `createPccpDeviation(input: CreateDeviationInput!)` - create deviation
  - `updatePccpDeviation(input: UpdateDeviationInput!)` - update deviation
  - `deletePccpDeviation(id: UUID!)` - delete deviation (draft only)
  - `configureDeviationThresholds(input: ConfigureThresholdsInput!)` - set thresholds
  - `approveDeviationJustification(deviationId: UUID!)` - approve justification
  - `detectDeviations(cerVersionId: UUID!)` - auto-detect deviations
- [ ] Write unit tests for deviation tracking
- [ ] Write unit tests for significance threshold logic
- [ ] Write unit tests for auto-detection logic

### Frontend

- [ ] Create `PccpDeviationTracker.tsx` component in `apps/web/src/features/cer/components/`:
  - ag-Grid table with columns:
    - PCCP Section
    - Description
    - Expected Value
    - Actual Value
    - Significance (badge: LOW=gray, MEDIUM=blue, HIGH=orange, CRITICAL=red)
    - Justification (text preview, expand to full)
    - Status (badge: Identified/Justified/Approved/Resolved)
    - Actions (edit, approve, delete)
  - Filtering by significance, status
  - Summary header: "2 Critical | 3 High | 5 Medium | 8 Low"
  - "Detect Deviations" button to auto-detect from data comparison
  - "Add Deviation" button to manually create
- [ ] Create `DeviationDetailForm.tsx` component:
  - Form for creating/editing a deviation:
    - PCCP Section (dropdown or text)
    - Description (textarea)
    - Expected Value (text)
    - Actual Value (text)
    - Significance (dropdown: Low/Medium/High/Critical)
    - Justification (textarea, required for High/Critical)
    - Impacted CER Sections (multi-select of 14 sections)
    - Resolution Action (textarea)
  - Validation: justification required when significance >= configured threshold
  - Inline validation messages per UX pattern
- [ ] Create `DeviationThresholdConfig.tsx` component:
  - Configuration panel for significance thresholds
  - Auto-flag threshold selector: "Require justification for deviations rated" [Medium/High/Critical]
  - Per-metric threshold definitions (optional advanced config)
  - Save configuration per CER version
- [ ] Create `DeviationApprovalPanel.tsx` component:
  - List of deviations requiring approval
  - Each item: significance badge, description, justification text
  - "Approve" and "Reject" buttons
  - Reject requires a reason comment
  - Approval logs approver and timestamp
- [ ] Create `DeviationSummaryCard.tsx` component:
  - Dashboard card for CER dashboard
  - Total deviations count
  - Breakdown by significance (color-coded badges)
  - Unjustified count (if > 0, warning indicator)
  - Click navigates to full deviation tracker
- [ ] Add "PCCP Deviations" item to CER module sidebar navigation
- [ ] Create hooks:
  - `apps/web/src/features/cer/hooks/use-pccp-deviations.ts` - deviations query + mutations
  - `apps/web/src/features/cer/hooks/use-deviation-config.ts` - threshold config

## Dev Notes

### Technology Stack

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2
- **Frontend**: React 19, Apollo Client 3.x, ag-Grid Enterprise 33, shadcn/ui forms

### Architecture Patterns

- **CRUD with Validation**: Standard CRUD for deviations with business rule validation (justification required for significant deviations)
- **Auto-Detection**: Backend compares PCCP expectations with actual data to pre-populate deviations
- **Approval Workflow**: Separate use case for approval with RBAC enforcement (Admin, RA Manager only)
- **Domain Events**: `cer.pccp-deviation.created`, `cer.pccp-deviation.approved`
- **Audit Trail**: Automatic for all CRUD operations, approval explicitly logged

### Significance Levels

| Level    | Color  | Requires Justification | Description                                           |
| -------- | ------ | ---------------------- | ----------------------------------------------------- |
| LOW      | Gray   | No                     | Minor deviation, no clinical impact                   |
| MEDIUM   | Blue   | Configurable           | Moderate deviation, may need explanation              |
| HIGH     | Orange | Yes (mandatory)        | Significant deviation, justification required         |
| CRITICAL | Red    | Yes (mandatory)        | Critical deviation, justification + approval required |

### UX Design Notes

- **ag-Grid Table**: CORTEX-themed, significance badges with color coding, inline status updates
- **Significance Badges**: Color-coded pills matching severity: gray/blue/orange/red
- **Justification Required**: When significance is HIGH or CRITICAL, justification field becomes required with validation
- **Auto-Detect**: "Detect Deviations" button runs comparison, shows results, user reviews and confirms
- **Approval Flow**: Separate approval step for significant deviations, logs approver
- **Dashboard Card**: Summary of deviations for CER dashboard, warning if unjustified deviations exist

### Project Structure Notes

```
apps/api/src/modules/cer/
├── application/use-cases/
│   ├── track-deviations.ts                 (NEW)
│   ├── configure-deviation-thresholds.ts    (NEW)
│   ├── approve-deviation-justification.ts   (NEW)
│   └── detect-deviations.ts                (NEW)
└── graphql/
    ├── types.ts                            (UPDATED)
    ├── queries.ts                          (UPDATED)
    └── mutations.ts                        (UPDATED)

apps/web/src/features/cer/components/
├── PccpDeviationTracker.tsx                (NEW)
├── DeviationDetailForm.tsx                 (NEW)
├── DeviationThresholdConfig.tsx            (NEW)
├── DeviationApprovalPanel.tsx              (NEW)
└── DeviationSummaryCard.tsx                (NEW)

apps/web/src/features/cer/hooks/
├── use-pccp-deviations.ts                  (NEW)
└── use-deviation-config.ts                 (NEW)

packages/prisma/schema/cer.prisma           (UPDATED)
```

### Dependencies

- Depends on Story 5.1 (PccpDeviation model, CER creation)
- Depends on Story 5.4 (CER sections for impacted section tracking)
- FR references: FR58h, FR58i, FR58j

### References

- PRD: FR58h (track deviations), FR58i (configure thresholds), FR58j (flag significant deviations)
- Architecture: CRUD pattern, RBAC enforcement, audit middleware
- UX Design Spec: ag-Grid theming, form patterns, inline validation, severity color coding
- Epics: Epic 5 Story 5.10

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
