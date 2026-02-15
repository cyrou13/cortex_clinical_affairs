# Story 2.11: PDF Retrieval & Verification

Status: review

## Story

As a Clinical Specialist,
I want the system to automatically retrieve and verify full-text PDFs for included articles,
So that I have access to source documents for extraction and analysis (FR19a-FR19d).

## Acceptance Criteria

**Given** articles included in a locked or in-progress SLS dataset
**When** PDF retrieval is triggered
**Then** the system searches multiple sources: PMC, Unpaywall, Europe PMC, DOI resolution (FR19a)
**And** retrieved PDFs undergo smart verification: title/authors extracted and compared to metadata (FR19b)
**And** mismatched PDFs are flagged for manual review (FR19d)
**And** Clinical Specialist can manually upload PDFs for articles without automatic retrieval (FR19c)
**And** PDF retrieval runs asynchronously with progress tracking in AsyncTaskPanel
**And** PDFs are stored in MinIO (S3-compatible object storage)
**And** retrieval statistics are shown: X/Y PDFs found, Z mismatches to review

## Tasks / Subtasks

### Backend Tasks

- [x] **T1: Create PDF retrieval service** (`apps/api/src/modules/sls/infrastructure/services/pdf-retrieval-service.ts`)
  - Multi-source retrieval with priority order:
    1. **PMC (PubMed Central)**: Check if PMCID exists, download from OA endpoint
    2. **Unpaywall**: Query `https://api.unpaywall.org/v2/{doi}?email={email}` for open access PDF URL
    3. **Europe PMC**: Query `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:{doi}` for full text link
    4. **DOI resolution**: Follow DOI URL to publisher, check for open access PDF
  - For each source, attempt download and return first successful result
  - Handle timeouts (10s per source), rate limits, 404s
  - Return: `{ found: boolean, source: string, pdfBuffer: Buffer | null, pdfUrl: string | null }`
  - **(AC: Multiple sources — PMC, Unpaywall, Europe PMC, DOI resolution)**

- [x] **T2: Create MinIO storage service** (`apps/api/src/modules/sls/infrastructure/services/minio-storage-service.ts`)
  - Connect to MinIO using `minio` npm package or AWS S3 SDK (`@aws-sdk/client-s3`)
  - Bucket: `cortex-pdfs` (create if not exists)
  - Key pattern: `projects/{projectId}/sessions/{sessionId}/articles/{articleId}/fulltext.pdf`
  - Methods:
    - `uploadPdf(key, buffer, metadata)`: Upload PDF with metadata
    - `getPdfUrl(key)`: Generate pre-signed URL for download (1 hour expiry)
    - `deletePdf(key)`: Delete PDF
    - `pdfExists(key)`: Check if PDF exists
  - **(AC: PDFs stored in MinIO)**

- [x] **T3: Create PDF verification service** (`apps/api/src/modules/sls/infrastructure/services/pdf-verification-service.ts`)
  - Smart verification: extract text from first page of PDF
  - Extract title and author names from PDF text (simple regex/heuristic or LLM fallback)
  - Compare extracted title with article metadata title (fuzzy match >80%)
  - Compare extracted authors with article metadata authors (at least first author match)
  - Return: `{ verified: boolean, confidence: number, extractedTitle: string, extractedAuthors: string[], mismatchReasons: string[] }`
  - **(AC: Smart verification — title/authors extracted and compared)**

- [x] **T4: Create retrieve-pdfs worker** (`apps/workers/src/processors/sls/retrieve-pdfs.ts`)
  - BullMQ processor for `sls:retrieve-pdfs` queue
  - Process articles in batches (5-10 concurrent retrievals)
  - For each included article:
    1. Check if PDF already exists in MinIO (skip if exists)
    2. Attempt retrieval from multiple sources
    3. If found: upload to MinIO, run verification
    4. If verification fails: flag as `PDF_MISMATCH`
    5. If not found: flag as `PDF_NOT_FOUND`
  - Report progress: update AsyncTask record
  - On completion: emit domain event `sls.pdfs.retrieved`
  - **(AC: Asynchronous retrieval with progress tracking)**

