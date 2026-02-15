# Story 5.1: CER Creation, Configuration & Upstream Module Linking

Status: ready-for-dev

## Story

As an RA Manager,
I want to create a CER linked to all locked upstream modules with regulatory context configuration,
So that the CER assembly has access to all evidence data.

## Acceptance Criteria

**Given** locked SLS, SOA, and Validation modules
**When** the RA Manager creates a new CER
**Then** they can set the regulatory context: CE-MDR primary, FDA 510(k) parallel (FR45)
**And** the CER links to locked upstream modules: SLS sessions, SOA analyses, Validation studies (FR46)
**And** only locked upstream modules are available for linking
**And** external documents can be referenced with summary: Risk Management, Usability, IFU (FR47)
**And** the Prisma schema for CER entities is created (CerVersion, CerSection, ClaimTrace, GsprMatrix, BenefitRisk, CrossReference, BibliographyEntry, PccpDeviation, Evaluator)
**And** the CER dashboard shows: linked upstream modules, section completion status, traceability coverage

## Tasks / Subtasks

### Backend

- [ ] Create Prisma schema file `packages/prisma/schema/cer.prisma` with all CER entities:
  - `CerVersion` (id, projectId, versionType, versionNumber, regulatoryContext, status, createdAt, updatedAt, lockedAt, lockedById, snapshotChecksum)
  - `CerSection` (id, cerVersionId, sectionNumber, title, content, status, aiDraftContent, humanEditedContent, createdAt, updatedAt)
  - `ClaimTrace` (id, cerSectionId, claimText, soaSectionId, validationStudyId, articleId, slsQueryId, verified)
  - `GsprMatrix` (id, cerVersionId, gsprNumber, requirement, status, evidenceReference, notes)
  - `BenefitRisk` (id, cerVersionId, benefits, risks, mitigationMeasures, conclusion)
  - `CrossReference` (id, cerVersionId, refType, refNumber, targetType, targetId, label)
  - `BibliographyEntry` (id, cerVersionId, articleId, citationText, citationStyle, orderIndex)
  - `PccpDeviation` (id, cerVersionId, description, significance, justification, impactedSections)
  - `Evaluator` (id, cerVersionId, userId, role, sectionId, cvFileUrl, coiDeclaration, signedAt)
  - `ExternalDocument` (id, cerVersionId, title, version, date, summary, documentType, filePath)
  - `CerUpstreamLink` (id, cerVersionId, moduleType, moduleId, lockedAt, snapshotData)
- [ ] Create enums in `cer.prisma`:
  - `enum CerVersionType { INITIAL, ANNUAL_UPDATE, PATCH_UPDATE }`
  - `enum CerStatus { DRAFT, IN_PROGRESS, REVIEW, FINALIZED, LOCKED }`
  - `enum CerSectionStatus { DRAFT, REVIEWED, FINALIZED }`
  - `enum RegulatoryContext { CE_MDR, FDA_510K, DUAL }`
  - `enum EvaluatorRole { WRITTEN_BY, VERIFIED_BY, APPROVED_BY }`
  - `enum ExternalDocType { RISK_MANAGEMENT, USABILITY, IFU, LABELING, OTHER }`
  - `enum GsprStatus { COMPLIANT, PARTIAL, NOT_APPLICABLE }`
  - `enum DeviationSignificance { LOW, MEDIUM, HIGH, CRITICAL }`
- [ ] Run `prisma migrate dev` to create CER tables
- [ ] Create domain entities in `apps/api/src/modules/cer/domain/entities/`:
  - `cer-version.ts`
  - `cer-section.ts`
  - `external-document.ts`
  - `claim-trace.ts`
- [ ] Create value objects in `apps/api/src/modules/cer/domain/value-objects/`:
  - `cer-status.ts`
  - `version-type.ts`
  - `regulatory-context.ts`
