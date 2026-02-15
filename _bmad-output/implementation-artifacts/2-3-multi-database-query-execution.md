# Story 2.3: Multi-Database Query Execution

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to execute my queries across PubMed, Cochrane, and Embase simultaneously,
So that I get comprehensive literature coverage from multiple sources (FR8, FR8a, FR8b).

## Acceptance Criteria

**Given** a valid Boolean query in an SLS session
**When** the Clinical Specialist clicks "Execute Query"
**Then** the query is sent to PubMed API (and Cochrane/Embase when configured)
**And** a Query Execution Record is created as PRISMA source of truth with execution status (success/partial/failed/cancelled) (FR8a)
**And** execution counts are tracked per query (articles returned vs articles imported) (FR8b)
**And** PubMed API rate limiting is respected (10 requests/second with API key) (P1)
**And** query execution completes in <30 seconds for up to 10,000 articles (P1)
**And** the execution progress is shown in the AsyncTaskPanel
**And** reproducibility statements are generated per database (FR18a)
**And** errors from individual databases are handled gracefully (partial results accepted)

## Tasks / Subtasks

### Backend Tasks

- [ ] **T1: Create PubMed API client** (`apps/api/src/modules/sls/infrastructure/services/pubmed-client.ts`)
  - Implement NCBI E-utilities API integration (esearch + efetch)
  - Base URL: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
  - Use API key from environment variable `PUBMED_API_KEY`
  - Rate limiting: 10 requests/second with API key, 3/second without
  - Convert Boolean query to PubMed search syntax
  - Parse XML response to extract article metadata (title, abstract, authors, DOI, PMID, journal, date)
  - Handle pagination (retmax=10000, retstart for batching)
  - Return typed `PubMedSearchResult` interface
  - **(AC: PubMed API rate limiting respected, query sent to PubMed)**

- [ ] **T2: Create Cochrane API client** (`apps/api/src/modules/sls/infrastructure/services/cochrane-client.ts`)
  - Implement Cochrane Library API integration (stub with interface if subscription not available)
  - Convert Boolean query to Cochrane search syntax
  - Parse response to common article metadata format
  - **(AC: Cochrane when configured)**

- [ ] **T3: Create Embase API client** (`apps/api/src/modules/sls/infrastructure/services/embase-client.ts`)
  - Implement Embase API integration (stub with interface if subscription not available)
  - Convert Boolean query to Embase search syntax
  - Parse response to common article metadata format
  - **(AC: Embase when configured)**

- [ ] **T4: Create database query orchestrator** (`apps/api/src/modules/sls/infrastructure/services/query-orchestrator.ts`)
  - Accept query + list of target databases
  - Execute queries in parallel across databases using `Promise.allSettled()`
  - Aggregate results, handle partial failures gracefully
  - Return combined results with per-database status
  - Timeout per database: 25 seconds (stay under 30s total)
  - **(AC: Simultaneous execution, partial results accepted, <30 seconds)**

- [ ] **T5: Create execute-query use case** (`apps/api/src/modules/sls/application/use-cases/execute-query.ts`)
  - Validate query syntax before execution
  - Validate session is not LOCKED
  - Create QueryExecution record with status `RUNNING`
  - Call query orchestrator
  - Update QueryExecution with results (articlesFound, articlesImported, status)
  - Generate reproducibility statement per database
  - Emit domain event `sls.query.executed`
  - Enqueue as BullMQ job on `sls:execute-query` queue for async execution
  - **(AC: Query Execution Record created, execution counts tracked, reproducibility statements)**

- [ ] **T6: Create query execution worker** (`apps/workers/src/processors/sls/execute-query.ts`)
  - BullMQ processor for `sls:execute-query` queue
  - Report progress to AsyncTask for real-time updates
  - Handle cancellation signal
  - Update QueryExecution status on completion/failure
  - **(AC: Execution progress shown in AsyncTaskPanel)**

