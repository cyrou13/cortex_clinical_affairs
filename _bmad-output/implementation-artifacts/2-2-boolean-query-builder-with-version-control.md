# Story 2.2: Boolean Query Builder with Version Control

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to construct Boolean queries with AND/OR/NOT operators and track query versions,
So that I can build precise search strategies with full reproducibility (FR7).

## Acceptance Criteria

**Given** an open SLS session
**When** the Clinical Specialist opens the query builder
**Then** they can construct queries using Boolean operators (AND, OR, NOT) with parenthetical grouping
**And** each query version is saved with a version number and timestamp
**And** the user can view the history of query versions and compare changes
**And** queries can be duplicated and modified to create variations
**And** the query builder validates syntax before execution
**And** multiple queries can exist within a single SLS session
**And** the query builder follows the UX form patterns (labels above, inline validation)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Extend SLS Prisma schema for query versioning**
  - Ensure `Query` model has: id, sessionId, name, queryString, version (Int), isActive (Boolean), parentQueryId (self-relation for duplication), createdAt, updatedAt, createdById
  - Create `QueryVersion` model: id, queryId, version, queryString, diff (Json), createdAt, createdById
  - Add `@@index([sessionId, isActive])` on Query
  - Add `@@index([queryId, version])` on QueryVersion
  - Run migration
  - **(AC: Each query version saved with version number and timestamp)**

- [ ] **T2: Create Query domain entity** (`apps/api/src/modules/sls/domain/entities/query.ts`)
  - Business methods: `updateQueryString()`, `createNewVersion()`, `duplicate()`, `validateSyntax()`
  - Version auto-increment logic
  - Syntax validation for Boolean operators (AND, OR, NOT) with parenthetical grouping
  - **(AC: Boolean operators with parenthetical grouping, syntax validation)**

- [ ] **T3: Create Boolean query syntax validator** (`apps/api/src/modules/sls/domain/value-objects/boolean-query.ts`)
  - Parse and validate Boolean query syntax
  - Supported operators: AND, OR, NOT
  - Parenthetical grouping validation (balanced parentheses)
  - Field qualifiers: [ti], [tiab], [mh], [tw] (PubMed-style)
  - Return structured errors for invalid syntax
  - **(AC: Query builder validates syntax before execution)**

- [ ] **T4: Create construct-query use case** (`apps/api/src/modules/sls/application/use-cases/construct-query.ts`)
  - Create new query within session
  - Validate session is not LOCKED
  - Validate syntax before saving
  - Set initial version to 1
  - **(AC: Multiple queries within a single SLS session)**

- [ ] **T5: Create update-query use case** with version control
  - Save current queryString as new QueryVersion
  - Increment version number
  - Compute diff between previous and current version
  - Preserve full version history
  - **(AC: Version number and timestamp tracking)**

- [ ] **T6: Create duplicate-query use case**
  - Copy query with new ID and parentQueryId reference
  - Reset version to 1 for the duplicate
  - **(AC: Queries can be duplicated and modified)**

- [ ] **T7: Create GraphQL types and resolvers for queries**
  - `types.ts`: Add Query, QueryVersion Pothos types
  - `queries.ts`: `queries(sessionId)`, `queryVersions(queryId)`
  - `mutations.ts`: `createQuery`, `updateQuery`, `duplicateQuery`, `deleteQuery`
  - Apply RBAC: Admin, RA Manager, Clinical Specialist
  - **(AC: CRUD for queries)**

- [ ] **T8: Create Zod validation schemas**
  - `packages/shared/src/schemas/query.schema.ts`
  - Validate query input (name, queryString, etc.)
  - Validate Boolean syntax at boundary

### Frontend Tasks

- [ ] **T9: Create QueryBuilder component** (`apps/web/src/features/sls/components/QueryBuilder.tsx`)
  - Text area with syntax highlighting for Boolean operators (AND/OR/NOT colored)
  - Parenthetical grouping visualization
  - Real-time syntax validation with inline error messages
  - Labels above input fields per UX spec
  - **(AC: Boolean operators with parenthetical grouping)**

- [ ] **T10: Create query syntax validator (frontend)** (`apps/web/src/features/sls/hooks/use-query-validation.ts`)
  - Client-side syntax check before submission
  - Highlight syntax errors inline (red underline + tooltip)
  - **(AC: Query builder validates syntax before execution)**

- [ ] **T11: Create QueryVersionHistory component** (`apps/web/src/features/sls/components/QueryVersionHistory.tsx`)
  - List of query versions with: version number, timestamp, created by
  - Side-by-side diff view between two versions (highlight additions in green, removals in red)
  - Click to restore a previous version (creates new version with old content)
  - **(AC: View history of query versions and compare changes)**

- [ ] **T12: Create QueryList component** (`apps/web/src/features/sls/components/QueryList.tsx`)
  - List all queries in the session
  - Each query shows: name, version, last edited, status (draft/executed)
  - Duplicate button per query
  - Add new query button
  - **(AC: Multiple queries within a single SLS session, duplication)**