- [x] **T5: Create retrieve-pdfs use case** (`apps/api/src/modules/sls/application/use-cases/retrieve-pdfs.ts`)
  - Triggered by user clicking "Retrieve PDFs" or automatically after screening
  - Fetch all INCLUDED articles without PDFs
  - Create AsyncTask record
  - Enqueue BullMQ job on `sls:retrieve-pdfs` queue
  - Return task ID for progress subscription
  - **(AC: PDF retrieval triggered)**

- [x] **T6: Create manual PDF upload use case** (`apps/api/src/modules/sls/application/use-cases/upload-pdf.ts`)
  - Accept: articleId, file (multipart upload)
  - Validate file is PDF (MIME type check)
  - Upload to MinIO
  - Run verification against article metadata
  - If mismatch: flag for review but still store
  - Update article PDF status
  - **(AC: Manual upload for articles without automatic retrieval)**

- [x] **T7: Create PDF mismatch resolution use case**
  - `resolve-pdf-mismatch.ts`:
    - Accept: articleId, resolution (ACCEPT_MISMATCH, REJECT_PDF, UPLOAD_CORRECT_PDF)
    - If ACCEPT_MISMATCH: mark as verified with override flag
    - If REJECT_PDF: delete from MinIO, set pdfStatus to NOT_FOUND
    - If UPLOAD_CORRECT_PDF: delete old, accept new upload
  - **(AC: Review and resolve PDF mismatch warnings)**

- [x] **T8: Extend Article model for PDF fields**
  - Add fields to Article: `pdfStatus` (enum: NONE, RETRIEVING, FOUND, NOT_FOUND, MISMATCH, VERIFIED, MANUAL_UPLOAD), `pdfStorageKey` (String?), `pdfSource` (String?), `pdfVerificationResult` (Json?)
  - Create `PdfStatus` enum
  - Run migration
  - **(AC: PDF status tracking)**

- [x] **T9: Create GraphQL types and resolvers for PDF**
  - Types: PdfStatus enum, PdfRetrievalStats
  - Queries: `pdfRetrievalStats(sessionId)` — X/Y found, Z mismatches
  - Mutations: `launchPdfRetrieval(sessionId)`, `uploadArticlePdf(articleId, file)`, `resolvePdfMismatch(articleId, resolution)`
  - Subscriptions: `onPdfRetrievalProgress(taskId)`
  - File upload: Use Fastify multipart plugin for PDF upload
  - **(AC: API operations)**

### Frontend Tasks

- [x] **T10: Create PdfRetrievalPanel component** (`apps/web/src/features/sls/components/PdfRetrievalPanel.tsx`)
  - "Retrieve PDFs" primary button with download icon
  - Progress display: "Retrieving PDFs... 200 / 641 articles checked. Found: 180, Not found: 15, Mismatches: 5"
  - Progress bar (blue-500 striped animation)
  - Cancel button
  - **(AC: Retrieval with progress tracking in AsyncTaskPanel)**

- [x] **T11: Create PdfStatusColumn for ArticleTable**
  - Add PDF status column to article table: icon-based
    - VERIFIED: green check + PDF icon
    - FOUND: blue PDF icon
    - NOT_FOUND: gray PDF icon with X
    - MISMATCH: orange warning PDF icon
    - MANUAL_UPLOAD: blue upload PDF icon
  - Click on PDF icon: opens PDF in new tab (pre-signed URL)
  - **(AC: PDF status visible per article)**

- [x] **T12: Create ManualPdfUpload component** (`apps/web/src/features/sls/components/ManualPdfUpload.tsx`)
  - Drag-and-drop zone or file picker for PDF upload
  - Shows upload progress
  - Validates file type (PDF only)
  - After upload: shows verification result
  - If mismatch: shows warning with options (Accept / Reject / Re-upload)
  - **(AC: Manual upload capability)**

