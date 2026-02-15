# Story 3.4: AI Confidence Indicators & Source Quote Tracking

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to see per-cell AI confidence levels and source quotes for extracted data,
So that I can prioritize review of low-confidence cells and verify data accuracy.

## Acceptance Criteria

**Given** extraction grid cells populated by AI
**When** the grid is displayed
**Then** each cell shows an AiConfidenceIndicator badge: H (green, >=80%), M (orange, 50-79%), L (red, <50%) (FR26e)
**And** cells with low confidence can be flagged for manual review (FR26f)
**And** source quotes (text snippets from the PDF) are stored per extracted value (FR26g)
**And** hovering over a cell value shows a SourceQuotePopover with the source quote in italics, article reference, and page number (FR26h)
**And** clicking "View in PDF" deep-links to the PDF location where data was extracted (FR26i)
**And** validated cells show a check overlay, corrected cells show an edit overlay

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Ensure GridCell schema supports confidence and source data** (AC: data model complete)
  - [ ] T1.1: Verify `GridCell` model in `soa.prisma` has fields: `confidenceLevel` (HIGH/MEDIUM/LOW/UNSCORED), `sourceQuote` (text), `sourcePageNumber` (int?), `pdfLocationData` (JSON — stores coordinates/offset for PDF deep-link)
  - [ ] T1.2: Add `confidenceScore` (Int, 0-100) numeric field to GridCell for precise sorting (the enum is for display, the int for filtering/sorting)
  - [ ] T1.3: Run migration if schema changes needed

- [ ] **T2: Create PDF location service** (AC: deep-link to PDF location)
  - [ ] T2.1: Create `apps/api/src/modules/soa/infrastructure/services/pdf-location-service.ts`:
    - Stores PDF text offset / page coordinates when LLM returns source quote
    - Generates deep-link URL format: `/pdf-viewer?articleId={id}&page={page}&highlight={quote}`
  - [ ] T2.2: The worker processor (Story 3.3) should already save `sourceQuote`, `sourcePageNumber`, and `pdfLocationData` — verify this is correct

- [ ] **T3: Add confidence-based query filters** (AC: cells with low confidence can be flagged)
  - [ ] T3.1: Extend `extractionGridCells` query with filter: `confidenceFilter: [HIGH, MEDIUM, LOW]`
  - [ ] T3.2: Add query: `lowConfidenceCells(gridId)` — returns all cells with LOW confidence for bulk review
  - [ ] T3.3: Add mutation: `flagLowConfidenceCells(gridId)` — bulk-flags all LOW confidence cells

- [ ] **T4: Create source quote query** (AC: source quotes accessible per cell)
  - [ ] T4.1: Add query: `cellSourceQuote(gridId, articleId, columnId)` — returns `{ sourceQuote, articleReference, pageNumber, pdfLocationUrl }`
  - [ ] T4.2: Ensure source quote data is included in `GridCell` type (but lazy-loaded — not in default grid cell response)

- [ ] **T5: Write backend tests**
  - [ ] T5.1: Test confidence level filtering in grid cell queries
  - [ ] T5.2: Test bulk flag operation for low confidence cells
  - [ ] T5.3: Test PDF location URL generation
  - [ ] T5.4: Test source quote retrieval per cell

### Frontend Tasks

