# Story 4.1: Validation Study Creation & SOA Linking

Status: done

## Story

As an RA Manager,
I want to create validation studies linked to SOA benchmarks with support for mini literature searches,
So that my validation study design is grounded in the state of the art.

## Acceptance Criteria

**Given** a locked SOA Device analysis with performance benchmarks
**When** the RA Manager creates a new validation study
**Then** they can select the study type: Standalone or MRMC (FR35)
**And** the study is linked to the SOA Device analysis with auto-imported benchmarks as acceptance criteria (FR36)
**And** for MRMC studies, a mini literature search (SLS session type ad_hoc) can be launched for methodology justification (FR35a)
**And** the mini literature search is linked to the validation study for traceability (FR35b)
**And** the Prisma schema for Validation entities is created (ValidationStudy, Protocol, DataImport, ResultsMapping, etc.)
**And** the Validation module dashboard shows study status and linked SOA benchmarks

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create Prisma schema file `validation.prisma`** (AC: Prisma schema for Validation entities)
  - [ ] T1.1: Define `ValidationStudy` model with fields: `id` (UUID v7), `projectId`, `type` (enum: STANDALONE, MRMC), `status` (enum: DRAFT, IN_PROGRESS, LOCKED), `soaAnalysisId`, `name`, `description`, `createdAt`, `updatedAt`, `lockedAt`, `lockedById`
  - [ ] T1.2: Define `Protocol` model with fields: `id`, `validationStudyId`, `version` (String, e.g. "1.0"), `summary`, `endpoints` (Json), `sampleSizeJustification`, `statisticalStrategy`, `status` (enum: DRAFT, APPROVED, AMENDED), `createdAt`, `updatedAt`
  - [ ] T1.3: Define `ProtocolAmendment` model with fields: `id`, `protocolId`, `fromVersion`, `toVersion`, `reason`, `changes` (Json), `createdAt`, `createdById`
  - [ ] T1.4: Define `DataImport` model with fields: `id`, `validationStudyId`, `version` (Int), `fileName`, `fileSize`, `status` (enum: PENDING, VALIDATED, ACTIVE, SUPERSEDED, ROLLED_BACK), `schemaErrors` (Json), `data` (Json), `uploadedById`, `createdAt`
  - [ ] T1.5: Define `ResultsMapping` model with fields: `id`, `validationStudyId`, `dataImportId`, `endpointName`, `resultValue` (Float), `benchmarkTarget` (Float), `benchmarkSource`, `status` (enum: MET, NOT_MET, PENDING), `createdAt`
  - [ ] T1.6: Define `GsprMapping` model with fields: `id`, `validationStudyId`, `gsprRequirementId`, `evidenceReference`, `status` (enum: COMPLIANT, PARTIAL, NOT_APPLICABLE), `justification`, `createdAt`
  - [ ] T1.7: Define `ValidationReport` model with fields: `id`, `validationStudyId`, `reportType` (enum: VALIDATION_REPORT, CLINICAL_BENEFIT, ALGORITHMIC_FAIRNESS, LABELING_VALIDATION, BENEFIT_QUANTIFICATION, PATCH_VALIDATION, FDA_18CVS), `status`, `filePath`, `generatedAt`, `generatedById`
  - [ ] T1.8: Define `MiniLiteratureSearch` model linking ValidationStudy to SlsSession (ad_hoc type)
  - [ ] T1.9: Add indexes: `@@index([projectId, status])`, `@@index([soaAnalysisId])`
  - [ ] T1.10: Run `prisma migrate dev` to apply schema

- [ ] **T2: Create domain entities and value objects** (AC: study type selection)
  - [ ] T2.1: Create `apps/api/src/modules/validation/domain/entities/validation-study.ts` with business logic (create, link SOA, lock, status transitions)
  - [ ] T2.2: Create `apps/api/src/modules/validation/domain/value-objects/study-type.ts` (STANDALONE, MRMC enum)
  - [ ] T2.3: Create `apps/api/src/modules/validation/domain/value-objects/protocol-version.ts`
  - [ ] T2.4: Create `apps/api/src/modules/validation/domain/events/validation-locked.ts` implementing `DomainEvent<T>` format

