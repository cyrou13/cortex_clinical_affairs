# Story 6.1: PMS Plan Configuration & Management

Status: ready-for-dev

## Story

As an RA Manager,
I want to configure PMS Plans with update frequency, data collection methods, and responsibility assignments,
So that post-market surveillance activities are planned and structured.

## Acceptance Criteria

**Given** a project with a locked CER
**When** the RA Manager creates a PMS Plan
**Then** the plan includes: update frequency, data collection methods (FR59)
**And** vigilance databases can be configured per PMS Plan (FR59a)
**And** vigilance search keywords can be defined per similar device (FR59b)
**And** survey templates can be linked to the PMS Plan (FR59c)
**And** PMS Plan statuses are managed: draft -> approved -> active (FR59d)
**And** a Responsibilities table can be defined per PMS activity (FR59e)
**And** the Prisma schema for PMS entities is created (PmsPlan, PmcfPlan, GapRegistry, PmsCycle, PmcfActivity, Complaint, TrendAnalysis)
**And** the PMS module dashboard shows plan status and upcoming activities

## Tasks / Subtasks

### Backend

- [ ] Create the PMS Prisma schema file `packages/prisma/schema/pms.prisma` with all PMS entities:
  - `PmsPlan` (id, projectId, cerVersionId, updateFrequency, dataCollectionMethods, status [DRAFT/APPROVED/ACTIVE], createdAt, updatedAt)
  - `PmsPlanVigilanceDb` (id, pmsPlanId, databaseName [MAUDE/ANSM/BFARM/AFMPS], enabled, searchKeywords)
  - `PmsPlanSurveyTemplate` (id, pmsPlanId, templateName, templateContent JSON)
  - `PmsResponsibility` (id, pmsPlanId, activityType, userId, role, description)
  - `PmcfPlan` (id, pmsPlanId, objectives, methodology)
  - `GapRegistryEntry` (id, pmsPlanId, sourceModule [SOA/VALIDATION/CER], sourceId, description, severity, recommendedActivity, status [OPEN/IN_PROGRESS/RESOLVED], resolvedAt)
  - `PmsCycle` (id, pmsPlanId, cerVersionId, startDate, endDate, status [PLANNED/ACTIVE/COMPLETED])
  - `PmcfActivity` (id, pmsCycleId, activityType [LITERATURE_UPDATE/NAMED_DEVICE_SEARCH/USER_SURVEYS/VIGILANCE_MONITORING/COMPLAINTS/INSTALLED_BASE/TREND_ANALYSIS], assigneeId, status [PLANNED/IN_PROGRESS/COMPLETED], findingsSummary, dataCollected JSON, conclusions, completedAt)
  - `Complaint` (id, pmsCycleId, date, description, deviceIdentifier, severity, classification, resolution, source [MANUAL/ZOHO_DESK], externalId)
  - `TrendAnalysis` (id, pmsCycleId, analysisDate, dataPoints JSON, trends JSON, significantChanges JSON)
  - `VigilanceSearchKeyword` (id, pmsPlanId, similarDeviceId, keyword)
- [ ] Run `pnpm prisma migrate dev` to create PMS tables
- [ ] Create PMS domain entities in `apps/api/src/modules/pms/domain/entities/`:
  - `pms-plan.ts` with status lifecycle (DRAFT -> APPROVED -> ACTIVE)
  - `pmcf-plan.ts`
  - `gap-registry.ts`
  - `pms-cycle.ts`
  - `pmcf-activity.ts`
  - `complaint.ts`
  - `trend-analysis.ts`
- [ ] Create value objects in `apps/api/src/modules/pms/domain/value-objects/`:
  - `plan-status.ts` (DRAFT, APPROVED, ACTIVE)
  - `activity-type.ts` (LITERATURE_UPDATE, NAMED_DEVICE_SEARCH, USER_SURVEYS, VIGILANCE_MONITORING, COMPLAINTS, INSTALLED_BASE, TREND_ANALYSIS)