- [ ] **T7: Extend QueryExecution model in Prisma schema**
  - Ensure fields: id, queryId, database (enum: PUBMED, COCHRANE, EMBASE), status (enum: RUNNING, SUCCESS, PARTIAL, FAILED, CANCELLED), articlesFound (Int), articlesImported (Int), executedAt, completedAt, reproducibilityStatement (String), errorMessage (String?)
  - Create `DatabaseSource` enum: `PUBMED`, `COCHRANE`, `EMBASE`
  - Create `ExecutionStatus` enum: `RUNNING`, `SUCCESS`, `PARTIAL`, `FAILED`, `CANCELLED`
  - **(AC: Query Execution Record as PRISMA source of truth)**

- [ ] **T8: Create reproducibility statement generator**
  - Format: "Search conducted on [date] in [database] using query: [queryString]. Results: [N] articles returned."
  - Include API version/endpoint used
  - Store per QueryExecution record
  - **(AC: Reproducibility statements generated per database)**

- [ ] **T9: Create GraphQL types and resolvers for execution**
  - `types.ts`: QueryExecution type
  - `mutations.ts`: `executeQuery(queryId, databases[])`
  - `subscriptions.ts`: `onQueryExecutionProgress(executionId)` for real-time updates
  - **(AC: Execution operations)**

### Frontend Tasks

- [ ] **T10: Create ExecuteQueryButton component** (`apps/web/src/features/sls/components/ExecuteQueryButton.tsx`)
  - "Execute Query" Primary button with brain icon
  - Database selector: checkboxes for PubMed, Cochrane, Embase
  - Disabled if query has syntax errors
  - Disabled if session is LOCKED
  - **(AC: Click "Execute Query")**

- [ ] **T11: Create QueryExecutionProgress component** (`apps/web/src/features/sls/components/QueryExecutionProgress.tsx`)
  - Real-time progress counter: "Searching PubMed... 3,200 articles found"
  - Per-database status indicators (running/success/failed)
  - ETA estimation
  - Cancel button
  - Uses GraphQL subscription for real-time updates
  - **(AC: Execution progress in AsyncTaskPanel)**

- [ ] **T12: Create QueryExecutionHistory component** (`apps/web/src/features/sls/components/QueryExecutionHistory.tsx`)
  - List of past executions per query
  - Each execution: database, date, articles found/imported, status badge, reproducibility statement
  - **(AC: Execution counts tracked, reproducibility statements)**

- [ ] **T13: Create GraphQL subscription hooks**
  - `use-query-execution-progress.ts` — Apollo subscription for real-time updates
  - Integration with AsyncTaskPanel shared component

### Testing Tasks

- [ ] **T14: Write unit tests for PubMed client**
  - Mock API responses
  - Test rate limiting logic
  - Test XML parsing
  - Test error handling (timeout, API error, malformed response)

- [ ] **T15: Write unit tests for query orchestrator**
  - Test parallel execution
  - Test partial failure handling (one DB fails, others succeed)
  - Test timeout enforcement

- [ ] **T16: Write unit tests for execute-query use case**
  - Test QueryExecution record creation
  - Test reproducibility statement generation
  - Test status transitions

## Dev Notes

### Tech Stack (Exact Versions)

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2, Node.js 20 LTS+
- **Workers**: BullMQ 5.69 (Redis-backed)
- **Real-time**: graphql-ws for subscriptions
- **Frontend**: React 19, Apollo Client 3.x (subscriptions support)
- **HTTP Client**: Built-in `fetch` or `undici` for external API calls

### PubMed API Integration Details

**E-utilities endpoints:**

- **esearch**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` — returns PMIDs
  - Parameters: `db=pubmed`, `term=[query]`, `retmax=10000`, `retmode=json`, `api_key=[key]`
- **efetch**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi` — returns full metadata
  - Parameters: `db=pubmed`, `id=[pmid_list]`, `retmode=xml`, `rettype=abstract`