- [x] **T13: Create PdfMismatchReview component** (`apps/web/src/features/sls/components/PdfMismatchReview.tsx`)
  - List of articles with mismatched PDFs
  - For each mismatch: article metadata vs extracted PDF data (side-by-side comparison)
    - Expected title vs. extracted title
    - Expected authors vs. extracted authors
    - Mismatch reasons
  - Action buttons: "Accept (correct PDF, metadata differs)" / "Reject (wrong PDF)" / "Upload Correct PDF"
  - **(AC: Review and resolve PDF mismatch warnings)**

- [x] **T14: Create retrieval statistics summary** (`apps/web/src/features/sls/components/PdfRetrievalStats.tsx`)
  - Metrics cards: Total articles, PDFs found, PDFs not found, Mismatches to review
  - Percentage bar: "89% PDFs retrieved"
  - Link to mismatch review if mismatches > 0
  - **(AC: Retrieval statistics shown)**

### Testing Tasks

- [x] **T15: Write unit tests for PDF retrieval service**
  - Mock external API responses (Unpaywall, PMC, Europe PMC)
  - Test priority order (PMC first, then Unpaywall, etc.)
  - Test timeout handling
  - Test rate limit handling

- [x] **T16: Write unit tests for PDF verification**
  - Test title match (fuzzy >80%)
  - Test author match
  - Test mismatch detection
  - Test with various PDF formats

- [x] **T17: Write integration test for retrieval flow**
  - Upload test PDF -> verify -> check MinIO storage -> check article status

## Dev Notes

### Tech Stack (Exact Versions)

- **Workers**: BullMQ 5.69
- **Object Storage**: MinIO via `@aws-sdk/client-s3` (S3-compatible)
- **PDF Parsing**: `pdf-parse` or `pdfjs-dist` for text extraction from first page
- **HTTP Client**: `undici` or built-in `fetch` for API calls
- **File Upload**: `@fastify/multipart` for PDF upload handling
- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2

### MinIO Configuration

Environment variables:

```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cortex-pdfs
MINIO_USE_SSL=false
```

Docker Compose service (already in `docker/docker-compose.yml`):

```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  ports:
    - '9000:9000'
    - '9001:9001'
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  volumes:
    - minio-data:/data
```

### PDF Source APIs

| Source         | API                                                                          | Rate Limit | Notes                              |
| -------------- | ---------------------------------------------------------------------------- | ---------- | ---------------------------------- |
| PMC            | `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMCID`                 | 3 req/s    | Only for open access articles      |
| Unpaywall      | `https://api.unpaywall.org/v2/{doi}?email={email}`                           | 100K/day   | Requires email, returns OA PDF URL |
| Europe PMC     | `https://www.ebi.ac.uk/europepmc/webservices/rest/{source}/{id}/fullTextXML` | 10 req/s   | XML full text, PDF link            |
| DOI Resolution | `https://doi.org/{doi}` (follow redirects)                                   | N/A        | Check publisher page for PDF link  |

### PDF Verification Algorithm

```typescript
async function verifyPdf(
  pdfBuffer: Buffer,
  articleMetadata: ArticleMetadata,
): PdfVerificationResult {
  // 1. Extract text from first 2 pages
  const text = await extractTextFromPdf(pdfBuffer, { maxPages: 2 });

  // 2. Extract title (usually first large text on page 1)
  const extractedTitle = extractTitleFromText(text);

  // 3. Extract authors (usually below title)
  const extractedAuthors = extractAuthorsFromText(text);

  // 4. Compare
  const titleMatch = similarity(normalize(extractedTitle), normalize(articleMetadata.title)) > 0.8;
  const authorMatch = articleMetadata.authors.some((a) =>
    extractedAuthors.some((ea) => similarity(a.lastName, ea) > 0.85),
  );

  return {
    verified: titleMatch && authorMatch,
    confidence: (titleMatch ? 50 : 0) + (authorMatch ? 50 : 0),
    extractedTitle,
    extractedAuthors,
    mismatchReasons: [
      ...(!titleMatch
        ? [`Title mismatch: expected "${articleMetadata.title}", found "${extractedTitle}"`]
        : []),
      ...(!authorMatch
        ? [`Author mismatch: expected "${articleMetadata.authors[0]?.lastName}", not found in PDF`]
        : []),
    ],
  };
}
```

