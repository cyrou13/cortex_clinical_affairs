# Story 6.3: PMS Cycle Creation & Management

Status: ready-for-dev

## Story

As an RA Manager,
I want to create PMS Cycles linked to CER versions,
So that post-market activities are organized by reporting period.

## Acceptance Criteria

**Given** an approved PMS Plan
**When** the RA Manager creates a PMS Cycle
**Then** the cycle is linked to a specific CER version (FR61)
**And** the cycle has a reporting period (start date, end date)
**And** PMCF activities from the PMS Plan are templated into the cycle
**And** cycle status is tracked: planned, active, completed
**And** the cycle dashboard shows activity completion progress

## Tasks / Subtasks

### Backend

- [ ] Ensure `PmsCycle` model in `packages/prisma/schema/pms.prisma` has all required fields:
  - id (UUID v7), pmsPlanId, cerVersionId, name, startDate (DateTime), endDate (DateTime), status (PLANNED/ACTIVE/COMPLETED), completedAt, createdAt, updatedAt
  - Relation: `activities PmcfActivity[]`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/create-cycle.ts`:
  - Validate PMS Plan is APPROVED or ACTIVE
  - Validate cerVersionId references a locked CER version (read-only cross-module query)
  - Validate date range (endDate > startDate)
  - Validate no overlapping cycles for the same PMS Plan
  - Create PmsCycle in PLANNED status
  - Auto-create PMCF activities from PMS Plan responsibilities template:
    - For each activity type defined in PmsResponsibility, create a PmcfActivity in PLANNED status
    - Assign the same userId from the responsibility entry
  - Emit domain event `pms.cycle.created`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/activate-cycle.ts`:
  - Transition PLANNED -> ACTIVE
  - Validate that at least one activity exists in the cycle
  - Emit domain event `pms.cycle.activated`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/complete-cycle.ts`:
  - Transition ACTIVE -> COMPLETED
  - Validate all activities are COMPLETED
  - If not all completed, throw `ValidationError('All PMCF activities must be completed before closing the cycle')`
  - Set completedAt timestamp
  - Emit domain event `pms.cycle.completed`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/update-cycle.ts`:
  - Update name, dates (only if PLANNED)
  - Update date range extension (allowed if ACTIVE, with audit trail)
- [ ] Create DTOs:
  - `create-cycle.dto.ts` — name, pmsPlanId, cerVersionId, startDate, endDate
  - `update-cycle.dto.ts`
- [ ] Create repository methods in `pms-cycle-repository.ts`:
  - `findCycleById(id)`
  - `findCyclesByPmsPlan(pmsPlanId)`
  - `findOverlappingCycles(pmsPlanId, startDate, endDate)`
  - `createCycle(data)`
  - `updateCycleStatus(id, status)`
  - `getCycleProgressStats(cycleId)` — activity completion counts
- [ ] Add domain events:
  - `pms-cycle-created.ts`
  - `pms-cycle-activated.ts`
  - `pms-cycle-completed.ts` (in `apps/api/src/modules/pms/domain/events/`)
- [ ] Add GraphQL types:
  - PmsCycle type with resolved fields: activities, progress stats, linkedCerVersion
  - CycleStatus enum (PLANNED, ACTIVE, COMPLETED)
  - CycleProgressStats type (totalActivities, completedActivities, progressPercentage)
- [ ] Add GraphQL queries:
  - `pmsCycle(id: UUID!)` — single cycle with activities
  - `pmsCycles(pmsPlanId: UUID!)` — all cycles for a plan
  - `activePmsCycle(pmsPlanId: UUID!)` — the currently active cycle (if any)
- [ ] Add GraphQL mutations:
  - `createPmsCycle(input: CreatePmsCycleInput!)`
  - `updatePmsCycle(id: UUID!, input: UpdatePmsCycleInput!)`
  - `activatePmsCycle(id: UUID!)`
  - `completePmsCycle(id: UUID!)`
- [ ] Write unit tests for cycle creation (activity templating, date validation, overlap detection)
- [ ] Write unit tests for cycle status transitions

### Frontend

- [ ] Create `apps/web/src/features/pms/components/CycleTimeline.tsx`:
  - Visual timeline showing all cycles for the PMS Plan
  - Each cycle as a horizontal bar on the timeline (start date to end date)
  - Color-coded by status: blue (PLANNED), green pulse (ACTIVE), green solid (COMPLETED)
  - Click on cycle navigates to cycle detail
  - "Create New Cycle" button above timeline
- [ ] Create `CycleCreationForm.tsx`:
  - Dialog form (shadcn Dialog):
    - Name field (text input)
    - CER Version select (dropdown showing locked CER versions)
    - Start Date / End Date (date pickers)
    - Preview of PMCF activities that will be auto-created
  - Zod validation: endDate > startDate, required fields
  - Submit creates the cycle and navigates to cycle detail
