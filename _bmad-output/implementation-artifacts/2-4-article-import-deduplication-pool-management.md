# Story 2.4: Article Import, Deduplication & Pool Management

Status: done

## Story

As a Clinical Specialist,
I want imported articles to be automatically deduplicated and organized in a searchable pool,
So that I have a clean dataset without duplicates across databases (FR9, FR10, FR10a, FR10b, FR11).

## Acceptance Criteria

**Given** articles returned from database queries
**When** articles are imported into the SLS session
**Then** article metadata is extracted: title, abstract, authors, DOI, publication date, source database (FR9)
**And** deduplication rules are applied: DOI exact match, PMID exact match, title fuzzy >95% + same first author + same year (FR10a)
**And** deduplication statistics are tracked for PRISMA flowchart (FR10b)
**And** Article-Query Links are maintained (which query/database returned each article) (FR11)
**And** the article pool is displayed in an ag-Grid table with columns: title, authors, year, source, status
**And** the table supports sorting, filtering, column resize, and infinite scroll for 4,500+ articles
**And** articles have initial lifecycle state "pending" (FR11a)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create deduplication service** (`apps/api/src/modules/sls/infrastructure/services/deduplication-service.ts`)
  - Implement 3-tier deduplication rules:
    1. **DOI exact match**: If two articles share the same DOI (case-insensitive, trimmed), they are duplicates
    2. **PMID exact match**: If two articles share the same PMID, they are duplicates
    3. **Title fuzzy match**: If title similarity >95% (Levenshtein or Jaccard) AND same first author last name AND same publication year, they are duplicates
  - For fuzzy matching, use a string similarity library (e.g., `string-similarity` or `fastest-levenshtein`)
  - Return deduplication results: kept articles, removed duplicates, per-rule statistics
  - **(AC: Deduplication rules applied — DOI, PMID, title fuzzy)**

- [ ] **T2: Create deduplication statistics tracker**
  - Track per session: total articles before dedup, duplicates removed (by DOI, by PMID, by title fuzzy), total unique articles
  - Store in a `DeduplicationStats` model or as JSON on the session
  - These stats are needed for PRISMA flowchart (Story 2.10)
  - **(AC: Deduplication statistics tracked for PRISMA flowchart)**

- [ ] **T3: Create import-articles use case** (`apps/api/src/modules/sls/application/use-cases/import-articles.ts`)
  - Accept raw article metadata from query execution results
  - Extract and normalize metadata: title, abstract, authors (Json array), doi, pmid, publicationDate, journal, sourceDatabase
  - Run deduplication against existing articles in the session
  - Create Article records for non-duplicate articles with status `PENDING`
  - Create ArticleQueryLink records linking articles to the query/execution that found them
  - Update deduplication stats
  - Handle large batches (4,500+ articles) efficiently with Prisma `createMany`
  - **(AC: Metadata extracted, deduplication applied, Article-Query Links maintained, initial state pending)**

- [ ] **T4: Create article-repository** (`apps/api/src/modules/sls/infrastructure/repositories/article-repository.ts`)
  - `findBySessionId(sessionId, filter, pagination)` — with cursor-based pagination for ag-Grid
  - `findById(id)` — single article
  - `findByDoi(doi, sessionId)` — for deduplication check
  - `findByPmid(pmid, sessionId)` — for deduplication check
  - `createMany(articles)` — bulk insert
  - `updateStatus(id, status)` — lifecycle state transitions
  - `countByStatus(sessionId)` — for dashboard metrics
  - Support offset-based pagination for ag-Grid: `PaginatedArticles { items, total, offset, limit }`
  - **(AC: Article pool management)**

- [ ] **T5: Create Article domain entity** (`apps/api/src/modules/sls/domain/entities/article.ts`)
  - Define lifecycle state transitions: `PENDING -> SCORED -> INCLUDED/EXCLUDED/SKIPPED -> FULL_TEXT_REVIEW -> FINAL_INCLUDED/FINAL_EXCLUDED`
  - Validate state transitions (e.g., cannot go from EXCLUDED back to PENDING without justification)
  - Business method `transitionStatus(newStatus, justification)` with logged reason
  - **(AC: Article lifecycle states)**

- [ ] **T6: Extend GraphQL types for articles**
  - `types.ts`: Article type, ArticleStatus enum, ArticleFilter input, PaginatedArticles type
  - `queries.ts`: `articles(sessionId, filter, offset, limit)`, `articleCount(sessionId, groupBy: status)`
  - Article filter: by status, by score range, by year, by source database, by search text (title/abstract)
  - **(AC: Article pool operations)**

- [ ] **T7: Create Zod schemas for article data**
  - `packages/shared/src/schemas/article.schema.ts`
  - Validate article metadata structure
  - Validate status transitions

### Frontend Tasks

- [ ] **T8: Create ArticleTable component** (`apps/web/src/features/sls/components/ArticleTable.tsx`)
  - ag-Grid Enterprise configured with CORTEX theme
  - Columns: title, authors (truncated), year, source database, status (StatusBadge), AI score (when scored)
  - Column features: sorting, filtering, resize, column reordering
  - Infinite scroll (ag-Grid server-side row model) for 4,500+ articles
  - Row hover: blue-50 background
  - Row selection: checkbox column for bulk actions
  - Accent bar left (3px) colored by status (green=included, red=excluded, orange=uncertain, gray=pending)
  - **(AC: ag-Grid table with columns, sorting, filtering, infinite scroll)**

- [ ] **T9: Create ArticlePoolDashboard component** (`apps/web/src/features/sls/components/ArticlePoolDashboard.tsx`)
  - Metrics cards (Stripe-style large numbers): Total articles, Deduplicated removed, Pending, Scored, Included, Excluded
  - Filter tabs: All, Pending, Scored, Included, Excluded
  - Each tab shows count
  - **(AC: Article pool organized and searchable)**