- [ ] **T3: Create use cases** (AC: study creation, SOA linking, mini SLS)
  - [ ] T3.1: Create `apps/api/src/modules/validation/application/use-cases/create-study.ts` — validates SOA is locked, creates study with type, links to SOA analysis
  - [ ] T3.2: Create `apps/api/src/modules/validation/application/use-cases/link-soa-benchmarks.ts` — auto-imports benchmarks from SOA Device analysis as acceptance criteria
  - [ ] T3.3: Create DTO schemas in `apps/api/src/modules/validation/application/dtos/` with Zod validation (CreateStudyInput, LinkSoaBenchmarksInput)
  - [ ] T3.4: Implement upstream dependency check: SOA Device analysis must be LOCKED (throw `UpstreamNotLockedError` if not)

- [ ] **T4: Create repository layer** (AC: data persistence)
  - [ ] T4.1: Create `apps/api/src/modules/validation/infrastructure/repositories/validation-study-repository.ts` (Prisma-based, never direct Prisma calls in resolvers)
  - [ ] T4.2: Implement `findById`, `findByProjectId`, `create`, `save`, `findWithBenchmarks` methods

- [ ] **T5: Create GraphQL layer** (AC: API exposure)
  - [ ] T5.1: Create `apps/api/src/modules/validation/graphql/types.ts` — Pothos types for ValidationStudy, Protocol, DataImport, ResultsMapping, GsprMapping
  - [ ] T5.2: Create `apps/api/src/modules/validation/graphql/queries.ts` — `validationStudy(id)`, `validationStudies(projectId, filter)`
  - [ ] T5.3: Create `apps/api/src/modules/validation/graphql/mutations.ts` — `createValidationStudy`, `linkSoaBenchmarks`, `launchMiniLiteratureSearch`
  - [ ] T5.4: Register types in `apps/api/src/graphql/schema.ts`
  - [ ] T5.5: Apply RBAC middleware: Validation access for Admin, RA Manager, Data Science roles only

- [ ] **T6: Implement mini literature search linking** (AC: mini SLS for MRMC)
  - [ ] T6.1: When MRMC study is created, enable mutation to create an SLS session with type `ad_hoc` linked to the validation study
  - [ ] T6.2: Store link in `MiniLiteratureSearch` table for traceability (FR35b)

### Frontend Tasks

- [ ] **T7: Create Validation module route structure** (AC: module dashboard)
  - [ ] T7.1: Create `apps/web/src/routes/_authenticated/$projectId/validation-studies/index.tsx` — list view
  - [ ] T7.2: Create `apps/web/src/routes/_authenticated/$projectId/validation-studies/$studyId.tsx` — study detail view
  - [ ] T7.3: Register routes in TanStack Router configuration

- [ ] **T8: Create StudyConfigurator component** (AC: study type selection, SOA linking)
  - [ ] T8.1: Create `apps/web/src/features/validation/components/StudyConfigurator.tsx` — form for creating a new validation study
  - [ ] T8.2: Implement study type selector (Standalone / MRMC) with visual distinction
  - [ ] T8.3: Implement SOA Device analysis selector (only show locked SOA analyses)
  - [ ] T8.4: Display auto-imported benchmarks as acceptance criteria after SOA linking
  - [ ] T8.5: For MRMC studies, show "Launch Mini Literature Search" button (FR35a)

- [ ] **T9: Create Validation module dashboard** (AC: study status and benchmarks display)
  - [ ] T9.1: Create `apps/web/src/features/validation/components/ValidationDashboard.tsx`
  - [ ] T9.2: Display study status with StatusBadge component
  - [ ] T9.3: Display linked SOA benchmarks in a comparison table
  - [ ] T9.4: Show pipeline integration (study is in Validation node of PipelineProgressBar)
  - [ ] T9.5: Show mini literature search link for MRMC studies with traceability indicator