- [ ] Create `CycleDashboard.tsx`:
  - Cycle header: name, date range, StatusBadge, linked CER version
  - Progress ring/bar: "5/7 activities completed" (visual progress indicator)
  - Activity list as cards or table:
    - Each activity: type icon, name, assignee avatar, status badge, completion date
    - Click opens activity detail
  - Action buttons:
    - "Activate Cycle" (if PLANNED, Primary button)
    - "Complete Cycle" (if ACTIVE and all activities done, Success button)
    - If not all done: disabled with tooltip "X activities still pending"
- [ ] Create `CycleCard.tsx`:
  - Compact card for cycle list view
  - Shows: name, date range, progress (X/Y activities), status badge
  - Used in PMS Dashboard overview
- [ ] Add route `apps/web/src/routes/_authenticated/projects/$projectId/pms/$cycleId.tsx`:
  - Loads cycle data with `useSuspenseQuery`
  - Renders CycleDashboard
- [ ] Add "Cycles" section to PMS sidebar navigation
- [ ] Write component tests for CycleTimeline rendering and CycleCreationForm validation

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Frontend:** React 19, Apollo Client 3.x, shadcn/ui + Tailwind CSS 4
- **Database:** PostgreSQL 16, `packages/prisma/schema/pms.prisma`
- **Events:** RabbitMQ, event format `DomainEvent<T>`

### Activity Templating Pattern

- When a PMS Cycle is created, the system reads the PMS Plan's Responsibilities table
- For each responsibility entry, a `PmcfActivity` is created in the cycle with:
  - `activityType` from the responsibility
  - `assigneeId` from the responsibility
  - `status = PLANNED`
  - Empty findings/conclusions (to be filled during execution)
- This ensures consistency between PMS Plan and actual cycle activities

### Date Validation Rules

- `endDate` must be after `startDate`
- No overlapping cycles for the same PMS Plan (business rule)
- Cycle date range typically covers 1 year (annual PMS cycle) but is configurable
- If ACTIVE, date extension is allowed but logged in audit trail

### Status Transition Rules

```
PLANNED -> ACTIVE    (at least 1 activity exists)
ACTIVE -> COMPLETED  (all activities must be COMPLETED)
```

- No reverse transitions (COMPLETED -> ACTIVE not allowed)
- PLANNED cycle can be deleted
- ACTIVE cycle cannot be deleted (only completed)

### CER Version Linking

- Read-only cross-module query to verify CER version is locked
- Store `cerVersionId` as a reference (not a Prisma relation, since cross-schema)
- Display CER version info in cycle dashboard (version number, date)

### Frontend Patterns

- Use date picker from shadcn/ui for start/end date selection
- CycleTimeline: consider using a horizontal bar chart or custom SVG timeline
- Progress indicator: use shadcn Progress component, customized with CORTEX tokens
- Activity cards: use shadcn Card with status accent bar (left 3px, colored by status)
- Follow "Pas de cul-de-sac" principle: after cycle creation, navigate to cycle detail; after cycle completion, suggest PMCF report generation

### Naming Conventions

- Domain events: `pms.cycle.created`, `pms.cycle.activated`, `pms.cycle.completed`
- BullMQ queue (if needed): `pms:create-cycle`
- GraphQL: `createPmsCycle`, `activatePmsCycle`, `completePmsCycle`
- Files: `create-cycle.ts`, `CycleTimeline.tsx`, `CycleDashboard.tsx`

### Anti-Patterns to Avoid

- Do NOT allow cycle creation if PMS Plan is in DRAFT status
- Do NOT allow cycle completion if activities remain incomplete
- Do NOT store full CER data in the cycle — only reference by ID
- Do NOT skip activity templating — every cycle must have pre-populated activities from the plan

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    create-cycle.ts           # NEW
    activate-cycle.ts         # NEW
    complete-cycle.ts         # NEW
    update-cycle.ts           # NEW
  application/dtos/
    create-cycle.dto.ts       # NEW
    update-cycle.dto.ts       # NEW
  infrastructure/repositories/
    pms-cycle-repository.ts   # NEW
  domain/events/
    pms-cycle-created.ts      # NEW
    pms-cycle-activated.ts    # NEW
    pms-cycle-completed.ts    # NEW (update existing cycle-completed.ts)

apps/web/src/features/pms/
  components/
    CycleTimeline.tsx         # NEW
    CycleCreationForm.tsx     # NEW
    CycleDashboard.tsx        # NEW
    CycleCard.tsx             # NEW
```

### References

- **PRD FRs:** FR61
- **Architecture:** DDD structure, domain events via RabbitMQ, cross-module ID references
- **UX Spec:** Timeline visualization, StatusBadge variants, progress indicators, LockConfirmation pattern (for cycle completion), "Pas de cul-de-sac" navigation principle
- **Dependencies:** Story 6.1 (PMS Plan with responsibilities), locked CER version (Epic 5)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
