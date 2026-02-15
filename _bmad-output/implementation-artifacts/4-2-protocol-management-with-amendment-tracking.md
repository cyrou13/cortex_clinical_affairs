# Story 4.2: Protocol Management with Amendment Tracking

Status: ready-for-dev

## Story

As an RA Manager,
I want to define study protocols with endpoints, sample size justification, and automatic amendment tracking,
So that protocol changes are documented for regulatory compliance.

## Acceptance Criteria

**Given** a validation study
**When** the RA Manager defines the protocol
**Then** protocol fields include: study summary, endpoints, sample size justification, statistical strategy (FR37)
**And** the system warns when the protocol is amended after initial approval (FR37a)
**And** protocol version is automatically incremented (1.0 -> 1.1) when amended (FR37b)
**And** amendment history is recorded and included in the Validation Report (FR37c)
**And** the protocol form uses the UX stepper pattern for multi-section entry
**And** auto-save every 10 seconds (R3)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create Protocol domain entity and business logic** (AC: protocol fields, version increment)
  - [ ] T1.1: Create/extend `apps/api/src/modules/validation/domain/entities/protocol.ts` — protocol entity with full field set: summary, endpoints (structured JSON array with endpoint name, type, target value, unit), sampleSizeJustification, statisticalStrategy
  - [ ] T1.2: Implement version auto-increment logic: initial version "1.0", amendments auto-increment minor version (1.0 -> 1.1 -> 1.2). Major version on fundamental changes (1.x -> 2.0) — triggered manually by RA Manager
  - [ ] T1.3: Implement protocol status transitions: DRAFT -> APPROVED -> AMENDED. Only APPROVED protocols can be amended
  - [ ] T1.4: Add domain invariant: protocol cannot be modified if parent ValidationStudy is LOCKED

- [ ] **T2: Create amendment tracking** (AC: amendment warning, history recording)
  - [ ] T2.1: Implement amendment detection in `protocol.ts` entity: when protocol with status APPROVED is modified, auto-create ProtocolAmendment record
  - [ ] T2.2: Store amendment details: `fromVersion`, `toVersion`, `reason` (mandatory when amending), `changes` (JSON diff of what changed), `createdAt`, `createdById`
  - [ ] T2.3: Implement warning emission when protocol is amended after approval (FR37a) — return `protocolAmendmentWarning: true` in mutation response

- [ ] **T3: Create use cases** (AC: protocol definition, amendment)
  - [ ] T3.1: Create `apps/api/src/modules/validation/application/use-cases/define-protocol.ts` — creates or updates protocol, validates required fields with Zod
  - [ ] T3.2: Create `apps/api/src/modules/validation/application/use-cases/amend-protocol.ts` — handles amendment flow: validates protocol is APPROVED, requires reason, auto-increments version, creates ProtocolAmendment record, sets status to AMENDED
  - [ ] T3.3: Create `apps/api/src/modules/validation/application/use-cases/approve-protocol.ts` — transitions DRAFT -> APPROVED
  - [ ] T3.4: Create DTOs with Zod schemas: `DefineProtocolInput`, `AmendProtocolInput`, `ApproveProtocolInput`

- [ ] **T4: Extend repository layer** (AC: data persistence)
  - [ ] T4.1: Add protocol repository methods to `validation-study-repository.ts` or create dedicated `protocol-repository.ts`
  - [ ] T4.2: Implement `findProtocolByStudyId`, `findProtocolHistory`, `saveProtocol`, `createAmendment`, `findAmendments`

- [ ] **T5: Create GraphQL layer for Protocol** (AC: API exposure)
  - [ ] T5.1: Add Pothos types: `Protocol`, `ProtocolAmendment`, `ProtocolEndpoint` (object type from JSON)
  - [ ] T5.2: Add queries: `protocol(studyId)`, `protocolAmendments(protocolId)`
  - [ ] T5.3: Add mutations: `defineProtocol`, `approveProtocol`, `amendProtocol`
  - [ ] T5.4: Mutation `amendProtocol` returns `{ protocol, amendmentWarning: Boolean, amendment }` to surface warning (FR37a)
  - [ ] T5.5: Apply RBAC: only Admin, RA Manager can define/amend protocols

