# Story 3.7: MDR-Aligned Thematic Sections

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to create MDR-aligned thematic sections for clinical and device SOA,
So that my analysis follows the regulatory structure required for CER submission.

## Acceptance Criteria

**Given** an SOA analysis with populated extraction grids
**When** the Clinical Specialist navigates to thematic sections
**Then** Clinical SOA sections S1-6 are available (FR27):
S1: General context, S2: Preclinical evaluation, S3: Clinical data identification, S4: Clinical data appraisal, S5: Clinical data analysis, S6: Similar devices
**And** Device SOA sections S1-5 are available (FR27):
S1: Device description, S2: Intended purpose, S3: Existing data, S4: Device performance, S5: Clinical performance
**And** each section can be edited independently
**And** section completion status is tracked in the sidebar (draft, in progress, finalized)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Define MDR section constants** (AC: section definitions for Clinical and Device SOA)
  - [ ] T1.1: Create/extend `packages/shared/src/constants/mdr-sections.ts`:
    ```typescript
    export const CLINICAL_SOA_SECTIONS = [
      {
        key: 'CLINICAL_1',
        title: 'General Context',
        description: 'Background, medical condition, current treatment landscape',
        orderIndex: 1,
      },
      {
        key: 'CLINICAL_2',
        title: 'Preclinical Evaluation',
        description: 'Non-clinical studies, bench testing, biocompatibility',
        orderIndex: 2,
      },
      {
        key: 'CLINICAL_3',
        title: 'Clinical Data Identification',
        description: 'Literature search strategy, data sources, selection criteria',
        orderIndex: 3,
      },
      {
        key: 'CLINICAL_4',
        title: 'Clinical Data Appraisal',
        description: 'Quality assessment, evidence grading, bias evaluation',
        orderIndex: 4,
      },
      {
        key: 'CLINICAL_5',
        title: 'Clinical Data Analysis',
        description: 'Data synthesis, outcome analysis, statistical findings',
        orderIndex: 5,
      },
      {
        key: 'CLINICAL_6',
        title: 'Similar Devices',
        description: 'Similar device identification, equivalence analysis, performance comparison',
        orderIndex: 6,
      },
    ];
    export const DEVICE_SOA_SECTIONS = [
      {
        key: 'DEVICE_1',
        title: 'Device Description',
        description: 'Technical specifications, materials, components',
        orderIndex: 1,
      },
      {
        key: 'DEVICE_2',
        title: 'Intended Purpose',
        description: 'Intended use, target population, clinical claims',
        orderIndex: 2,
      },
      {
        key: 'DEVICE_3',
        title: 'Existing Data',
        description: 'Previous versions, predicate devices, existing clinical data',
        orderIndex: 3,
      },
      {
        key: 'DEVICE_4',
        title: 'Device Performance',
        description: 'Technical performance, safety data, reliability',
        orderIndex: 4,
      },
      {
        key: 'DEVICE_5',
        title: 'Clinical Performance',
        description: 'Clinical outcomes, efficacy, effectiveness',
        orderIndex: 5,
      },
    ];
    ```

- [ ] **T2: Create section initialization use case** (AC: sections created per SOA type)
  - [ ] T2.1: Create `apps/api/src/modules/soa/application/use-cases/create-section.ts`:
    - On SOA creation or when user navigates to sections: auto-create ThematicSection records for the SOA type
    - Clinical SOA -> create S1-6, Device SOA -> create S1-5
    - Alternative SOA -> create S1-5 (same as Device)
    - Each section initialized with DRAFT status and empty narrative content
  - [ ] T2.2: Link extraction grid to section: `ThematicSection.extractionGridId` — each section can have its own extraction grid or share a grid
  - [ ] T2.3: Prevent section creation if SOA is LOCKED

- [ ] **T3: Create section status management use case** (AC: section completion tracking)
  - [ ] T3.1: Extend `apps/api/src/modules/soa/application/use-cases/create-section.ts` or create new use case:
    - `updateSectionStatus(sectionId, status: DRAFT | IN_PROGRESS | FINALIZED)` — transitions section status
    - Status transition rules: DRAFT -> IN_PROGRESS (when first edit), IN_PROGRESS -> FINALIZED (manual action), FINALIZED -> IN_PROGRESS (unlock for re-editing, with audit log)
  - [ ] T3.2: `updateSectionNarrative(sectionId, content)` — saves narrative content (Plate editor JSON)
  - [ ] T3.3: Auto-save support: mutation accepts partial updates, merge with existing content