- Batch fetching: max 200 PMIDs per efetch request, parallelize in batches

**Rate limiting strategy:**

- With API key: 10 requests/second
- Without API key: 3 requests/second
- Implement token bucket or sliding window rate limiter
- Use environment variable `PUBMED_API_KEY`

**Response parsing:**

- esearch returns JSON with `idlist` (array of PMIDs) and `count` (total)
- efetch returns PubMed XML format — parse using a lightweight XML parser
- Extract: ArticleTitle, AbstractText, AuthorList, ArticleId (DOI, PMID), JournalTitle, PubDate

### BullMQ Queue Configuration

- Queue name: `sls:execute-query`
- Job data interface (Zod-validated):

```typescript
interface ExecuteQueryJobData {
  queryId: string;
  sessionId: string;
  databases: DatabaseSource[];
  userId: string;
}
```

- Job options: `attempts: 2`, `backoff: { type: 'exponential', delay: 5000 }`
- Progress reporting: update `AsyncTask` record via Prisma, emit GraphQL subscription

### Performance Requirements

- P1: Query execution <30 seconds for up to 10,000 articles
- Strategy: Parallel database queries with 25s per-database timeout
- PubMed: esearch (1 call) + efetch (batched, ~50 calls for 10K articles at 200/batch)
- Total PubMed time for 10K articles: ~5-8 seconds with API key (10 req/s)

### Architecture Patterns

- Database clients are in `infrastructure/services/` (not domain)
- Use case orchestrates: validate -> create execution record -> enqueue job -> return execution ID
- Worker processes the job and updates records directly via Prisma
- Real-time progress via GraphQL subscriptions (graphql-ws)
- Domain event `sls.query.executed` emitted after completion using `DomainEvent<T>` format

### Error Handling

- Use `Promise.allSettled()` for parallel database queries — one failure does not block others
- QueryExecution status: `SUCCESS` (all databases OK), `PARTIAL` (some failed), `FAILED` (all failed), `CANCELLED` (user cancelled)
- Store `errorMessage` in QueryExecution for failed databases
- Frontend shows per-database status with appropriate StatusBadge
- Database timeout: throw `DomainError` with code `QUERY_EXECUTION_TIMEOUT`

### Anti-Patterns to Avoid

- Do NOT execute queries synchronously in the GraphQL resolver — use BullMQ
- Do NOT ignore rate limits — implement proper rate limiting for PubMed
- Do NOT fail the entire execution if one database fails — use `Promise.allSettled()`
- Do NOT store raw XML responses — parse and store structured metadata
- No `console.log` — structured logger

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (MODIFY — ensure QueryExecution model complete)
- `apps/api/src/modules/sls/infrastructure/services/pubmed-client.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/services/cochrane-client.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/services/embase-client.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/services/query-orchestrator.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/execute-query.ts` (NEW)
- `apps/api/src/modules/sls/graphql/types.ts` (MODIFY — add QueryExecution type)
- `apps/api/src/modules/sls/graphql/mutations.ts` (MODIFY — add executeQuery)
- `apps/api/src/modules/sls/graphql/subscriptions.ts` (NEW)

**Worker files to create:**

- `apps/workers/src/processors/sls/execute-query.ts` (NEW)

**Frontend files to create/modify:**

- `apps/web/src/features/sls/components/ExecuteQueryButton.tsx` (NEW)
- `apps/web/src/features/sls/components/QueryExecutionProgress.tsx` (NEW)
- `apps/web/src/features/sls/components/QueryExecutionHistory.tsx` (NEW)
- `apps/web/src/features/sls/hooks/use-query-execution-progress.ts` (NEW)
- `apps/web/src/features/sls/graphql/queries.ts` (MODIFY)
- `apps/web/src/features/sls/graphql/mutations.ts` (MODIFY)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.3)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md`
- PubMed API docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