### Frontend Tasks

- [ ] **T6: Create ProtocolEditor component** (AC: stepper pattern, all fields)
  - [ ] T6.1: Create `apps/web/src/features/validation/components/ProtocolEditor.tsx`
  - [ ] T6.2: Implement multi-step stepper form (consistent with UX pattern):
    - Step 1: Study Summary (rich text, description of the validation study)
    - Step 2: Endpoints (dynamic list — add/remove endpoint rows, each with: name, type dropdown, target value, unit)
    - Step 3: Sample Size Justification (rich text area with references)
    - Step 4: Statistical Strategy (structured form: analysis methods, significance level, power calculation)
  - [ ] T6.3: Use React Hook Form + Zod resolver for form validation
  - [ ] T6.4: Labels above fields, inline validation per the UX form patterns
  - [ ] T6.5: Navigation: "Previous" / "Next" buttons at bottom, validation per step before advancing

- [ ] **T7: Implement auto-save** (AC: auto-save every 10 seconds, R3)
  - [ ] T7.1: Create or use `apps/web/src/shared/hooks/use-auto-save.ts` hook
  - [ ] T7.2: Integrate auto-save with React Hook Form `watch()` + debounced Apollo mutation (10s interval)
  - [ ] T7.3: Display auto-save status in the statusbar: "Saving..." / "Saved" with green dot indicator

- [ ] **T8: Implement amendment warning UI** (AC: amendment warning, FR37a)
  - [ ] T8.1: When editing an APPROVED protocol, show inline Alert (warning variant) at top of form: "This protocol has been approved. Changes will create a new version and be tracked as an amendment."
  - [ ] T8.2: Require amendment reason field (textarea) when modifying an approved protocol
  - [ ] T8.3: After amendment mutation succeeds, show toast notification: "Protocol amended to version X.Y. Amendment recorded."

- [ ] **T9: Create amendment history view** (AC: amendment history display, FR37c)
  - [ ] T9.1: Create `apps/web/src/features/validation/components/ProtocolAmendmentHistory.tsx`
  - [ ] T9.2: Display amendment timeline: version number, date, author, reason, and changes (expandable diff view)
  - [ ] T9.3: Each amendment entry is a Card with: version badge, timestamp (text-muted), author name, reason text, expandable "View changes" section
  - [ ] T9.4: Show current protocol version prominently in the ProtocolEditor header: "Protocol v1.2 (Amended)"

- [ ] **T10: Create GraphQL operations** (AC: data fetching)
  - [ ] T10.1: Create protocol-related queries and mutations in `apps/web/src/features/validation/graphql/`
  - [ ] T10.2: Use Apollo Client for all operations

### Testing Tasks

- [ ] **T11: Write backend tests**
  - [ ] T11.1: Unit test protocol entity — version auto-increment logic (1.0 -> 1.1 -> 1.2)
  - [ ] T11.2: Unit test amendment creation — requires reason, creates record, increments version
  - [ ] T11.3: Unit test protocol status transitions — DRAFT -> APPROVED -> AMENDED
  - [ ] T11.4: Unit test invariant — protocol cannot be modified when study is LOCKED
  - [ ] T11.5: Unit test amendment warning flag in response

- [ ] **T12: Write frontend tests**
  - [ ] T12.1: Component test ProtocolEditor — renders all 4 steps, navigates between steps
  - [ ] T12.2: Component test amendment warning — shows alert when editing approved protocol
  - [ ] T12.3: Component test auto-save — triggers after 10 seconds of changes

## Dev Notes

### Technology Stack (Exact Versions)

- **Backend:** Fastify 5.7.x, Apollo Server 4, Prisma 7.2.x, Node.js 20 LTS+
- **Frontend:** React 19.x, React Hook Form + `@hookform/resolvers` + Zod, Apollo Client 3.x, Tailwind CSS 4.x, shadcn/ui
- **Rich Text:** Plate (`@udecode/plate`, Slate-based) for protocol summary and sample size justification fields
- **Testing:** Vitest (unit/integration)