- [ ] **T10: Create GraphQL operations** (AC: data fetching)
  - [ ] T10.1: Create `apps/web/src/features/validation/graphql/queries.ts` — validation study queries
  - [ ] T10.2: Create `apps/web/src/features/validation/graphql/mutations.ts` — create study, link SOA mutations
  - [ ] T10.3: Use Apollo Client for all GraphQL operations (not TanStack Query)

### Testing Tasks

- [ ] **T11: Write backend tests**
  - [ ] T11.1: Unit test `create-study.ts` use case — validates SOA locked, creates study, links benchmarks
  - [ ] T11.2: Unit test upstream dependency check — throws `UpstreamNotLockedError` when SOA not locked
  - [ ] T11.3: Unit test validation study entity business logic
  - [ ] T11.4: Integration test GraphQL mutations for study creation

- [ ] **T12: Write frontend tests**
  - [ ] T12.1: Component test for StudyConfigurator — renders type selector, SOA linking
  - [ ] T12.2: Component test for ValidationDashboard — displays study status and benchmarks

## Dev Notes

### Technology Stack (Exact Versions)

- **Backend:** Fastify 5.7.x, Apollo Server 4 with `@as-integrations/fastify` 3.1.0, Prisma 7.2.x, Node.js 20 LTS+
- **Frontend:** React 19.x, TanStack Router 1.159.x, Apollo Client 3.x, Zustand 5.x, Tailwind CSS 4.x, shadcn/ui
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **GraphQL Schema:** Code-first with Pothos (`@pothos/core` v4 + `@pothos/plugin-prisma`)
- **Validation:** Zod 3.x at API boundaries

### DDD Patterns

- **Bounded Context:** Validation Management (`apps/api/src/modules/validation/`)
- **Domain Layer:** `domain/entities/`, `domain/value-objects/`, `domain/events/`
- **Application Layer:** `application/use-cases/`, `application/dtos/`
- **Infrastructure Layer:** `infrastructure/repositories/`, `infrastructure/services/`
- **GraphQL Layer:** `graphql/types.ts`, `graphql/queries.ts`, `graphql/mutations.ts`
- **No business logic in resolvers** — always delegate to use cases
- **No direct Prisma calls in resolvers** — go through repository layer
- **Cross-module communication:** via domain events (RabbitMQ), not direct calls. Exception: read-only queries of other modules' repositories are allowed.

### Naming Conventions

- **Prisma models:** PascalCase — `ValidationStudy`, `Protocol`, `DataImport`
- **Prisma columns:** camelCase — `validationStudyId`, `protocolVersion`, `soaAnalysisId`
- **Prisma enums:** PascalCase name, UPPER_SNAKE_CASE values — `enum StudyType { STANDALONE, MRMC }`
- **GraphQL types:** PascalCase — `type ValidationStudy`
- **GraphQL mutations:** camelCase, action + entity — `createValidationStudy`, `linkSoaBenchmarks`
- **GraphQL error codes:** UPPER_SNAKE_CASE — `UPSTREAM_NOT_LOCKED`, `VALIDATION_ERROR`
- **Files:** kebab-case — `validation-study.ts`, `create-study.ts`
- **React components:** PascalCase — `StudyConfigurator.tsx`, `ValidationDashboard.tsx`
- **Hooks:** `use-` prefix — `use-validation-study.ts`
- **Routes:** kebab-case — `/projects/:projectId/validation-studies/:studyId`
- **Entity IDs:** UUID v7 — `crypto.randomUUID()`
- **Dates:** ISO 8601 — `2026-02-14T14:30:00.000Z`

### Database Schema Notes