- [ ] **T13: Create GraphQL operations for queries** (`apps/web/src/features/sls/graphql/`)
  - Add query operations to existing graphql directory
  - Create mutation hooks for CRUD
  - Use Apollo Client cache updates for optimistic UI

### Testing Tasks

- [ ] **T14: Write unit tests for Boolean syntax validator**
  - Valid: `(brain AND tumor) OR (glioblastoma NOT pediatric)`
  - Invalid: unbalanced parentheses, empty operators, double operators
  - Edge cases: nested parentheses, quoted strings

- [ ] **T15: Write unit tests for query versioning logic**
  - Test version increment
  - Test diff computation
  - Test duplication

## Dev Notes

### Tech Stack (Exact Versions)

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, Node.js 20 LTS+
- **Frontend**: React 19, Vite, Apollo Client 3.x, React Hook Form + Zod
- **GraphQL Schema**: Pothos v4 code-first
- **Validation**: Zod 3.x at boundaries

### Architecture Patterns

**DDD Structure**: domain/ (Boolean query value object, Query entity) -> application/ (use cases) -> infrastructure/ (repository) -> graphql/ (thin resolvers)

**Key Rules**:

- Query syntax validation lives in `domain/value-objects/boolean-query.ts` (pure business logic, no infrastructure)
- Version control logic is a domain concern in the Query entity
- Resolvers delegate to use cases; no business logic in resolvers
- Diff computation can use a simple JSON diff or line-by-line comparison
- Audit trail automatic via middleware

### Boolean Query Syntax

The query builder must support standard PubMed/Cochrane Boolean syntax:

- Operators: `AND`, `OR`, `NOT` (case-insensitive accepted, stored uppercase)
- Grouping: Parentheses `(` `)` for operator precedence
- Field qualifiers: `[ti]` (title), `[tiab]` (title/abstract), `[mh]` (MeSH heading), `[tw]` (text word)
- Truncation: `*` wildcard for stem searching (e.g., `surg*`)
- Phrases: Double quotes for exact phrases (`"systematic review"`)

Example valid query:

```
("cervical spine" OR "c-spine" OR "cervical vertebr*") AND (fracture* OR injur*) AND (CT OR "computed tomography" OR radiograph*) NOT (pediatric OR child*)
```

### Version Control Design

Each query has a linear version history:

- Version 1 (initial creation)
- Version 2 (first edit) — stores diff from v1
- Version N (nth edit)

Diff format (stored as JSON in QueryVersion.diff):

```typescript
interface QueryDiff {
  added: string[]; // Lines added
  removed: string[]; // Lines removed
  timestamp: string; // ISO 8601
}
```

### Naming Conventions

- **Files**: `query.ts`, `boolean-query.ts`, `construct-query.ts`, `QueryBuilder.tsx`
- **GraphQL mutations**: `createQuery`, `updateQuery`, `duplicateQuery`
- **Prisma models**: `Query`, `QueryVersion`
- **Enums**: Not needed for this story (query types handled by session type)

### UX Design Specifications

- **Query builder**: Textarea with monospace font for query readability
- **Syntax highlighting**: AND (blue), OR (green), NOT (red) — inline coloring
- **Validation errors**: Red border + error message below the textarea (inline validation pattern)
- **Version history**: Sheet/panel slide-in from right (380px detail panel)
- **Diff view**: Side-by-side, additions highlighted green, removals highlighted red
- **Form pattern**: Labels above fields (14px semi-bold), placeholder as hint
- **Buttons**: Primary "Save Query" button at right, Ghost "Duplicate" button per query item

### Anti-Patterns to Avoid

- Do NOT build a visual drag-and-drop query builder — use a text-based builder with syntax highlighting (Clinical Specialists are familiar with PubMed syntax)
- Do NOT store the full query string in every version — store diffs to save space
- Do NOT allow query edits on LOCKED sessions — check session status in use case
- No `console.log` — structured logger
- No business logic in resolvers

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (MODIFY — add QueryVersion model)
- `apps/api/src/modules/sls/domain/entities/query.ts` (NEW)
- `apps/api/src/modules/sls/domain/value-objects/boolean-query.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/construct-query.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/update-query.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/duplicate-query.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/repositories/query-repository.ts` (NEW)
- `apps/api/src/modules/sls/graphql/types.ts` (MODIFY — add Query types)
- `apps/api/src/modules/sls/graphql/queries.ts` (MODIFY — add query queries)
- `apps/api/src/modules/sls/graphql/mutations.ts` (MODIFY — add query mutations)

**Frontend files to create/modify:**

- `apps/web/src/features/sls/components/QueryBuilder.tsx` (NEW)
- `apps/web/src/features/sls/components/QueryList.tsx` (NEW)
- `apps/web/src/features/sls/components/QueryVersionHistory.tsx` (NEW)
- `apps/web/src/features/sls/hooks/use-query-validation.ts` (NEW)
- `apps/web/src/features/sls/graphql/queries.ts` (MODIFY — add query operations)
- `apps/web/src/features/sls/graphql/mutations.ts` (MODIFY — add query mutations)

**Shared files:**

- `packages/shared/src/schemas/query.schema.ts` (NEW)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.2)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