- [ ] **T10: Create article detail in side panel**
  - When row clicked (or Space key), detail panel (380px right) opens
  - Shows: full title, full abstract, all authors, DOI (linked), PMID (linked to PubMed), publication date, journal, source database
  - Status badge + transition history
  - **(AC: Article metadata display)**

- [ ] **T11: Implement ag-Grid infinite scroll with Apollo Client**
  - Server-side row model using ag-Grid's datasource pattern
  - Fetch pages via GraphQL query with offset/limit
  - Cache management with Apollo Client normalized cache
  - Maintain scroll position when switching tabs/filters

- [ ] **T12: Create deduplication summary component** (`apps/web/src/features/sls/components/DeduplicationSummary.tsx`)
  - Show deduplication results after import: total found, duplicates removed (by DOI, by PMID, by title), unique articles added
  - Toast notification on import completion
  - **(AC: Deduplication statistics visible)**

### Testing Tasks

- [ ] **T13: Write unit tests for deduplication service**
  - Test DOI exact match (case-insensitive)
  - Test PMID exact match
  - Test title fuzzy match at 95% threshold
  - Test combined rules (DOI match takes precedence)
  - Test edge cases: missing DOI, missing PMID, very similar titles

- [ ] **T14: Write unit tests for article lifecycle transitions**
  - Valid transitions: PENDING -> SCORED, SCORED -> INCLUDED, etc.
  - Invalid transitions: EXCLUDED -> PENDING (without special flow)
  - Test justification requirement for transitions

- [ ] **T15: Write integration test for import pipeline**
  - Execute query -> import articles -> verify deduplication -> verify article count

## Dev Notes

### Tech Stack (Exact Versions)

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2
- **Frontend**: React 19, ag-Grid Enterprise 33.x (`ag-grid-react`), Apollo Client 3.x
- **Fuzzy matching**: `fastest-levenshtein` or `string-similarity` npm package
- **Pagination**: Offset-based for ag-Grid integration (`PaginatedArticles { items, total, offset, limit }`)

### Deduplication Algorithm Details

Priority order (first match wins):

1. **DOI exact**: `LOWER(TRIM(article_a.doi)) = LOWER(TRIM(article_b.doi))` — highest confidence
2. **PMID exact**: `article_a.pmid = article_b.pmid` — high confidence
3. **Title fuzzy**: `similarity(normalize(title_a), normalize(title_b)) > 0.95 AND firstAuthorLastName_a = firstAuthorLastName_b AND year_a = year_b`

Normalization for title comparison:

- Lowercase
- Remove punctuation except hyphens
- Remove extra whitespace
- Remove common prefixes ("The ", "A ", "An ")

When a duplicate is found, keep the article with the most complete metadata (prefer DOI > PMID > title-only). Track the "primary" article and link duplicates to it.

### ag-Grid Configuration

```typescript
// CORTEX ag-Grid theme overrides
const gridTheme = {
  headerBackgroundColor: '#F8F9FA',
  rowHoverColor: '#F0F6FB', // blue-50
  selectedRowColor: '#E1EDF8', // blue-100
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px', // text-sm
  headerFontWeight: '600',
};
```

Server-side row model for infinite scroll:

- Page size: 100 rows
- Fetch via Apollo Client GraphQL query
- ag-Grid datasource `getRows` calls Apollo query with `offset` and `limit`

### Article Lifecycle State Machine

```
PENDING ──→ SCORED ──→ INCLUDED ──→ FULL_TEXT_REVIEW ──→ FINAL_INCLUDED
                   └──→ EXCLUDED                     └──→ FINAL_EXCLUDED
                   └──→ SKIPPED
```

State transitions require:

- `userId` — who made the decision
- `reason` — why (text, optional for SCORED, required for INCLUDED/EXCLUDED)
- `exclusionCodeId` — when EXCLUDED, reference to ExclusionCode
- `timestamp` — ISO 8601

### Performance Considerations

- Bulk import: Use Prisma `createMany()` for articles (skip duplicates)
- Deduplication: First check DOI index, then PMID index (fast exact matches), then fuzzy match only for articles without DOI/PMID
- ag-Grid: Server-side row model with 100-row pages, no client-side data loading of full dataset
- SC3: Shared article database must scale to 100,000+ indexed articles

### Anti-Patterns to Avoid

- Do NOT load all 4,500+ articles into browser memory — use ag-Grid server-side row model
- Do NOT run fuzzy matching against the entire article database — scope to session
- Do NOT skip deduplication stats — they are critical for PRISMA flowchart
- Do NOT allow status transitions without logging (audit middleware handles mutations, but also log in ScreeningDecision)

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (MODIFY — ensure Article indexes, DeduplicationStats)
- `apps/api/src/modules/sls/domain/entities/article.ts` (NEW)
- `apps/api/src/modules/sls/domain/value-objects/article-status.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/services/deduplication-service.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/repositories/article-repository.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/import-articles.ts` (NEW)
- `apps/api/src/modules/sls/graphql/types.ts` (MODIFY — add Article types)
- `apps/api/src/modules/sls/graphql/queries.ts` (MODIFY — add article queries)

**Frontend files to create/modify:**

- `apps/web/src/features/sls/components/ArticleTable.tsx` (NEW)
- `apps/web/src/features/sls/components/ArticlePoolDashboard.tsx` (NEW)
- `apps/web/src/features/sls/components/DeduplicationSummary.tsx` (NEW)
- `apps/web/src/features/sls/graphql/queries.ts` (MODIFY — add article queries)

**Shared files:**

- `packages/shared/src/schemas/article.schema.ts` (NEW)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.4)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
