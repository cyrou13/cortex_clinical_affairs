# Story 2.1: SLS Session Creation & Configuration

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to create SLS sessions with configurable types and scope fields linked to my project's CEP,
So that I can organize my literature searches by purpose (FR3, FR7a, FR7b).

## Acceptance Criteria

**Given** a project with a configured CEP
**When** the Clinical Specialist creates a new SLS session
**Then** they can select a session type: soa_clinical, soa_device, similar_device, pms_update, ad_hoc
**And** the system displays different scope fields based on the selected session type (FR7b)
**And** the session is linked to the project's CEP (FR3)
**And** the SLS module sidebar shows the list of sessions with their status
**And** the session dashboard shows the current state (articles count, screening progress)
**And** the Prisma schema for SLS entities is created (SlsSession, Query, Article, etc.)
**And** the SLS module uses the dark sidebar navigation pattern from the UX spec

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create SLS Prisma schema** (`packages/prisma/schema/sls.prisma`)
  - Define `SlsSession` model: id (UUID v7), projectId, cepId, name, type (enum), status (enum), scopeFields (Json), createdById, createdAt, updatedAt, lockedAt
  - Define `SlsSessionType` enum: `SOA_CLINICAL`, `SOA_DEVICE`, `SIMILAR_DEVICE`, `PMS_UPDATE`, `AD_HOC`
  - Define `SlsSessionStatus` enum: `DRAFT`, `SCREENING`, `LOCKED`
  - Define `Query` model: id, sessionId, queryString, version, isActive, createdAt, updatedAt
  - Define `Article` model: id, title, abstract, authors (Json), doi, pmid, publicationDate, journal, sourceDatabase, status (enum), relevanceScore, aiExclusionCode, customFilterScore, createdAt, updatedAt
  - Define `ArticleStatus` enum: `PENDING`, `SCORED`, `INCLUDED`, `EXCLUDED`, `SKIPPED`, `FULL_TEXT_REVIEW`, `FINAL_INCLUDED`, `FINAL_EXCLUDED`
  - Define `ArticleQueryLink` model: id, articleId, queryId, executionId, sourceDatabase
  - Define `QueryExecution` model: id, queryId, database, status, articlesFound, articlesImported, executedAt, reproducibilityStatement
  - Define `ScreeningDecision` model: id, articleId, userId, decision, exclusionCodeId, reason, timestamp
  - Define `ExclusionCode` model: id, projectId, code, label, shortCode, isHidden, displayOrder
  - Run `prisma migrate dev` to generate migration
  - **(AC: Prisma schema for SLS entities is created)**

- [ ] **T2: Create SLS domain entities** (`apps/api/src/modules/sls/domain/entities/`)
  - Create `sls-session.ts` entity with type-safe properties and business methods
  - Create `apps/api/src/modules/sls/domain/value-objects/session-status.ts`
  - Create `apps/api/src/modules/sls/domain/value-objects/session-type.ts` with scope field definitions per type
  - **(AC: Different scope fields based on session type)**

- [ ] **T3: Create SLS repository** (`apps/api/src/modules/sls/infrastructure/repositories/sls-session-repository.ts`)
  - Implement `findById`, `findByProjectId`, `create`, `update` methods
  - Use Prisma client from `packages/prisma`
  - **(AC: Session linked to CEP)**

- [ ] **T4: Create use case** (`apps/api/src/modules/sls/application/use-cases/create-session.ts`)
  - Validate project exists and has configured CEP
  - Validate session type is valid
  - Generate UUID v7 for session ID
  - Set initial status to `DRAFT`
  - Map scope fields based on session type
  - Emit domain event `sls.session.created`
  - **(AC: Session linked to CEP, session type selection)**

- [ ] **T5: Create scope field definitions per session type**
  - `soa_clinical`: indication, population, intervention, comparator, outcomes (PICO framework)
  - `soa_device`: device name, device class, intended purpose, key performance endpoints
  - `similar_device`: device category, equivalence criteria, search databases
  - `pms_update`: date range, update scope, previous SLS reference
  - `ad_hoc`: freeform description, search objective
  - **(AC: Different scope fields based on selected session type)**

- [ ] **T6: Create GraphQL types and resolvers** (`apps/api/src/modules/sls/graphql/`)
  - `types.ts`: Define Pothos types for SlsSession, SlsSessionType, SlsSessionStatus
  - `queries.ts`: `slsSession(id)`, `slsSessions(projectId, filter)`
  - `mutations.ts`: `createSlsSession(input)`, `updateSlsSession(id, input)`
  - Apply RBAC middleware: Admin, RA Manager, Clinical Specialist
  - **(AC: Session CRUD operations)**