### BullMQ Job Configuration

```typescript
// Queue: sls:retrieve-pdfs
interface RetrievePdfsJobData {
  sessionId: string;
  taskId: string;
  userId: string;
  articleIds: string[]; // Articles to retrieve PDFs for
}

// Job options
{
  attempts: 1,
  removeOnComplete: true,
}
```

### Architecture Patterns

- PDF retrieval is an infrastructure concern — services in `infrastructure/services/`
- MinIO integration uses S3-compatible SDK — same code works with AWS S3 in production
- Verification is a domain concern (business rules about what constitutes a valid PDF match)
- File uploads bypass GraphQL — use Fastify multipart handler directly, then call use case
- Pre-signed URLs for PDF access (time-limited, secure)

### Anti-Patterns to Avoid

- Do NOT store PDFs in the database — use MinIO/S3 object storage
- Do NOT skip verification — always verify retrieved PDFs against metadata
- Do NOT auto-accept mismatched PDFs — flag for human review
- Do NOT download PDFs synchronously in GraphQL resolvers — use BullMQ worker
- Do NOT expose MinIO credentials to the frontend — use pre-signed URLs
- Do NOT retry failed sources indefinitely — try each source once, mark as NOT_FOUND if all fail

### Project Structure Notes

**Backend files to create/modify:**

- `packages/prisma/schema/sls.prisma` (MODIFY — add PDF fields to Article)
- `apps/api/src/modules/sls/infrastructure/services/pdf-retrieval-service.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/services/minio-storage-service.ts` (NEW)
- `apps/api/src/modules/sls/infrastructure/services/pdf-verification-service.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/retrieve-pdfs.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/upload-pdf.ts` (NEW)
- `apps/api/src/modules/sls/application/use-cases/resolve-pdf-mismatch.ts` (NEW)
- `apps/api/src/modules/sls/graphql/types.ts` (MODIFY — add PDF types)
- `apps/api/src/modules/sls/graphql/mutations.ts` (MODIFY — add PDF mutations)
- `apps/api/src/modules/sls/graphql/queries.ts` (MODIFY — add PDF queries)

**Worker files to create:**

- `apps/workers/src/processors/sls/retrieve-pdfs.ts` (NEW)

**Frontend files to create:**

- `apps/web/src/features/sls/components/PdfRetrievalPanel.tsx` (NEW)
- `apps/web/src/features/sls/components/ManualPdfUpload.tsx` (NEW)
- `apps/web/src/features/sls/components/PdfMismatchReview.tsx` (NEW)
- `apps/web/src/features/sls/components/PdfRetrievalStats.tsx` (NEW)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.11)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md`
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- All backend use cases, services, and worker already implemented
- All frontend components and tests already implemented
- Added GraphQL layer: PdfRetrievalResultType, ResolvePdfMismatchResultType, PdfRetrievalStatsType types
- Added mutations: launchPdfRetrieval, resolvePdfMismatch
- Added query: pdfRetrievalStats
- Added frontend GraphQL: LAUNCH_PDF_RETRIEVAL, RESOLVE_PDF_MISMATCH, GET_PDF_RETRIEVAL_STATS
- All 2526 tests passing (1442 API + 1084 web)

### File List

- apps/api/src/modules/sls/graphql/types.ts (MODIFIED)
- apps/api/src/modules/sls/graphql/mutations.ts (MODIFIED)
- apps/api/src/modules/sls/graphql/queries.ts (MODIFIED)
- apps/web/src/features/sls/graphql/mutations.ts (MODIFIED)
- apps/web/src/features/sls/graphql/queries.ts (MODIFIED)