- [ ] Create domain events in `apps/api/src/modules/pms/domain/events/`:
  - `pms-plan-created.ts`
  - `pms-plan-approved.ts`
  - `pms-plan-activated.ts`
- [ ] Create use cases in `apps/api/src/modules/pms/application/use-cases/`:
  - `create-pms-plan.ts` — validate CER is locked (UpstreamNotLockedError if not), create PmsPlan in DRAFT status
  - `update-pms-plan.ts` — update plan fields (only in DRAFT status)
  - `approve-pms-plan.ts` — transition DRAFT -> APPROVED, emit `pms.plan.approved`
  - `activate-pms-plan.ts` — transition APPROVED -> ACTIVE, emit `pms.plan.activated`
  - `configure-vigilance-databases.ts` — add/update/remove vigilance database configs
  - `define-vigilance-keywords.ts` — add/update/remove keywords per similar device
  - `link-survey-templates.ts` — attach survey templates to PMS Plan
  - `manage-responsibilities.ts` — CRUD responsibilities table entries
- [ ] Create DTOs in `apps/api/src/modules/pms/application/dtos/`:
  - `create-pms-plan.dto.ts`
  - `update-pms-plan.dto.ts`
  - `configure-vigilance-db.dto.ts`
  - `manage-responsibility.dto.ts`
- [ ] Create repository in `apps/api/src/modules/pms/infrastructure/repositories/`:
  - `pms-plan-repository.ts`
- [ ] Create GraphQL types in `apps/api/src/modules/pms/graphql/types.ts`:
  - PmsPlan, PmcfPlan, PmsPlanVigilanceDb, PmsPlanSurveyTemplate, PmsResponsibility, VigilanceSearchKeyword
  - PmsPlanStatus enum
  - ActivityType enum
- [ ] Create GraphQL queries in `apps/api/src/modules/pms/graphql/queries.ts`:
  - `pmsPlan(id: UUID!)` — single plan
  - `pmsPlans(projectId: UUID!)` — all plans for project
  - `pmsPlanVigilanceDatabases(pmsPlanId: UUID!)` — vigilance config
  - `pmsPlanResponsibilities(pmsPlanId: UUID!)` — responsibilities table
- [ ] Create GraphQL mutations in `apps/api/src/modules/pms/graphql/mutations.ts`:
  - `createPmsPlan`, `updatePmsPlan`, `approvePmsPlan`, `activatePmsPlan`
  - `configureVigilanceDatabases`, `defineVigilanceKeywords`
  - `linkSurveyTemplate`, `unlinkSurveyTemplate`
  - `addResponsibility`, `updateResponsibility`, `removeResponsibility`
- [ ] Register PMS module types/queries/mutations in `apps/api/src/graphql/schema.ts`
- [ ] Add RBAC rules: PMS access for Admin, RA Manager, Clinical Specialist
- [ ] Verify upstream dependency: mutation must check CER is locked before PMS Plan creation
- [ ] Write unit tests for PmsPlan domain entity (status transitions, validation)
- [ ] Write integration tests for create-pms-plan use case

### Frontend

- [ ] Create PMS feature directory structure:
  - `apps/web/src/features/pms/components/`
  - `apps/web/src/features/pms/hooks/`
  - `apps/web/src/features/pms/graphql/`
- [ ] Create PMS route pages:
  - `apps/web/src/routes/_authenticated/projects/$projectId/pms/index.tsx` — PMS module dashboard
  - `apps/web/src/routes/_authenticated/projects/$projectId/pms/$cycleId.tsx` — cycle detail
- [ ] Create GraphQL operations in `apps/web/src/features/pms/graphql/`:
  - `queries.ts` — pmsPlan, pmsPlans, pmsPlanVigilanceDatabases, pmsPlanResponsibilities
  - `mutations.ts` — createPmsPlan, updatePmsPlan, approvePmsPlan, activatePmsPlan, configureVigilanceDatabases, etc.