### DDD Patterns

- Protocol is an entity within the Validation bounded context
- Protocol has its own lifecycle (DRAFT -> APPROVED -> AMENDED) independent of ValidationStudy status
- ProtocolAmendment is a domain event record (immutable once created)
- Version auto-increment is domain logic within the Protocol entity, not in the use case
- Business logic lives in `domain/entities/protocol.ts`, NOT in resolvers or use cases

### Protocol Data Structure

```typescript
// Protocol endpoints structure (stored as JSONB)
interface ProtocolEndpoint {
  name: string; // e.g., "Sensitivity", "Specificity", "AUC"
  type: 'primary' | 'secondary' | 'exploratory';
  targetValue: number; // e.g., 0.92
  unit: string; // e.g., "%", "ratio"
  comparator: 'gte' | 'lte' | 'eq' | 'range';
  benchmarkSource?: string; // Reference to SOA benchmark
}

// Amendment changes diff structure
interface AmendmentChanges {
  field: string; // Which field changed
  previousValue: unknown;
  newValue: unknown;
}
```

### Auto-Save Implementation

- Use `apps/web/src/shared/hooks/use-auto-save.ts` hook
- Debounced save via Apollo mutation every 10 seconds
- React Hook Form `watch()` detects changes
- UI indicator in statusbar: green dot + "Saved" / spinner + "Saving..."
- Auto-save on step change (stepper navigation)

### UX Design Notes

- **Stepper pattern:** Horizontal stepper at top of form (consistent with pipeline topbar and project creation wizard)
- **Labels above fields,** text-secondary 14px semi-bold
- **Inline validation:** Error message in red under the field, red border on the field, at blur
- **Amendment warning:** Orange Alert component (shadcn Alert) with left border 3px (accent bar pattern)
- **Version display:** Large text-2xl badge in header showing "v1.2"
- **Amendment history:** Vertical timeline with Cards, connectors between them (similar to TraceabilityDrillDown cascade pattern)
- **Buttons:** "Save Draft" (Secondary), "Approve Protocol" (Success), "Previous/Next" step navigation

### Naming Conventions

- **Prisma models:** `Protocol`, `ProtocolAmendment`
- **GraphQL mutations:** `defineProtocol`, `approveProtocol`, `amendProtocol`
- **Files:** `protocol-editor.tsx` (hook), `ProtocolEditor.tsx` (component), `amend-protocol.ts` (use case)
- **Routes:** `/projects/:projectId/validation-studies/:studyId` (protocol is a section within study detail page, not a separate route)

### Error Handling

- `ValidationError` for missing required fields
- `LockConflictError` if attempting to modify protocol when study is locked
- Never raw `throw new Error()`

### Project Structure Notes

```
apps/api/src/modules/validation/
  domain/entities/protocol.ts          # Protocol entity with version logic
  application/use-cases/
    define-protocol.ts                 # Create/update protocol
    approve-protocol.ts                # DRAFT -> APPROVED
    amend-protocol.ts                  # APPROVED -> AMENDED with version increment
  application/dtos/
    protocol-input.ts                  # Zod schemas for protocol inputs
  graphql/
    types.ts                           # Add Protocol, ProtocolAmendment types
    mutations.ts                       # Add defineProtocol, approveProtocol, amendProtocol

apps/web/src/features/validation/
  components/
    ProtocolEditor.tsx                 # Multi-step stepper form
    ProtocolAmendmentHistory.tsx        # Amendment timeline
  hooks/
    use-protocol.ts                    # Protocol-specific Apollo hooks
```

### References

- **Epics:** `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md` — Form patterns, auto-save hook, Zod validation
- **UX Design:** `_bmad-output/planning-artifacts/ux-design-specification.md` — Stepper pattern, form patterns, auto-save indicator, alert styling
- **FRs covered:** FR37, FR37a, FR37b, FR37c
- **NFRs addressed:** R3 (auto-save 10s)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
