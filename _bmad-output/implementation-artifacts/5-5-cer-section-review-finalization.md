# Story 5.5: CER Section Review & Finalization

Status: ready-for-dev

## Story

As an RA Manager,
I want to review and finalize AI-drafted CER sections in a rich text editor,
So that I can adjust tone, verify references, and ensure regulatory language quality.

## Acceptance Criteria

**Given** AI-drafted CER sections
**When** the RA Manager opens a section for review
**Then** the section is displayed in a Plate rich text editor with full formatting support (FR51)
**And** inline references [1], [2] are clickable with hover popover showing the source article
**And** AI-generated content is distinguishable from human edits (for acceptance rate tracking)
**And** auto-save every 10 seconds (R3)
**And** section status can be changed: draft -> reviewed -> finalized
**And** the dashboard shows completion metrics: "12/14 sections finalized | Traceability: 98%"
**And** claims without linked sources are highlighted in orange

## Tasks / Subtasks

### Backend

- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/review-section.ts`:
  - Accept section content update (rich text JSON from Plate editor)
  - Store `humanEditedContent` separately from `aiDraftContent` for acceptance rate tracking
  - Compute diff between AI draft and human edits for AI acceptance metrics (FR90)
  - Update section status (DRAFT -> REVIEWED -> FINALIZED)
  - Validate references exist before allowing FINALIZED status
  - Emit domain event `cer.section.status-changed`
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/save-section-content.ts`:
  - Accept partial section content update (auto-save)
  - Debounce-friendly (idempotent, merge-safe)
  - Track AI content vs human edits using content markers
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/validate-section-references.ts`:
  - Scan section content for inline references `[1]`, `[2]`, `[R1]`
  - Verify each reference has a corresponding ClaimTrace record
  - Return list of unverified/orphaned references
  - Return traceability coverage percentage
- [ ] Extend `CerSection` model to include:
  - `contentJson` (JSONB - Plate editor serialized content)
  - `aiDraftContentJson` (JSONB - original AI draft for comparison)
  - `humanEditPercentage` (Float - percentage of content changed by human)
  - `wordCount` (Int - computed on save)
  - `unresolvedClaimCount` (Int - computed on save)
- [ ] Create GraphQL mutations:
  - `updateSectionContent(input: UpdateSectionContentInput!)` - save section content (auto-save compatible)
  - `updateSectionStatus(sectionId: UUID!, status: CerSectionStatus!)` - change status with validation
  - `validateSectionReferences(sectionId: UUID!)` - run reference validation
- [ ] Create GraphQL queries:
  - `cerCompletionMetrics(cerVersionId: UUID!)` - dashboard metrics (sections finalized, traceability %)
  - `unresolvedClaims(cerVersionId: UUID!)` - list claims without sources
- [ ] Add AI acceptance rate computation:
  - Compare `aiDraftContentJson` vs `contentJson` using text diff
  - Track acceptance rate per section and aggregate per CER
  - Store in `humanEditPercentage` field
- [ ] Write unit tests for review-section use case
- [ ] Write unit tests for reference validation

### Frontend

- [ ] Create `SectionEditor.tsx` component in `apps/web/src/features/cer/components/`:
  - Full Plate rich text editor configured for CER content
  - Toolbar: Bold, Italic, Headings (H2, H3, H4), Ordered/Unordered Lists, Tables, Inline References
  - Content area: max-width 800px centered for readability (per UX spec)
  - Auto-save every 10 seconds via `use-auto-save.ts` hook
  - Saving indicator in statusbar: "Saved" / "Saving..."
  - Section title displayed as non-editable H1 above editor
  - Section number badge (e.g., "Section 7") in top-left corner
- [ ] Create `InlineReference.tsx` Plate plugin:
  - Render inline references `[1]`, `[2]` as clickable elements
  - Hover shows SourceQuotePopover: article title, authors, DOI, linked SOA section
  - Click navigates to source article/section in detail panel
  - Unresolved references rendered with orange background (warning color)
  - References `[R1]`, `[R2]` rendered differently (external document refs)
- [ ] Create `AiContentTracker.tsx` component:
  - Visual indicator showing % AI-generated vs human-edited content
  - Subtle banner or sidebar indicator: "AI draft: 82% | Human edits: 18%"
  - AI-generated content subtly marked (e.g., blue-50 background or left border)
  - Toggle to show/hide AI content markers
- [ ] Create `SectionStatusControl.tsx` component:
  - Status dropdown: Draft -> Reviewed -> Finalized
  - Each status transition requires confirmation
  - "Finalized" status disabled if unresolved claims exist
  - Status change shows toast: "Section 7 marked as Finalized"
- [ ] Create `CompletionDashboard.tsx` component:
  - Large Stripe-style metrics: "12/14 sections finalized" (text-2xl bold)
  - Traceability coverage: "98%" with progress ring
  - Unresolved claims count with link to unresolved list
  - Per-section completion grid showing status badges
- [ ] Create `UnresolvedClaimsList.tsx` component:
  - List of claims without linked sources
  - Each item: claim text, section number, "Link Source" action button
  - Orange accent bar on left (3px, warning color)
  - Clicking "Link Source" opens TraceabilityDrillDown panel to create link
- [ ] Create hooks:
  - `apps/web/src/features/cer/hooks/use-section-editor.ts` - section content query + mutation
  - `apps/web/src/features/cer/hooks/use-section-auto-save.ts` - debounced auto-save (10s)
  - `apps/web/src/features/cer/hooks/use-completion-metrics.ts` - dashboard metrics
- [ ] Integrate Plate editor with CORTEX design tokens:
  - Font: Inter, text-base (16px) for body, comfortable reading
  - Colors: CORTEX palette for headings, links, references
  - Background: white (#FFFFFF) work area
- [ ] Add keyboard shortcuts for editor: Cmd+S (manual save), Cmd+B (bold), Cmd+I (italic)

## Dev Notes

### Technology Stack

- **Rich Text Editor**: Plate (Slate-based) via `@udecode/plate` - plugin architecture for inline references, AI content tracking
- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2
- **Auto-save**: `apps/web/src/shared/hooks/use-auto-save.ts` - debounced Apollo mutation every 10 seconds
- **Frontend**: React 19, Apollo Client 3.x, Tailwind CSS 4

### Architecture Patterns

- **Rich Text Serialization**: Plate editor content stored as JSONB in PostgreSQL (Prisma `Json` type)
- **Auto-save**: Debounced mutation every 10 seconds, idempotent on backend, "Saved" indicator in statusbar
- **AI Acceptance Tracking**: Compare `aiDraftContentJson` vs `contentJson` to compute human edit percentage (FR90)
- **Reference Validation**: Server-side validation ensures all inline references have corresponding ClaimTrace records
- **Content Diffing**: Text diff between AI draft and human edits for acceptance rate metrics

### Plate Editor Configuration

- **Plugins needed**: Basic marks (bold, italic), Headings, Lists, Tables, Inline References (custom), Comments (optional)
- **Custom plugin**: InlineReference - renders `[1]`, `[2]` as interactive elements with hover popover
- **Serialization**: Plate JSON format stored in JSONB column, round-trip safe
- **Toolbar**: shadcn/ui-based toolbar components (Plate provides shadcn integration)
- **Max width**: 800px centered in work area for optimal reading comfort (per UX spec)

### UX Design Notes

- **Editor Layout**: Max-width 800px centered, Inter 16px body text, comfortable for long editing sessions (2-4h)
- **Inline References**: `[1]` as clickable blue text, hover shows SourceQuotePopover with article details
- **Unresolved Claims**: Orange background highlight on unresolved `[?]` references
- **AI Content Markers**: Subtle blue-50 background on AI-generated paragraphs, toggleable
- **Status Flow**: Draft -> Reviewed -> Finalized, each transition shows toast notification
- **Dashboard**: Stripe-style large numbers "12/14 sections finalized | Traceability: 98%"
- **Auto-save**: Statusbar indicator "Saved" (green dot) / "Saving..." (animated), never show unsaved warning

### Project Structure Notes

```
apps/api/src/modules/cer/
├── application/use-cases/
│   ├── review-section.ts                   (NEW)
│   ├── save-section-content.ts             (NEW)
│   └── validate-section-references.ts      (NEW)
└── graphql/
    ├── types.ts                            (UPDATED)
    ├── queries.ts                          (UPDATED)
    └── mutations.ts                        (UPDATED)

apps/web/src/features/cer/components/
├── SectionEditor.tsx                       (NEW)
├── InlineReference.tsx                     (NEW - Plate plugin)
├── AiContentTracker.tsx                    (NEW)
├── SectionStatusControl.tsx                (NEW)
├── CompletionDashboard.tsx                 (NEW)
└── UnresolvedClaimsList.tsx                (NEW)

apps/web/src/features/cer/hooks/
├── use-section-editor.ts                   (NEW)
├── use-section-auto-save.ts                (NEW)
└── use-completion-metrics.ts               (NEW)

packages/prisma/schema/cer.prisma           (UPDATED)
```

### Dependencies

- Depends on Story 5.1 (CerSection model)
- Depends on Story 5.4 (AI-drafted sections, CerSection content)
- Depends on Story 1.7 (audit trail middleware)
- FR references: FR51, FR87, FR90, R3

### References

- PRD: FR51 (review and finalize sections), FR90 (AI acceptance rate), R3 (auto-save 10s)
- Architecture: Plate editor, auto-save hook, JSONB content storage
- UX Design Spec: Journey 4 (CER review), editor max-width 800px, inline references pattern
- Epics: Epic 5 Story 5.5

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