- [ ] Create `PmsPlanEditor.tsx` component:
  - Multi-step form (React Hook Form + Zod): Step 1 = General (frequency, methods), Step 2 = Vigilance DBs, Step 3 = Survey Templates, Step 4 = Responsibilities
  - Stepper horizontal pattern (consistent with project creation UX)
  - Auto-save at each step change
  - StatusBadge showing plan status (DRAFT/APPROVED/ACTIVE)
- [ ] Create `VigilanceDatabaseConfig.tsx` component:
  - Toggle per database (MAUDE, ANSM, BfArM, AFMPS)
  - Keyword input field per similar device linked from SOA
  - ag-Grid table for keyword management
- [ ] Create `ResponsibilitiesTable.tsx` component:
  - ag-Grid table: Activity Type, Responsible Person (user select), Role, Description
  - Inline editing
  - Add/Remove rows
- [ ] Create `PmsDashboard.tsx` component:
  - Plan status card with StatusBadge
  - Upcoming activities section
  - Quick metrics (active cycles, pending activities)
  - Action buttons: "Approve Plan" (if DRAFT), "Activate Plan" (if APPROVED)
- [ ] Create `SurveyTemplateLinker.tsx` component:
  - List of available templates
  - Link/unlink functionality
- [ ] Add PMS sidebar navigation items (consistent with other module sidebars)
- [ ] Connect PMS module to PipelineProgressBar (PMS node becomes "Active" when plan is created)
- [ ] Write component tests for PmsPlanEditor form validation

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4 (code-first GraphQL), Prisma 7.2
- **Frontend:** React 19, Vite, Apollo Client 3.x, TanStack Router, React Hook Form + Zod, ag-Grid 33, shadcn/ui + Tailwind CSS 4
- **Database:** PostgreSQL 16, multi-file Prisma schema (`packages/prisma/schema/pms.prisma`)
- **Async:** BullMQ 5.69 + Redis 7
- **Events:** RabbitMQ for domain events

### DDD Patterns

- Follow the established DDD structure: `domain/` (entities, value-objects, events) -> `application/` (use-cases, dtos) -> `infrastructure/` (repositories, services) -> `graphql/` (types, queries, mutations)
- Business logic goes in use cases, NOT in GraphQL resolvers
- Use domain error classes: `UpstreamNotLockedError`, `ValidationError`, `PermissionDeniedError`
- Emit domain events for significant state transitions via RabbitMQ event bus
- Domain event format: `DomainEvent<T>` with `{ eventType, aggregateId, aggregateType, data, metadata: { userId, timestamp, correlationId, version } }`
- Event naming: `pms.plan.created`, `pms.plan.approved`, `pms.plan.activated`

### Naming Conventions

- **Prisma models:** PascalCase (`PmsPlan`, `PmcfActivity`)
- **Prisma fields:** camelCase (`updateFrequency`, `projectId`)
- **Prisma enums:** PascalCase name, UPPER_SNAKE_CASE values (`enum PmsPlanStatus { DRAFT, APPROVED, ACTIVE }`)
- **GraphQL types:** PascalCase (`PmsPlan`, `PmcfActivity`)
- **GraphQL fields:** camelCase
- **GraphQL mutations:** camelCase, action+entity (`createPmsPlan`, `approvePmsPlan`)
- **TypeScript files:** kebab-case (`pms-plan.ts`, `create-pms-plan.ts`)
- **React components:** PascalCase (`PmsPlanEditor.tsx`, `PmsDashboard.tsx`)
- **Hooks:** `use-` prefix (`use-pms-plan.ts`)

### Database Schema Notes

- Use UUID v7 for all entity IDs (`crypto.randomUUID()`)
- Dates as ISO 8601 strings
- JSON fields for flexible data (dataCollectionMethods, templateContent, dataPoints, trends)
- Cross-module references via ID (not Prisma cross-schema relations): `cerVersionId` references CER module, `similarDeviceId` references SOA module
- Add indexes: `@@index([projectId, status])` on PmsPlan