- [ ] **T6: Create AiConfidenceIndicator component** (AC: per-cell confidence badge)
  - [ ] T6.1: Create `apps/web/src/shared/components/AiConfidenceIndicator.tsx`:
    - Compact badge (16px height) with label: "H" / "M" / "L"
    - Colors: H = success green (#27AE60), M = warning orange (#F39C12), L = error red (#E74C3C)
    - Validated state: green badge + check overlay icon
    - Corrected state: blue badge + edit overlay icon
    - `aria-label="AI confidence: [level]"` for accessibility
    - Popover accessible via keyboard focus (Tab)
  - [ ] T6.2: Implement hover behavior: 200ms delay before showing confidence detail popover
  - [ ] T6.3: Confidence detail popover content: confidence percentage, reasoning text, "Flag for Review" action button

- [ ] **T7: Create SourceQuotePopover component** (AC: source quote on hover)
  - [ ] T7.1: Create `apps/web/src/shared/components/SourceQuotePopover.tsx`:
    - Background: blue-50, left border: blue-400 (3px)
    - Source quote text in italics (text-sm)
    - Article reference: author, year, journal in text-muted
    - Page number if available
    - "View in PDF" button (ghost style) — deep-links to PDF viewer
    - `role="tooltip"`, `aria-describedby` for accessibility
    - Visible on keyboard focus (Tab)
  - [ ] T7.2: Implement hover timing: 200ms delay to show, disappears on mouse leave (unless mouse enters popover)
  - [ ] T7.3: Handle cases: no source quote available (show "No source quote" message), no PDF (hide "View in PDF" button)

- [ ] **T8: Integrate indicators into ExtractionGrid** (AC: per-cell rendering in ag-Grid)
  - [ ] T8.1: Create ag-Grid custom cell renderer `AiConfidenceCellRenderer`:
    - Renders cell value + AiConfidenceIndicator badge in top-right corner of cell
    - Badge is small (16px) and non-intrusive
    - Cell background tint: HIGH = no tint, MEDIUM = faint orange-50, LOW = faint red-50
  - [ ] T8.2: Create ag-Grid custom cell renderer `SourceQuoteCellRenderer`:
    - On hover over cell value: triggers SourceQuotePopover
    - Uses ag-Grid tooltip mechanism or custom overlay
  - [ ] T8.3: Combine renderers: cells show value + confidence badge, hover shows source quote popover
  - [ ] T8.4: Add validation overlay icons: validated (check), corrected (edit), flagged (flag) — small icon in cell corner

- [ ] **T9: Add "View in PDF" deep-link** (AC: clicking opens PDF at location)
  - [ ] T9.1: Create `apps/web/src/features/soa/components/PdfViewer.tsx` (basic PDF viewer):
    - Opens article PDF from MinIO via signed URL
    - Scrolls to page number from `pdfLocationData`
    - Highlights source quote text if coordinates available
    - Opens in detail panel (380px right) or new browser tab (user choice)
  - [ ] T9.2: "View in PDF" button in SourceQuotePopover fires navigation to PDF viewer with params

- [ ] **T10: Add confidence-based grid filtering** (AC: filter by confidence level)
  - [ ] T10.1: Add confidence level filter to grid toolbar: toggle buttons "H" / "M" / "L" / "All"
  - [ ] T10.2: "Show Low Confidence" quick filter button — highlights and scrolls to low-confidence cells
  - [ ] T10.3: Add "Flag All Low Confidence" bulk action in toolbar

- [ ] **T11: Write frontend tests**
  - [ ] T11.1: Test AiConfidenceIndicator renders correct badge/color per level
  - [ ] T11.2: Test SourceQuotePopover shows on hover with correct content
  - [ ] T11.3: Test accessibility: keyboard focus triggers popover
  - [ ] T11.4: Test "View in PDF" navigation
  - [ ] T11.5: Test confidence filter toggling in grid

## Dev Notes

### Technology Stack & Versions

- **Frontend**: React 19, ag-Grid 33.x Enterprise, Apollo Client 3.x, Tailwind CSS 4
- **UI Components**: shadcn/ui Popover as base for SourceQuotePopover, custom AiConfidenceIndicator
- **PDF Viewer**: Consider `react-pdf` or `pdfjs-dist` for basic PDF rendering
- **ag-Grid**: Custom cell renderers for confidence badges and source quote popovers

### Architecture Patterns

- **Custom Components**: AiConfidenceIndicator and SourceQuotePopover are shared CORTEX components (in `apps/web/src/shared/components/`) — used across SOA and potentially CER modules
- **ag-Grid Cell Renderers**: Custom React cell renderers registered with ag-Grid's `frameworkComponents`
- **Lazy Loading**: Source quotes loaded on hover (not in initial grid data load) to reduce payload size
- **PDF Deep-linking**: PDF location data stored as JSON in GridCell — includes page number and optional text coordinates

### UX Design Spec — Component Specifications

**AiConfidenceIndicator (from UX spec lines 1157-1175):**

- Badge compact 16px height with label: "H" / "M" / "L"
- High (>=80%): green badge "H", hover: "High confidence: source quote found, extraction matches"
- Medium (50-79%): orange badge "M", hover: "Medium: partial match, review recommended"
- Low (<50%): red badge "L", hover: "Low: no direct source quote, manual verification needed"
- Validated: green badge + check overlay
- Corrected: blue badge + edit overlay
- `aria-label="AI confidence: [level]"`, popover accessible via keyboard focus

**SourceQuotePopover (from UX spec lines 1177-1189):**

- Background: blue-50, left border: blue-400 (3px)
- Source quote in italics (text-sm)
- Article reference (author, year, journal) in text-muted
- Page number if available
- "View in PDF" ghost button
- States: Hidden -> Hover (200ms delay) -> Visible -> Click "View in PDF" -> Navigation
- `role="tooltip"`, `aria-describedby`, visible on keyboard focus (Tab)

### Color Tokens

- `--cortex-success`: #27AE60 (High confidence)
- `--cortex-warning`: #F39C12 (Medium confidence)
- `--cortex-error`: #E74C3C (Low confidence)
- `--cortex-blue-50`: for SourceQuotePopover background
- `--cortex-blue-400`: for SourceQuotePopover left border

### Naming Conventions

- **Components**: `AiConfidenceIndicator.tsx`, `SourceQuotePopover.tsx`, `PdfViewer.tsx`
- **Cell Renderers**: `AiConfidenceCellRenderer`, `SourceQuoteCellRenderer`
- **GraphQL queries**: `cellSourceQuote`, `lowConfidenceCells`
- **GraphQL mutations**: `flagLowConfidenceCells`

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/soa.prisma` (verify/extend GridCell fields)
- `apps/api/src/modules/soa/infrastructure/services/pdf-location-service.ts` (create)
- `apps/api/src/modules/soa/graphql/queries.ts` (extend with confidence filters, source quote query)
- `apps/api/src/modules/soa/graphql/mutations.ts` (extend with bulk flag)

**Frontend files to create/modify:**

- `apps/web/src/shared/components/AiConfidenceIndicator.tsx` (create — shared component)
- `apps/web/src/shared/components/SourceQuotePopover.tsx` (create — shared component)
- `apps/web/src/features/soa/components/PdfViewer.tsx` (create)
- `apps/web/src/features/soa/components/ExtractionGrid.tsx` (extend with cell renderers)
- `apps/web/src/features/soa/components/ExtractionGridPage.tsx` (extend with confidence filters)

### References

- **Epics file**: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.4 (lines 853-868)
- **Architecture**: `_bmad-output/planning-artifacts/architecture.md` — Custom components list, ag-Grid configuration
- **UX Design Spec**: `_bmad-output/planning-artifacts/ux-design-specification.md` — AiConfidenceIndicator spec (lines 1157-1175), SourceQuotePopover spec (lines 1177-1189), Journey 3 confidence flow (lines 884-891)
- **Functional Requirements**: FR26e (per-cell confidence), FR26f (flag low confidence), FR26g (source quote storage), FR26h (source quote hover), FR26i (PDF deep-link)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