- [ ] Create domain events in `apps/api/src/modules/cer/domain/events/`:
  - `cer-created.ts` (eventType: `cer.version.created`)
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/create-cer.ts`:
  - Validate all upstream modules are locked (SLS, SOA, Validation)
  - Throw `UpstreamNotLockedError` if any upstream module is not locked
  - Create CerVersion with regulatory context
  - Create CerUpstreamLink records for each linked module
  - Emit domain event `cer.version.created`
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/link-upstream.ts`:
  - Link locked SLS sessions, SOA analyses, Validation studies to CER
  - Only accept modules with status `LOCKED`
  - Store snapshot reference (module ID + locked timestamp)
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/manage-external-docs.ts`:
  - CRUD operations for ExternalDocument
  - Validate required fields (title, version, documentType)
- [ ] Create repository `apps/api/src/modules/cer/infrastructure/repositories/cer-repository.ts`
- [ ] Create Pothos GraphQL types in `apps/api/src/modules/cer/graphql/types.ts`:
  - CerVersion type with relations
  - CerSection type
  - ExternalDocument type
  - CerUpstreamLink type
  - CerDashboard type (computed: linkedModules, sectionCompletion, traceabilityCoverage)
- [ ] Create GraphQL queries in `apps/api/src/modules/cer/graphql/queries.ts`:
  - `cerVersion(id: UUID!)` - get CER version by ID
  - `cerVersions(projectId: UUID!)` - list CER versions for project
  - `cerDashboard(cerVersionId: UUID!)` - dashboard data
- [ ] Create GraphQL mutations in `apps/api/src/modules/cer/graphql/mutations.ts`:
  - `createCer(input: CreateCerInput!)` - create new CER version
  - `linkUpstreamModule(input: LinkUpstreamInput!)` - link upstream module
  - `addExternalDocument(input: AddExternalDocInput!)` - add external doc
  - `updateExternalDocument(input: UpdateExternalDocInput!)` - update external doc
  - `removeExternalDocument(id: UUID!)` - remove external doc
- [ ] Register CER module types/queries/mutations in `apps/api/src/graphql/schema.ts`
- [ ] Add RBAC rules for CER module: Admin + RA Manager (write), Clinical Specialist (read-only)
- [ ] Write unit tests for `create-cer.ts` use case
- [ ] Write unit tests for `link-upstream.ts` use case

### Frontend

- [ ] Create CER feature directory structure:
  - `apps/web/src/features/cer/components/`
  - `apps/web/src/features/cer/hooks/`
  - `apps/web/src/features/cer/graphql/`
- [ ] Create GraphQL operations in `apps/web/src/features/cer/graphql/`:
  - `queries.ts` - cerVersion, cerVersions, cerDashboard queries
  - `mutations.ts` - createCer, linkUpstreamModule, addExternalDocument mutations
  - `fragments.ts` - CerVersionFragment, CerSectionFragment
- [ ] Create route pages:
  - `apps/web/src/routes/_authenticated/projects/$projectId/cer-versions/index.tsx` - CER versions list
  - `apps/web/src/routes/_authenticated/projects/$projectId/cer-versions/$versionId.tsx` - CER version detail
- [ ] Create `CerCreationForm.tsx` component:
  - Step 1: Regulatory context selection (CE-MDR / FDA 510(k) / Dual)
  - Step 2: Upstream module linking (show only locked modules with lock icon + date)
  - Step 3: External document references (title, version, type, summary)
  - Stepper horizontal pattern consistent with project creation
  - Auto-save at each step change
- [ ] Create `CerDashboard.tsx` component:
  - Linked upstream modules section with StatusBadge (locked)
  - Section completion grid (14 sections, status per section)
  - Traceability coverage percentage metric (Stripe-style large number)
  - External documents list
- [ ] Create `UpstreamModuleSelector.tsx` component:
  - List available locked SLS sessions, SOA analyses, Validation studies
  - Show lock date and article/section/study counts
  - Disabled items for non-locked modules with tooltip "Module not locked"
- [ ] Create `ExternalDocumentList.tsx` component:
  - ag-Grid table with columns: title, type, version, date, summary
  - Add/Edit/Remove actions
  - Inline editing for summary field
- [ ] Update PipelineProgressBar to highlight CER node as active when in CER module
- [ ] Update sidebar navigation for CER module items

## Dev Notes

### Technology Stack

- **Backend**: Fastify 5.7, Apollo Server 4 with Pothos (code-first GraphQL), Prisma 7.2 (PostgreSQL 16)
- **Frontend**: React 19, Vite, Apollo Client 3.x, TanStack Router 1.159.x, Zustand 5, Tailwind CSS 4, shadcn/ui
- **Data Grid**: ag-Grid Enterprise 33
- **Rich Text Editor**: Plate (Slate-based) via `@udecode/plate`
- **Async**: BullMQ 5.69 (Redis-backed)
- **Events**: RabbitMQ for domain events, format `DomainEvent<T>`
- **IDs**: UUID v7 via `crypto.randomUUID()`
- **Dates**: ISO 8601 strings everywhere
- **Validation**: Zod 3.x at API boundaries only

### Architecture Patterns

- **DDD Bounded Context**: CER module at `apps/api/src/modules/cer/` with subdirectories: `domain/`, `application/`, `infrastructure/`, `graphql/`
- **Domain Events**: Use `DomainEvent<T>` format with `eventType: 'cer.version.created'`, `aggregateType: 'CerVersion'`
- **Repository Pattern**: Never call Prisma directly from resolvers; go through repository layer
- **Use Case Pattern**: Business logic in use cases, not in GraphQL resolvers
- **Error Handling**: Throw typed `DomainError` subclasses (`UpstreamNotLockedError`, `NotFoundError`, `PermissionDeniedError`), never raw `throw new Error()`
- **Audit Trail**: Automatic via middleware - agents do NOT manually log audit entries
- **RBAC**: Enforced at GraphQL resolver level via `rbac-middleware.ts`, CER access = Admin + RA Manager (write), Clinical Specialist (read-only)

### Naming Conventions

- **Prisma models**: PascalCase (`CerVersion`, `CerSection`)
- **Prisma enums**: PascalCase name, UPPER_SNAKE_CASE values (`enum CerStatus { DRAFT, IN_PROGRESS }`)
- **GraphQL types**: PascalCase (`type CerVersion`)
- **GraphQL mutations**: camelCase, action + entity (`createCer`, `linkUpstreamModule`)
- **TypeScript files**: kebab-case (`cer-version.ts`, `create-cer.ts`)
- **React components**: PascalCase (`CerDashboard.tsx`)
- **Routes**: kebab-case URLs (`/projects/:projectId/cer-versions/:versionId`)
- **Domain events**: `module.aggregate.action` dot notation (`cer.version.created`)
- **BullMQ queues**: `module:action` colon separator (`cer:draft-section`)

### Anti-Patterns to Avoid

- `any` in TypeScript - use `unknown` + type guard
- `console.log` in production - use structured logger
- Business logic in GraphQL resolvers - delegate to use cases
- Server state in Zustand - Apollo Client only for GraphQL server state
- Circular imports between bounded contexts - use events or `shared/`
- Direct Prisma calls in resolvers - go through repository layer
- Inline SQL - use Prisma query builder only
- Manual audit logging - middleware handles it automatically

### Project Structure Notes

```
apps/api/src/modules/cer/
├── domain/
│   ├── entities/
│   │   ├── cer-version.ts
│   │   ├── cer-section.ts
│   │   ├── external-document.ts
│   │   └── claim-trace.ts
│   ├── value-objects/
│   │   ├── cer-status.ts
│   │   ├── version-type.ts
│   │   └── regulatory-context.ts
│   └── events/
│       └── cer-created.ts
├── application/
│   ├── use-cases/
│   │   ├── create-cer.ts
│   │   ├── link-upstream.ts
│   │   └── manage-external-docs.ts
│   └── dtos/
├── infrastructure/
│   └── repositories/
│       └── cer-repository.ts
└── graphql/
    ├── types.ts
    ├── queries.ts
    └── mutations.ts

