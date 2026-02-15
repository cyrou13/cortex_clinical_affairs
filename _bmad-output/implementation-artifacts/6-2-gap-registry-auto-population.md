# Story 6.2: Gap Registry Auto-Population

Status: ready-for-dev

## Story

As an RA Manager,
I want the Gap Registry automatically populated from SOA, Validation, and CER open questions,
So that all knowledge gaps are systematically tracked for PMCF planning.

## Acceptance Criteria

**Given** locked SOA, Validation, and CER modules
**When** the Gap Registry is initialized
**Then** gaps are auto-populated from: SOA open questions, Validation limitations, CER identified uncertainties (FR60)
**And** each gap entry includes: source module, description, severity, recommended PMCF activity
**And** gaps are displayed in a filterable ag-Grid table
**And** gaps can be manually added, edited, or resolved
**And** gap status is tracked: open, in progress, resolved

## Tasks / Subtasks

### Backend

- [ ] Ensure `GapRegistryEntry` model exists in `packages/prisma/schema/pms.prisma` (created in Story 6.1):
  - Fields: id (UUID v7), pmsPlanId, sourceModule (SOA/VALIDATION/CER), sourceId, description, severity (LOW/MEDIUM/HIGH/CRITICAL), recommendedActivity (ActivityType enum), status (OPEN/IN_PROGRESS/RESOLVED), resolvedAt, resolvedBy, resolutionNotes, createdAt, updatedAt
  - Add `manuallyCreated` boolean field (default false)
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/populate-gap-registry.ts`:
  - Accept pmsPlanId
  - Query SOA module (read-only cross-module): find open questions/limitations from locked SOA analyses linked to the project
  - Query Validation module (read-only cross-module): find study limitations and unmet endpoints from locked validation studies
  - Query CER module (read-only cross-module): find identified uncertainties and unresolved claims from locked CER versions
  - For each gap source, create a GapRegistryEntry with sourceModule, sourceId, auto-generated description, default severity
  - Deduplicate: if a gap with same sourceModule + sourceId already exists, skip
  - Emit domain event `pms.gap-registry.populated`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/update-gap-registry.ts`:
  - Manually add a new gap entry (manuallyCreated = true)
  - Update description, severity, recommendedActivity on existing entries
  - Transition gap status: OPEN -> IN_PROGRESS, IN_PROGRESS -> RESOLVED (with resolutionNotes)
  - Re-open resolved gap: RESOLVED -> OPEN
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/refresh-gap-registry.ts`:
  - Re-run auto-population to pick up new gaps from upstream modules (e.g., after CER annual update)
  - Preserve existing manual entries and resolved status
  - Only add NEW gaps not yet in registry
- [ ] Create DTOs:
  - `apps/api/src/modules/pms/application/dtos/create-gap-entry.dto.ts`
  - `apps/api/src/modules/pms/application/dtos/update-gap-entry.dto.ts`
- [ ] Create repository methods in `pms-plan-repository.ts` or create dedicated `gap-registry-repository.ts`:
  - `findGapsByPmsPlan(pmsPlanId, filter?)`
  - `findGapBySourceModuleAndId(pmsPlanId, sourceModule, sourceId)`
  - `createGap(data)`
  - `updateGap(id, data)`
  - `getGapStatistics(pmsPlanId)` — counts by status and severity
- [ ] Add GraphQL types in `apps/api/src/modules/pms/graphql/types.ts`:
  - GapRegistryEntry type
  - GapSeverity enum (LOW, MEDIUM, HIGH, CRITICAL)
  - GapStatus enum (OPEN, IN_PROGRESS, RESOLVED)
  - GapStatistics type (totalCount, openCount, inProgressCount, resolvedCount, bySeverity)
  - GapFilter input type
- [ ] Add GraphQL queries:
  - `gapRegistryEntries(pmsPlanId: UUID!, filter: GapFilter)` — paginated, filterable list
  - `gapRegistryEntry(id: UUID!)` — single entry detail
  - `gapRegistryStatistics(pmsPlanId: UUID!)` — summary statistics
- [ ] Add GraphQL mutations:
  - `populateGapRegistry(pmsPlanId: UUID!)` — trigger auto-population
  - `refreshGapRegistry(pmsPlanId: UUID!)` — refresh with new upstream data
  - `addGapEntry(pmsPlanId: UUID!, input: CreateGapEntryInput!)` — manual entry
  - `updateGapEntry(id: UUID!, input: UpdateGapEntryInput!)` — edit entry
  - `resolveGapEntry(id: UUID!, resolutionNotes: String!)` — mark resolved
  - `reopenGapEntry(id: UUID!)` — reopen resolved gap
- [ ] Subscribe to domain events from upstream modules (listen on RabbitMQ):
  - `cer.version.locked` -> auto-trigger gap registry population for the linked PMS Plan
- [ ] Write unit tests for populate-gap-registry logic (deduplication, source mapping)
- [ ] Write unit tests for gap status transitions

### Frontend

- [ ] Create `apps/web/src/features/pms/components/GapRegistry.tsx`:
  - ag-Grid table with columns: Source Module (badge), Description, Severity (color-coded badge), Recommended Activity, Status (StatusBadge), Created Date
  - Column filtering and sorting
  - Row selection for bulk status updates
  - Accent bar left pattern: color by severity (green=LOW, orange=MEDIUM, red=HIGH, dark-red=CRITICAL)
  - Inline editing for description and recommended activity
  - Row click opens detail panel (380px right)
- [ ] Create `GapRegistryDetailPanel.tsx`:
  - Full gap description
  - Source traceability: clickable link to source SOA/Validation/CER section
  - Status transition buttons: "Start Working" (OPEN -> IN_PROGRESS), "Resolve" (-> RESOLVED with notes field), "Reopen"
  - Resolution notes field (when resolving)
  - Audit trail for this entry (timestamps, who changed what)
- [ ] Create `GapRegistryToolbar.tsx`:
  - "Auto-populate" button (Primary + brain icon) — triggers initial population
  - "Refresh" button (Secondary) — adds new gaps from upstream
  - "Add Manual Gap" button (Ghost + plus icon) — opens inline form
  - Filter chips: by status, by severity, by source module
  - Statistics summary bar: "12 Open | 5 In Progress | 8 Resolved"
- [ ] Create `AddGapEntryForm.tsx`:
  - Inline form or dialog for manual gap creation
  - Fields: description (textarea), severity (select), recommended PMCF activity (select), source notes
  - Validation via Zod schema
- [ ] Create GraphQL operations in `apps/web/src/features/pms/graphql/`:
  - Add gap registry queries and mutations
  - Use Apollo Client cache updates for optimistic UI
- [ ] Add Gap Registry as sidebar navigation item under PMS module
- [ ] Write component tests for GapRegistry table filtering and status transitions

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Frontend:** React 19, Apollo Client 3.x, ag-Grid 33, shadcn/ui + Tailwind CSS 4
- **Database:** PostgreSQL 16, `packages/prisma/schema/pms.prisma`
- **Events:** RabbitMQ domain events, `DomainEvent<T>` format

### Cross-Module Data Access Pattern

- The Gap Registry auto-population requires **read-only** access to other modules' data
- Per architecture rules: "use cases may read (not write) other modules' repositories for queries"
- Do NOT import SOA/Validation/CER use cases; instead, inject their repository interfaces and query directly
- SOA gaps: query `SoaAnalysis` for open questions, incomplete sections, low-confidence extractions
- Validation gaps: query `ValidationStudy` for unmet endpoints, study limitations, protocol deviations
- CER gaps: query `CerVersion` sections for unresolved claims, flagged sections, incomplete traceability
- Each source produces a structured gap with: `{ sourceModule, sourceId, description, severity }`

### Event-Driven Population

- Listen for `cer.version.locked` domain event via RabbitMQ
- When received, check if a PMS Plan exists for the project; if so, auto-populate the Gap Registry
- This enables the regulatory loop: CER locked -> PMS gaps identified -> PMCF planning informed

### ag-Grid Configuration for Gap Registry

- Use ag-Grid Enterprise with CORTEX theming
- Custom cell renderers for:
  - Severity badge (color-coded: green/orange/red/dark-red)
  - StatusBadge component for gap status
  - Source Module badge (SOA/Validation/CER with distinct colors)
- Row grouping by source module
- Export to CSV capability
- Infinite scroll for large gap registries

### Naming Conventions

- Domain event: `pms.gap-registry.populated`
- GraphQL mutation: `populateGapRegistry`, `resolveGapEntry`
- Prisma model: `GapRegistryEntry`
- TypeScript file: `populate-gap-registry.ts`, `gap-registry-repository.ts`
- React component: `GapRegistry.tsx`, `GapRegistryDetailPanel.tsx`

### Anti-Patterns to Avoid

- Do NOT write to other modules' databases from PMS — only read
- Do NOT call other modules' use cases — only query their repositories
- Do NOT manually log audit entries — middleware handles it
- Do NOT use circular imports between PMS and CER/SOA/Validation

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    populate-gap-registry.ts    # NEW
    update-gap-registry.ts      # NEW
    refresh-gap-registry.ts     # NEW
  application/dtos/
    create-gap-entry.dto.ts     # NEW
    update-gap-entry.dto.ts     # NEW
  infrastructure/repositories/
    gap-registry-repository.ts  # NEW

apps/web/src/features/pms/
  components/
    GapRegistry.tsx             # NEW
    GapRegistryDetailPanel.tsx  # NEW
    GapRegistryToolbar.tsx      # NEW
    AddGapEntryForm.tsx         # NEW
```

### References

- **PRD FRs:** FR60, FR66
- **Architecture:** Cross-module read-only access pattern, RabbitMQ event-driven integration, ag-Grid Enterprise theming
- **UX Spec:** ag-Grid with CORTEX theming, accent bar left pattern for severity, StatusBadge component, detail panel (380px right), filter chips pattern
- **Dependencies:** Story 6.1 (PMS schema/plan), locked SOA (Epic 3), locked Validation (Epic 4), locked CER (Epic 5)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