### Upstream Dependency Check

- PMS Plan creation MUST verify that a CER version is locked for this project
- Query the CER module's repository (read-only cross-module read is allowed per architecture)
- If no locked CER exists, throw `UpstreamNotLockedError('CER version must be locked before creating PMS Plan')`

### Frontend Patterns

- Use Apollo Client for ALL GraphQL operations (not TanStack Query)
- Use `useSuspenseQuery` for route-level data loading
- Use Zustand only for UI state (sidebar, editor state), NOT for server state
- Auto-save via `use-auto-save.ts` hook (debounced Apollo mutation every 10s)
- Follow UX spec layout: dark sidebar (#0A3153) + topbar pipeline (56px) + work area (flex-1) + detail panel (380px, retractable) + statusbar (32px)
- Forms: labels above fields, inline validation, stepper for multi-step forms
- Loading: skeleton states (blue-100 animated pulse), never spinner without context
- Empty states: always include a CTA action

### Anti-Patterns to Avoid

- No `any` in TypeScript (use `unknown` + type guard)
- No `console.log` in production (use structured logger)
- No business logic in GraphQL resolvers (delegate to use cases)
- No server state in Zustand (Apollo Client only)
- No circular imports between bounded contexts (use events or `shared/`)
- No direct Prisma calls in resolvers (use repository layer)
- No manual audit logging (middleware handles it automatically)

### Project Structure Notes

```
apps/api/src/modules/pms/
  domain/
    entities/
      pms-plan.ts
      pmcf-plan.ts
      gap-registry.ts
      pms-cycle.ts
      pmcf-activity.ts
      complaint.ts
      trend-analysis.ts
    value-objects/
      plan-status.ts
      activity-type.ts
    events/
      pms-plan-created.ts
      pms-plan-approved.ts
      pms-plan-activated.ts
      cycle-completed.ts
  application/
    use-cases/
      create-pms-plan.ts
      update-pms-plan.ts
      approve-pms-plan.ts
      activate-pms-plan.ts
      configure-vigilance-databases.ts
      define-vigilance-keywords.ts
      link-survey-templates.ts
      manage-responsibilities.ts
    dtos/
      create-pms-plan.dto.ts
      update-pms-plan.dto.ts
  infrastructure/
    repositories/
      pms-plan-repository.ts
    services/
      zoho-desk-client.ts
  graphql/
    types.ts
    queries.ts
    mutations.ts

apps/web/src/features/pms/
  components/
    PmsPlanEditor.tsx
    PmsDashboard.tsx
    VigilanceDatabaseConfig.tsx
    ResponsibilitiesTable.tsx
    SurveyTemplateLinker.tsx
    GapRegistry.tsx
    CycleTimeline.tsx
    ActivityTracker.tsx
    ComplaintsDashboard.tsx
    TrendChart.tsx
    CerUpdateDecision.tsx
  hooks/
    use-pms-plan.ts
  graphql/
    queries.ts
    mutations.ts

apps/web/src/routes/_authenticated/projects/$projectId/pms/
  index.tsx
  $cycleId.tsx

packages/prisma/schema/pms.prisma
```

### References

- **PRD FRs:** FR59, FR59a, FR59b, FR59c, FR59d, FR59e
- **Architecture:** `apps/api/src/modules/pms/` (DDD structure), `packages/prisma/schema/pms.prisma`, domain events via RabbitMQ
- **UX Spec:** Dark sidebar navigation, stepper forms for multi-step config, StatusBadge component, pipeline progress bar PMS node, "Pas de cul-de-sac" principle
- **Dependencies:** Locked CER version (Epic 5), SOA Similar Device Registry (Epic 3 Story 3.9), User/RBAC system (Epic 1)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