- [ ] **T7: Create DTOs and Zod validation schemas**
  - `apps/api/src/modules/sls/application/dtos/create-session.dto.ts`
  - `packages/shared/src/schemas/sls-session.schema.ts` (shared Zod schemas)
  - Validate input at GraphQL boundary
  - **(AC: Input validation)**

### Frontend Tasks

- [ ] **T8: Create SLS route pages** (`apps/web/src/routes/_authenticated/projects/$projectId/sls-sessions/`)
  - `index.tsx`: Sessions list page
  - `$sessionId.tsx`: Session detail page
  - Configure TanStack Router type-safe routes
  - **(AC: SLS module navigation)**

- [ ] **T9: Create SLS sidebar navigation** (`apps/web/src/features/sls/components/`)
  - Create `SlsSidebar.tsx` component showing list of sessions with StatusBadge
  - Dark sidebar (#0A3153) following UX spec
  - Active session highlighted with blue-100 background
  - Session count badge
  - "+ New Session" button at top
  - **(AC: SLS module sidebar shows list of sessions with status)**

- [ ] **T10: Create session creation form** (`apps/web/src/features/sls/components/SessionCreateForm.tsx`)
  - Session type selector (radio group or select)
  - Dynamic scope fields based on selected type
  - Form built with React Hook Form + Zod resolver
  - Labels above fields, inline validation per UX spec
  - Auto-save on step change
  - **(AC: Session type selection, different scope fields)**

- [ ] **T11: Create session dashboard** (`apps/web/src/features/sls/components/SessionDashboard.tsx`)
  - Show session name, type, status (StatusBadge)
  - Show articles count, screening progress metrics
  - Show scope fields summary
  - Cards with shadow-sm per UX spec
  - **(AC: Session dashboard shows current state)**

- [ ] **T12: Create GraphQL queries and mutations** (`apps/web/src/features/sls/graphql/`)
  - `queries.ts`: Session list query, session detail query
  - `mutations.ts`: Create session mutation, update session mutation
  - Use Apollo Client hooks
  - **(AC: Frontend-backend integration)**

### Testing Tasks

- [ ] **T13: Write unit tests for create-session use case**
  - Test valid session creation for each type
  - Test scope fields mapping per type
  - Test validation failures (no CEP, invalid type)
  - Co-located: `create-session.test.ts`

- [ ] **T14: Write integration test for SLS session GraphQL**
  - Test createSlsSession mutation
  - Test slsSessions query with filters
  - Test RBAC enforcement

## Dev Notes

### Tech Stack (Exact Versions)

- **Backend**: Fastify 5.7, Apollo Server 4 (`@as-integrations/fastify` 3.1.0), Prisma 7.2, Node.js 20 LTS+
- **Frontend**: React 19, Vite, TanStack Router 1.159.x, Apollo Client 3.x, Zustand 5, Tailwind CSS 4
- **GraphQL Schema**: Pothos v4 (`@pothos/core` + `@pothos/plugin-prisma`) — code-first
- **Validation**: Zod 3.x at boundaries only
- **Forms**: React Hook Form + `@hookform/resolvers` + Zod
- **Components**: shadcn/ui + Lucide Icons
- **IDs**: UUID v7 via `crypto.randomUUID()`
- **Dates**: ISO 8601 strings everywhere

### Architecture Patterns

**DDD Structure (Backend)**:

- `domain/` — Entities, Value Objects, Domain Events (pure business logic, no infrastructure)
- `application/` — Use Cases, DTOs (orchestration layer)
- `infrastructure/` — Repository implementations, external services (Prisma calls here)
- `graphql/` — Pothos types, queries, mutations (thin layer, delegates to use cases)

**Key Rules**:

- Business logic in use cases, NOT in GraphQL resolvers
- Repository pattern: resolvers never call Prisma directly
- Domain errors: use `NotFoundError`, `ValidationError` etc. (never raw `throw new Error()`)
- Audit trail: automatic via middleware (do NOT manually log)
- Domain events: emit `sls.session.created` via RabbitMQ using `DomainEvent<T>` format
- Zod validation at GraphQL input boundary only

**Frontend Patterns**:

- Apollo Client for ALL GraphQL operations (not TanStack Query)
- TanStack Query only for non-GraphQL operations (file uploads, health checks)
- Zustand for UI state only (sidebar collapsed, active panel) — no server state
- Skeleton loading states, optimistic updates
- Design tokens from `packages/config-tailwind`

### Naming Conventions

- **Prisma models**: PascalCase (`SlsSession`, `ArticleQueryLink`)
- **Prisma enums**: PascalCase name, UPPER_SNAKE_CASE values (`enum SlsSessionType { SOA_CLINICAL }`)
- **GraphQL types**: PascalCase (`type SlsSession`)
- **GraphQL mutations**: camelCase action+entity (`createSlsSession`)
- **TypeScript files**: kebab-case (`sls-session.ts`, `create-session.ts`)
- **React components**: PascalCase.tsx (`SessionDashboard.tsx`)
- **Hooks**: `use-` prefix kebab-case (`use-sls-sessions.ts`)
- **Routes**: kebab-case URLs (`/projects/:projectId/sls-sessions/:sessionId`)
- **Domain events**: `module.aggregate.action` (`sls.session.created`)

### UX Design Specifications

- **Sidebar**: Dark (#0A3153), icons + short labels, active item in blue-100 (#E1EDF8), collapsible to 64px
- **Layout**: Topbar pipeline (56px) + Sidebar (240px) + Work area (flex-1) + Detail panel (380px) + Statusbar (32px)
- **Cards**: shadow-sm, no border, white bg on #F8F9FA page background
- **StatusBadge**: draft = Blue-100/Blue-700, screening = Info-100/Info-700, locked = Blue-800/White
- **Forms**: Labels above fields (14px semi-bold), inline validation, placeholder as hint
- **Colors**: Cortex Blue #0F4C81, bg-primary #FFFFFF, bg-secondary #F8F9FA, bg-tertiary #ECF0F1
- **Typography**: Inter font, text-sm 14px for sidebar and grid, text-base 16px for body

### Database Schema Details

The `sls.prisma` file defines the core SLS bounded context. Cross-module relations use ID references (e.g., `projectId String` referencing Project model in `project.prisma`), not Prisma cross-schema relations.

Key indexes to define:

- `@@index([projectId, status])` on SlsSession
- `@@index([sessionId])` on Query
- `@@index([doi])` and `@@index([pmid])` on Article for deduplication
- `@@index([articleId, queryId])` on ArticleQueryLink

### Anti-Patterns to Avoid

- `any` in TypeScript — use `unknown` + type guard
- `console.log` — use structured logger
- Business logic in resolvers — delegate to use cases
- Server state in Zustand — Apollo Client only
- Circular imports between bounded contexts — use events or `shared/`
- Direct Prisma calls in resolvers — go through repository
- Inline SQL — Prisma query builder only
- Raw `throw new Error()` — use domain error classes

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (NEW)
- `apps/api/src/modules/sls/domain/entities/sls-session.ts` (NEW)
- `apps/api/src/modules/sls/domain/value-objects/session-status.ts` (NEW)
- `apps/api/src/modules/sls/domain/value-objects/session-type.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/create-session.ts` (NEW)
- `apps/api/src/modules/sls/application/dtos/create-session.dto.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/repositories/sls-session-repository.ts` (NEW)
- `apps/api/src/modules/sls/graphql/types.ts` (NEW)
- `apps/api/src/modules/sls/graphql/queries.ts` (NEW)
- `apps/api/src/modules/sls/graphql/mutations.ts` (NEW)
- `apps/api/src/graphql/schema.ts` (MODIFY — register SLS module types)

**Frontend files to create/modify:**

- `apps/web/src/routes/_authenticated/projects/$projectId/sls-sessions/index.tsx` (NEW)
- `apps/web/src/routes/_authenticated/projects/$projectId/sls-sessions/$sessionId.tsx` (NEW)
- `apps/web/src/features/sls/components/SlsSidebar.tsx` (NEW)
- `apps/web/src/features/sls/components/SessionCreateForm.tsx` (NEW)
- `apps/web/src/features/sls/components/SessionDashboard.tsx` (NEW)
- `apps/web/src/features/sls/graphql/queries.ts` (NEW)
- `apps/web/src/features/sls/graphql/mutations.ts` (NEW)

**Shared files to create/modify:**

- `packages/shared/src/schemas/sls-session.schema.ts` (NEW)
- `packages/shared/src/types/domain-event.ts` (may already exist from Epic 1)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.1)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
