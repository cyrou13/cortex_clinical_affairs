# Story 5.2: External Document References & Version Tracking

Status: ready-for-dev

## Story

As an RA Manager,
I want to manage external document references with version mismatch detection,
So that CER sections stay aligned with the latest external documents.

## Acceptance Criteria

**Given** a CER with external document references (Risk Management, Usability, IFU)
**When** an external document version changes
**Then** the system detects version mismatches (FR58c)
**And** impacted CER sections are flagged with an orange warning indicator (FR58d)
**And** the RA Manager can review flagged sections and update references
**And** external document metadata is stored: title, version, date, summary

## Tasks / Subtasks

### Backend

- [ ] Extend `ExternalDocument` entity in `apps/api/src/modules/cer/domain/entities/external-document.ts`:
  - Add `previousVersion` field for version history tracking
  - Add `versionHistory` relation (array of previous versions)
  - Add `linkedSections` relation to CerSection
- [ ] Create `ExternalDocVersionHistory` model in `cer.prisma`:
  - Fields: id, externalDocId, version, date, changedAt, changedById
- [ ] Create `ExternalDocSectionLink` model in `cer.prisma`:
  - Fields: id, externalDocId, cerSectionId, referenceContext
  - Enables tracking which CER sections reference which external documents
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/update-external-doc-version.ts`:
  - Accept new version details (version string, date, summary)
  - Archive current version to version history
  - Update current external document record
  - Query CerSections that reference this document
  - Flag impacted sections with `versionMismatchWarning: true`
  - Emit domain event `cer.external-doc.version-changed`
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/resolve-version-mismatch.ts`:
  - Accept sectionId and resolution action (acknowledge, update-reference)
  - Clear `versionMismatchWarning` flag on section
  - Log resolution in audit trail
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/link-external-doc-to-section.ts`:
  - Create ExternalDocSectionLink between external doc and CER section
  - Track reference context (how the section references the document)
- [ ] Add `versionMismatchWarning` boolean field to `CerSection` model in `cer.prisma`
- [ ] Add `mismatchSource` JSON field to `CerSection` for storing mismatch details
- [ ] Create GraphQL types for ExternalDocVersionHistory
- [ ] Create GraphQL mutations:
  - `updateExternalDocVersion(input: UpdateVersionInput!)` - update version with mismatch detection
  - `resolveVersionMismatch(sectionId: UUID!, action: String!)` - clear mismatch warning
  - `linkExternalDocToSection(input: LinkDocSectionInput!)` - link doc to section
- [ ] Create GraphQL queries:
  - `externalDocVersionHistory(docId: UUID!)` - version history
  - `sectionsWithMismatch(cerVersionId: UUID!)` - flagged sections
- [ ] Write unit tests for version mismatch detection logic
- [ ] Write unit tests for mismatch resolution

### Frontend

- [ ] Create `ExternalDocumentManager.tsx` component in `apps/web/src/features/cer/components/`:
  - Full CRUD interface for external documents
  - Version history timeline for each document
  - "Update Version" action that triggers mismatch detection
  - Version comparison display (old vs new)
- [ ] Create `VersionMismatchAlert.tsx` component:
  - Orange warning banner (inline alert pattern with left border 3px orange)
  - Shows: document name, old version, new version, number of impacted sections
  - CTA: "Review impacted sections" button
  - Uses `--cortex-warning` (#F39C12) color
- [ ] Create `ImpactedSectionsList.tsx` component:
  - List of CER sections flagged with version mismatch
  - Each item shows: section number, title, referenced document, mismatch details
  - Action buttons: "Acknowledge" (mark as reviewed), "Update Reference" (update inline ref)
  - Orange accent bar on left side of each row (3px, warning color)
- [ ] Update `CerDashboard.tsx` to show version mismatch count:
  - Warning badge on external documents section if mismatches exist
  - "3 sections require attention" inline alert
- [ ] Update section sidebar to show orange warning icon on sections with version mismatches
- [ ] Create Apollo Client cache update logic for optimistic mismatch resolution
- [ ] Add toast notification on version update: "Version updated. 3 CER sections flagged for review."

## Dev Notes

### Technology Stack

- **Backend**: Fastify 5.7, Apollo Server 4 with Pothos, Prisma 7.2, PostgreSQL 16
- **Frontend**: React 19, Apollo Client 3.x, Tailwind CSS 4, shadcn/ui
- **Validation**: Zod 3.x at API boundaries

### Architecture Patterns

- **DDD**: All logic in use cases under `apps/api/src/modules/cer/application/use-cases/`
- **Domain Events**: `cer.external-doc.version-changed` emitted when a version update triggers mismatches
- **Repository Pattern**: All DB access via `cer-repository.ts`
- **Error Handling**: Typed domain errors only
- **Audit Trail**: Automatic middleware captures version changes and mismatch resolutions

### Naming Conventions

- Prisma models: `ExternalDocVersionHistory`, `ExternalDocSectionLink`
- GraphQL mutations: `updateExternalDocVersion`, `resolveVersionMismatch`
- Domain events: `cer.external-doc.version-changed`
- Files: kebab-case (`update-external-doc-version.ts`, `VersionMismatchAlert.tsx`)

### UX Design Notes

- **Warning Color**: Use `--cortex-warning` (#F39C12) for mismatch indicators, never red (red = blocking error only)
- **Inline Alert Pattern**: Orange border-left 3px, warning bg, descriptive message + corrective action
- **Section Sidebar**: Orange dot/triangle icon next to section name when mismatch exists
- **Toast**: "Version updated. 3 CER sections flagged for review." (info toast, 5s auto-dismiss)
- **Emotional Design**: Protective, not alarming. "The system caught this before it caused issues."

### Project Structure Notes

```
apps/api/src/modules/cer/
├── application/use-cases/
│   ├── update-external-doc-version.ts   (NEW)
│   ├── resolve-version-mismatch.ts      (NEW)
│   └── link-external-doc-to-section.ts  (NEW)
├── domain/entities/
│   └── external-document.ts             (UPDATED)
└── graphql/
    ├── types.ts                         (UPDATED)
    ├── queries.ts                       (UPDATED)
    └── mutations.ts                     (UPDATED)

apps/web/src/features/cer/components/
├── ExternalDocumentManager.tsx          (NEW)
├── VersionMismatchAlert.tsx             (NEW)
└── ImpactedSectionsList.tsx             (NEW)

packages/prisma/schema/cer.prisma        (UPDATED)
```

### Dependencies

- Depends on Story 5.1 (CER creation, ExternalDocument model)
- FR references: FR58c, FR58d

### References

- PRD: FR58c (version mismatch detection), FR58d (flag impacted sections)
- Architecture: `apps/api/src/modules/cer/` structure, domain event format
- UX Design Spec: Feedback patterns (inline alerts, warning colors), emotional design (protection > alarm)
- Epics: Epic 5 Story 5.2

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