- [ ] **T4: Add section GraphQL types and operations** (AC: API layer for sections)
  - [ ] T4.1: Add/extend types in `apps/api/src/modules/soa/graphql/types.ts`:
    - `ThematicSection` type: id, sectionKey, title, description, status, narrativeContent, narrativeAiDraft, extractionGridId, orderIndex
    - `SectionStatus` enum: DRAFT, IN_PROGRESS, FINALIZED
  - [ ] T4.2: Add queries:
    - `thematicSections(soaAnalysisId)` — returns all sections for an SOA, ordered by orderIndex
    - `thematicSection(sectionId)` — returns single section with narrative content
  - [ ] T4.3: Add mutations:
    - `initializeSections(soaAnalysisId)` — creates sections based on SOA type
    - `updateSectionStatus(sectionId, status)` — transitions status
    - `updateSectionNarrative(sectionId, content)` — saves narrative content
    - `finalizeSectionNarrative(sectionId)` — marks section as FINALIZED

- [ ] **T5: Write backend tests**
  - [ ] T5.1: Test section initialization creates correct sections per SOA type (6 for Clinical, 5 for Device)
  - [ ] T5.2: Test section status transitions (valid and invalid)
  - [ ] T5.3: Test narrative content save and retrieval
  - [ ] T5.4: Test sections cannot be created on locked SOA

### Frontend Tasks

- [ ] **T6: Create section navigation sidebar** (AC: sidebar shows section list with status)
  - [ ] T6.1: Create `apps/web/src/features/soa/components/SectionSidebar.tsx`:
    - Lists all thematic sections for current SOA
    - Each section: icon, section number (S1, S2...), title, StatusBadge (draft/in-progress/finalized)
    - Active section highlighted (blue-50 background)
    - Click to navigate between sections
  - [ ] T6.2: Section titles match MDR structure:
    - Clinical SOA: "S1: General Context", "S2: Preclinical Evaluation", etc.
    - Device SOA: "S1: Device Description", "S2: Intended Purpose", etc.
  - [ ] T6.3: Progress summary at top: "3/6 sections finalized"
  - [ ] T6.4: Finalized sections show check icon, in-progress show edit icon, draft show circle icon

- [ ] **T7: Create section editor page** (AC: each section editable independently)
  - [ ] T7.1: Create `apps/web/src/features/soa/components/SectionEditor.tsx`:
    - Top: section title + StatusBadge + "Finalize Section" button
    - Two-panel layout: left = extraction grid for this section, right = narrative editor
    - Or tabbed layout: "Extraction Grid" tab | "Narrative" tab | "Quality" tab
  - [ ] T7.2: Narrative editor placeholder (Plate editor integration in Story 3.8):
    - For now: basic textarea or rich text placeholder
    - "Generate Narrative" button (disabled — enabled in Story 3.8)
  - [ ] T7.3: Section status controls: "Mark as In Progress", "Finalize Section" buttons
  - [ ] T7.4: "Finalize Section" button shows confirmation dialog

- [ ] **T8: Update SOA detail page for section navigation** (AC: section-based navigation)
  - [ ] T8.1: Update `apps/web/src/routes/_authenticated/$projectId/soa-analyses/$soaId.tsx`:
    - Layout: SectionSidebar on left + SectionEditor in main area
    - URL updates with section: `?section=CLINICAL_1`
    - Default to first section on load
  - [ ] T8.2: Implement section switching: clicking sidebar item loads section content
  - [ ] T8.3: Warn if navigating away from unsaved changes

- [ ] **T9: Create section GraphQL hooks**
  - [ ] T9.1: Add queries to `apps/web/src/features/soa/graphql/queries.ts`:
    - `GET_THEMATIC_SECTIONS` — all sections for SOA
    - `GET_THEMATIC_SECTION` — single section with content
  - [ ] T9.2: Add mutations: `INITIALIZE_SECTIONS`, `UPDATE_SECTION_STATUS`, `UPDATE_SECTION_NARRATIVE`, `FINALIZE_SECTION`
  - [ ] T9.3: Create `apps/web/src/features/soa/hooks/use-thematic-sections.ts`

- [ ] **T10: Write frontend tests**
  - [ ] T10.1: Test SectionSidebar renders correct sections for Clinical SOA (6 sections)
  - [ ] T10.2: Test SectionSidebar renders correct sections for Device SOA (5 sections)
  - [ ] T10.3: Test section status display matches backend status
  - [ ] T10.4: Test section navigation updates URL and loads content
  - [ ] T10.5: Test finalize section confirmation dialog

## Dev Notes

### Technology Stack & Versions

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, Node.js 20 LTS+
- **Frontend**: React 19, Apollo Client 3.x, TanStack Router 1.159.x, Tailwind CSS 4
- **Rich Text**: Plate editor integration is deferred to Story 3.8 — use placeholder for narrative editing in this story
- **UI Components**: shadcn/ui, StatusBadge custom component