- Multi-file Prisma schema: `packages/prisma/schema/validation.prisma`
- Uses `prismaSchemaFolder` feature of Prisma 7.2+
- Cross-module references via ID (not Prisma cross-schema relations): `soaAnalysisId` references SOA module
- Generates single unified Prisma client from all schema files

### RBAC Rules

- **Validation module access:** Admin, RA Manager, Data Science
- **Study creation:** Admin, RA Manager only
- **Enforce at GraphQL resolver level** (not just UI hiding)
- **Permissions checked across 3 axes:** role x module x document status
- **Locked studies:** read-only for all users except Admin (who can unlock with audit trail justification)

### Error Handling

- Use typed `DomainError` subclasses: `UpstreamNotLockedError`, `NotFoundError`, `LockConflictError`, `PermissionDeniedError`, `ValidationError`
- Never `throw new Error()` raw
- Domain errors are caught by GraphQL error handler and returned as typed GraphQL errors

### Audit Trail

- **Automatic** via `apps/api/src/shared/middleware/audit-middleware.ts`
- Every GraphQL mutation is automatically logged: userId, action, targetType, targetId, before state, after state, timestamp
- Do NOT manually log audit entries in use cases

### UX Design Notes

- **Layout:** Dark sidebar (#0A3153) + topbar pipeline (56px) + work area (flex-1) + detail panel (380px retractable) + statusbar (32px)
- **Validation module sidebar:** Shows study list with status badges
- **Study creation form:** Multi-step stepper pattern (consistent with project creation)
- **SOA benchmarks display:** ag-Grid table with color-coded status (met/not met)
- **StatusBadge variants:** draft, screening, uncertain, include, exclude, locked, completed
- **Design tokens:** All from `packages/config-tailwind/tailwind.config.ts`
- **Cortex Blue primary:** #0F4C81
- **Desktop-first:** minimum 1280px viewport

### Anti-Patterns to Avoid

- `any` in TypeScript — use `unknown` + type guard
- `console.log` in production — use structured logger
- Business logic in GraphQL resolvers — delegate to use cases
- Server state in Zustand — Apollo Client for all GraphQL server state
- Circular imports between bounded contexts — use events or `shared/`
- Direct Prisma calls in resolvers — go through repository layer
- Inline SQL — use Prisma query builder only

### Project Structure Notes

```
apps/api/src/modules/validation/
  domain/
    entities/
      validation-study.ts
      protocol.ts
      data-import.ts
      results-mapping.ts
      gspr-mapping.ts
    value-objects/
      study-type.ts
      protocol-version.ts
    events/
      validation-locked.ts
  application/
    use-cases/
      create-study.ts
      link-soa-benchmarks.ts
      define-protocol.ts
      import-xls.ts
      manage-import-versions.ts
      map-results.ts
      generate-reports.ts
      lock-validation.ts
    dtos/
  infrastructure/
    repositories/
      validation-study-repository.ts
    services/
      xls-parser-service.ts
  graphql/
    types.ts
    queries.ts
    mutations.ts

apps/web/src/features/validation/
  components/
    StudyConfigurator.tsx
    ProtocolEditor.tsx
    XlsImporter.tsx
    ImportVersionDiff.tsx
    ResultsMapping.tsx
    GsprMapping.tsx
  hooks/
  graphql/
    queries.ts
    mutations.ts

apps/web/src/routes/_authenticated/$projectId/validation-studies/
  index.tsx
  $studyId.tsx

packages/prisma/schema/validation.prisma
```

### References

- **Epics:** `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md` — Validation module structure, DDD patterns, naming conventions
- **UX Design:** `_bmad-output/planning-artifacts/ux-design-specification.md` — Layout, design tokens, component strategy
- **FRs covered:** FR35, FR35a, FR35b, FR36

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `/Users/cyril/Documents/dev/cortex-clinical-affairs/packages/prisma/schema/validation.prisma`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/api/src/modules/validation/domain/entities/validation-study.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/api/src/modules/validation/domain/value-objects/study-type.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/api/src/modules/validation/application/use-cases/create-study.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/api/src/modules/validation/graphql/types.ts`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/web/src/features/validation/components/StudyConfigurator.tsx`
- `/Users/cyril/Documents/dev/cortex-clinical-affairs/apps/web/src/features/validation/components/ValidationDashboard.tsx`

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (Automated)
**Date:** 2026-02-16
**Outcome:** Changes Requested

### AC Verification

- [x] **Study type selection (STANDALONE, MRMC)** — Implemented in `study-type.ts` with proper enum validation. `StudyConfigurator.tsx` provides UI selector.
- [x] **SOA linking with auto-imported benchmarks** — `create-study.ts` validates SOA is LOCKED and calls `LinkSoaBenchmarksUseCase` to auto-import benchmarks. Creates `AcceptanceCriterion` records.
- [!] **Mini literature search for MRMC studies** — Schema includes `MiniLiteratureSearch` reference but no use case implementation found for launching SLS sessions. Frontend UI for "Launch Mini Literature Search" not verified in components.
- [x] **Prisma schema for Validation entities** — `validation.prisma` defines all required models: `ValidationStudy`, `Protocol`, `ProtocolAmendment`, `DataImport`, `AcceptanceCriterion`, `GsprMapping`, `ResultsMapping`, `ValidationResult`. Proper indexes on `projectId`, `status`.
- [x] **Validation module dashboard** — `ValidationDashboard.tsx` displays study status with linked SOA benchmarks.
- [x] **Upstream dependency check** — `create-study.ts` line 46-57 validates SOA exists and status is LOCKED, throws proper error if not.

### Test Coverage

- Unit tests present for:
  - `validation-study.test.ts` — Entity business logic
  - `study-type.test.ts` — Value object validation
  - `create-study.test.ts` — Use case with SOA lock check
- Frontend tests:
  - `StudyConfigurator.test.tsx` — Component rendering
  - `ValidationDashboard.test.tsx` — Dashboard display
- **Test count**: 22 validation test files found
- **Gap**: No integration test for mini literature search linking (FR35a, FR35b)

### Code Quality Notes

**Strengths:**

- Excellent DDD structure: entities, value objects, use cases properly separated
- Proper error handling with typed errors (`NotFoundError`, `ValidationError`)
- UUID v7 generation using `crypto.randomUUID()`
- Clean separation between domain logic and infrastructure
- GraphQL types follow Pothos pattern correctly with `objectRef` + `objectType`
- All `.ts` imports use `.js` extension (NodeNext module resolution)

**Issues:**

1. **Prisma schema deviation**: AC specifies `status` enum should be `DRAFT, IN_PROGRESS, LOCKED` but implementation only has `DRAFT, LOCKED` (missing `IN_PROGRESS`)
2. **Mini SLS linking incomplete**: No mutation or use case found for `launchMiniLiteratureSearch` despite being in AC and tasks
3. **MiniLiteratureSearch model**: Schema mentions it but model not defined in `validation.prisma`

### Security Notes

- Proper RBAC enforcement expected at GraphQL resolver level (mentioned in dev notes)
- User IDs properly tracked in `createdById` fields
- No SQL injection risk (using Prisma ORM)
- Upstream validation prevents creating studies with unlocked SOA (good security boundary)

### Verdict

**Changes Requested** — Core functionality is solid but AC gaps exist:

1. **Critical**: Implement mini literature search linking for MRMC studies (FR35a, FR35b)
   - Add `launchMiniLiteratureSearch` mutation in GraphQL layer
   - Create use case to link SLS session with validation study
   - Add `MiniLiteratureSearch` model to Prisma schema or document cross-reference pattern

2. **Medium**: Fix Prisma status enum to include `IN_PROGRESS` state as per AC

3. **Minor**: Add integration test for end-to-end study creation with SOA benchmark import

Once these gaps are addressed, approve for production.

---

### Change Log

- 2026-02-16: Initial automated senior developer review completed