apps/web/src/features/cer/
├── components/
│   ├── CerCreationForm.tsx
│   ├── CerDashboard.tsx
│   ├── UpstreamModuleSelector.tsx
│   └── ExternalDocumentList.tsx
├── hooks/
├── graphql/
│   ├── queries.ts
│   ├── mutations.ts
│   └── fragments.ts

apps/web/src/routes/_authenticated/projects/$projectId/cer-versions/
├── index.tsx
└── $versionId.tsx

packages/prisma/schema/cer.prisma
```

### UX Design Notes

- **Layout**: Dark sidebar (#0A3153) + topbar pipeline (56px) + work area (flex-1) + detail panel (380px, retractable) + statusbar (32px)
- **CER Dashboard**: Use Stripe-style typography for metrics (text-2xl bold for numbers, text-muted for labels)
- **Upstream Module Selector**: Show locked modules with green StatusBadge (locked variant), non-locked grayed out
- **Stepper Form**: Horizontal stepper for multi-step CER creation (consistent with project creation form pattern)
- **External Docs Table**: ag-Grid with CORTEX theming (header #F8F9FA, hover blue-50, Inter 14px)
- **Pipeline Progress Bar**: CER node should pulse (active state) when user is in CER module

### Dependencies

- Requires Epic 1 (auth, RBAC, audit middleware, project structure)
- Requires Epic 2 Story 2.10 (SLS dataset locking, locked SLS sessions available)
- Requires Epic 3 Story 3.11 (SOA locking, locked SOA analyses available)
- Requires Epic 4 Story 4.8 (Validation locking, locked validation studies available)
- This story is the foundation for all other Epic 5 stories

### References

- PRD: FR45, FR46, FR47
- Architecture: `apps/api/src/modules/cer/` module structure, `packages/prisma/schema/cer.prisma`
- UX Design Spec: Journey 4 (CER Assembly & Review), Design Direction B+F
- Epics: Epic 5 Story 5.1

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