### Architecture Patterns

- **Section initialization**: ThematicSections are created automatically based on SOA type using constants from `packages/shared/src/constants/mdr-sections.ts`. This ensures consistent section structure across all SOA analyses.
- **Narrative content storage**: `narrativeContent` field stores Plate editor JSON (Slate document format). For this story, a basic text field is sufficient; Plate serialization in Story 3.8.
- **Auto-save**: Section narrative saves via debounced Apollo mutation (10s interval) per R3 requirement.
- **Section-Grid association**: Each ThematicSection can link to a specific ExtractionGrid via `extractionGridId`. Alternatively, a single grid may serve multiple sections.

### MDR Section Mapping

**Clinical SOA (MEDDEV 2.7/1 Rev 4 aligned):**
| Key | Title | Description |
|---|---|---|
| CLINICAL_1 | General Context | Medical condition, current treatments, unmet needs |
| CLINICAL_2 | Preclinical Evaluation | Bench testing, biocompatibility, animal studies |
| CLINICAL_3 | Clinical Data Identification | SLS strategy summary, databases searched, inclusion/exclusion |
| CLINICAL_4 | Clinical Data Appraisal | QUADAS-2 results, evidence quality grading |
| CLINICAL_5 | Clinical Data Analysis | Data synthesis, outcomes, meta-analysis if applicable |
| CLINICAL_6 | Similar Devices | Device equivalence, similar device registry, performance benchmarks |

**Device SOA:**
| Key | Title | Description |
|---|---|---|
| DEVICE_1 | Device Description | Technical specs, materials, components, design |
| DEVICE_2 | Intended Purpose | Indications, target population, clinical claims |
| DEVICE_3 | Existing Data | Predicate data, previous versions, post-market data |
| DEVICE_4 | Device Performance | Technical performance metrics, safety data |
| DEVICE_5 | Clinical Performance | Clinical outcomes, efficacy data, validation results |

### UX Design Notes

- Section sidebar follows dark sidebar pattern from UX spec
- Section status tracked via StatusBadge (draft = blue, in_progress = info, finalized = success)
- Progress summary at top of sidebar: "X/Y sections finalized"
- Section editor uses two-panel layout: extraction grid + narrative
- "Finalize Section" uses confirmation dialog (not LockConfirmation — sections can be re-opened)
- The flow is: configure grid -> AI pre-fill -> validate cells -> generate narrative -> edit narrative -> finalize section -> next section

### Naming Conventions

- **Constants file**: `mdr-sections.ts` (in `packages/shared/src/constants/`)
- **Section keys**: UPPER_SNAKE_CASE (`CLINICAL_1`, `DEVICE_3`)
- **Prisma model**: `ThematicSection`
- **Prisma enum**: `SectionStatus { DRAFT, IN_PROGRESS, FINALIZED }`
- **GraphQL types**: `ThematicSection`, `SectionStatus`
- **GraphQL mutations**: `initializeSections`, `updateSectionStatus`, `updateSectionNarrative`, `finalizeSectionNarrative`
- **Components**: `SectionSidebar.tsx`, `SectionEditor.tsx`
- **Hooks**: `use-thematic-sections.ts`

### Project Structure Notes

**Backend files to create/modify:**

- `packages/shared/src/constants/mdr-sections.ts` (create/extend)
- `apps/api/src/modules/soa/application/use-cases/create-section.ts` (create)
- `apps/api/src/modules/soa/graphql/types.ts` (extend with ThematicSection types)
- `apps/api/src/modules/soa/graphql/queries.ts` (extend with section queries)
- `apps/api/src/modules/soa/graphql/mutations.ts` (extend with section mutations)

**Frontend files to create/modify:**

- `apps/web/src/features/soa/components/SectionSidebar.tsx` (create)
- `apps/web/src/features/soa/components/SectionEditor.tsx` (create)
- `apps/web/src/routes/_authenticated/$projectId/soa-analyses/$soaId.tsx` (extend with section layout)
- `apps/web/src/features/soa/graphql/queries.ts` (extend)
- `apps/web/src/features/soa/graphql/mutations.ts` (extend)
- `apps/web/src/features/soa/hooks/use-thematic-sections.ts` (create)

### References

- **Epics file**: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.7 (lines 905-917)
- **Architecture**: `_bmad-output/planning-artifacts/architecture.md` — ThematicSection entity, MDR sections constants
- **UX Design Spec**: `_bmad-output/planning-artifacts/ux-design-specification.md` — Journey 3 section flow (lines 873-903), sidebar section navigation (line 910), StatusBadge variants
- **Functional Requirements**: FR27 (MDR-aligned thematic sections)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
