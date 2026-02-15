# Story 6.5: Complaints & Incidents Data Import

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to import complaints and incidents data from Zoho Desk,
So that post-market complaint data is integrated into PMS analysis.

## Acceptance Criteria

**Given** a PMS Cycle with complaint monitoring activity
**When** the Clinical Specialist imports complaint data
**Then** complaints and incidents can be entered manually or imported from Zoho Desk API (FR62a)
**And** complaint classification follows IMDRF standards
**And** each complaint includes: date, description, device identifier, severity, resolution
**And** import can be done via manual entry or API sync

## Tasks / Subtasks

### Backend

- [ ] Verify `Complaint` model in `packages/prisma/schema/pms.prisma` has all required fields:
  - id (UUID v7), pmsCycleId, activityId (references PmcfActivity of type COMPLAINTS)
  - date (DateTime), reportDate (DateTime), description (Text)
  - deviceIdentifier (String), lotNumber (String, optional), serialNumber (String, optional)
  - severity (LOW/MEDIUM/HIGH/CRITICAL)
  - classification (String - IMDRF code), classificationDescription (String)
  - status (OPEN/INVESTIGATING/RESOLVED/CLOSED)
  - resolution (Text, optional), resolutionDate (DateTime, optional)
  - source (MANUAL/ZOHO_DESK)
  - externalId (String, optional - Zoho Desk ticket ID)
  - reporterName (String, optional), reporterContact (String, optional)
  - isIncident (Boolean - distinguishes complaints from incidents/vigilance reports)
  - regulatoryReportRequired (Boolean, default false)
  - createdAt, updatedAt
- [ ] Create `Incident` model (or extend Complaint with incident-specific fields):
  - harmSeverity (NONE/MILD/MODERATE/SEVERE/DEATH)
  - competentAuthorityNotified (Boolean)
  - notificationDate (DateTime, optional)
  - correctiveAction (Text, optional)
- [ ] Create Zoho Desk integration service `apps/api/src/modules/pms/infrastructure/services/zoho-desk-client.ts`:
  - Configure Zoho Desk API credentials (OAuth 2.0)
  - Method: `fetchTickets(filters: ZohoFilters)` — get tickets by date range, status, tags
  - Method: `fetchTicketById(ticketId)` — get single ticket details
  - Method: `mapZohoTicketToComplaint(ticket)` — transform Zoho data to Complaint entity
  - Handle Zoho API rate limits and pagination
  - Support for Zoho Desk custom fields (device identifier, lot number)
  - Zod validation on API responses (validate at boundary per architecture rules)
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/import-complaints.ts`:
  - Accept: pmsCycleId, source (MANUAL or ZOHO_DESK), date range (for API sync)
  - For ZOHO_DESK source:
    - Call ZohoDeskClient to fetch tickets
    - Map each ticket to Complaint entity
    - Deduplicate: skip if externalId already exists for this cycle
    - Create Complaint records
    - Return import statistics: imported, skipped (duplicates), errors
  - For MANUAL source: just create the complaint record
  - Link complaints to the COMPLAINTS activity in the cycle
  - Emit domain event `pms.complaints.imported`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/create-complaint.ts`:
  - Manual complaint creation
  - Validate IMDRF classification code format
  - Validate required fields (date, description, deviceIdentifier, severity)
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/update-complaint.ts`:
  - Update complaint fields (description, severity, classification, resolution)
  - Handle status transitions: OPEN -> INVESTIGATING -> RESOLVED -> CLOSED
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/sync-zoho-complaints.ts`:
  - Run as async BullMQ job `pms:sync-zoho-complaints`
  - Incremental sync: only fetch new/updated tickets since last sync
  - Store last sync timestamp per cycle
  - Progress tracking via AsyncTask panel
- [ ] Create DTOs:
  - `create-complaint.dto.ts`
  - `update-complaint.dto.ts`
  - `import-complaints.dto.ts`
  - `zoho-sync-options.dto.ts`
- [ ] Create repository `apps/api/src/modules/pms/infrastructure/repositories/complaint-repository.ts`:
  - `findComplaintById(id)`
  - `findComplaintsByCycle(cycleId, filter?)`
  - `findComplaintByExternalId(cycleId, externalId)`
  - `createComplaint(data)`
  - `updateComplaint(id, data)`
  - `getComplaintStatistics(cycleId)` — counts by severity, status, classification
  - `getComplaintTimeSeries(cycleId, granularity)` — for trend charts
- [ ] Create IMDRF classification reference data:
  - Store IMDRF codes in `packages/shared/src/constants/imdrf-codes.ts`
  - Include top-level categories and common sub-categories
  - Provide search/autocomplete functionality via GraphQL query
- [ ] Add GraphQL types:
  - Complaint type
  - ComplaintSeverity enum (LOW, MEDIUM, HIGH, CRITICAL)
  - ComplaintStatus enum (OPEN, INVESTIGATING, RESOLVED, CLOSED)
  - ComplaintSource enum (MANUAL, ZOHO_DESK)
  - HarmSeverity enum (NONE, MILD, MODERATE, SEVERE, DEATH)
  - ComplaintStatistics type
  - ComplaintFilter input
  - ImdrfCode type (code, description, category)
  - ImportResult type (imported, skipped, errors)
- [ ] Add GraphQL queries:
  - `complaints(cycleId: UUID!, filter: ComplaintFilter)` — paginated, filterable list
  - `complaint(id: UUID!)` — single complaint detail
  - `complaintStatistics(cycleId: UUID!)` — summary stats
  - `imdrfCodes(search: String)` — search IMDRF codes for classification
- [ ] Add GraphQL mutations:
  - `createComplaint(cycleId: UUID!, input: CreateComplaintInput!)`
  - `updateComplaint(id: UUID!, input: UpdateComplaintInput!)`
  - `importZohoComplaints(cycleId: UUID!, dateFrom: DateTime!, dateTo: DateTime!)`
  - `syncZohoComplaints(cycleId: UUID!)` — trigger incremental sync
- [ ] Add BullMQ processor `apps/workers/src/processors/pms/sync-zoho-complaints.ts`:
  - Process Zoho sync job
  - Report progress to AsyncTask
  - Handle errors gracefully (partial imports)
- [ ] Write unit tests for Zoho ticket to Complaint mapping
- [ ] Write unit tests for deduplication logic
- [ ] Write integration test for complaint CRUD operations

### Frontend

- [ ] Create `apps/web/src/features/pms/components/ComplaintsDashboard.tsx`:
  - Summary statistics at top: total complaints, by severity (cards with numbers, Stripe-style)
  - ag-Grid table of complaints:
    - Columns: Date, Description (truncated), Device ID, Severity (color badge), Classification (IMDRF code), Status (StatusBadge), Source (MANUAL/ZOHO badge)
    - Accent bar left: color by severity
    - Column filtering, sorting, search
    - Row click opens detail panel
  - Filter bar: severity, status, source, date range
- [ ] Create `ComplaintDetailPanel.tsx` (right panel, 380px):
  - Full complaint details
  - Editable fields (when not CLOSED): description, severity, classification, resolution
  - IMDRF classification: searchable select/combobox with autocomplete
  - Status transition buttons: "Start Investigation", "Resolve", "Close"
  - Resolution field (required when resolving)
  - If incident: additional fields for harm severity, competent authority notification
  - Audit trail section
- [ ] Create `ComplaintCreationForm.tsx`:
  - Dialog or inline form for manual complaint entry
  - Fields: date, description, device identifier, lot/serial number, severity, IMDRF classification
  - Toggle: "This is an incident/vigilance report" (shows additional fields)
  - Toggle: "Regulatory report required"
  - Zod validation
- [ ] Create `ZohoImportPanel.tsx`:
  - Import configuration:
    - Date range selector (from/to)
    - Preview of tickets to import (count)
    - "Import" button (Primary)
  - Sync button: "Sync Latest" (incremental)
  - Import progress via AsyncTaskPanel integration
  - Import results display: "Imported: 15 | Skipped: 3 (duplicates) | Errors: 0"
  - Last sync timestamp display
- [ ] Create `ImdrfClassificationSelect.tsx`:
  - Combobox (shadcn Command pattern) for IMDRF code search
  - Shows code + description
  - Grouped by category
  - Keyboard navigation
- [ ] Add "Complaints" section to PMS sidebar navigation
- [ ] Connect complaint import progress to AsyncTaskPanel
- [ ] Write component tests for ComplaintCreationForm validation
- [ ] Write component tests for IMDRF classification search

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Frontend:** React 19, Apollo Client 3.x, ag-Grid 33, shadcn/ui + Tailwind CSS 4
- **Workers:** BullMQ 5.69 for async Zoho sync
- **External API:** Zoho Desk REST API v1

### Zoho Desk API Integration

- **Authentication:** OAuth 2.0 with refresh token (store credentials in env vars / K8s secrets)
- **Endpoints:**
  - `GET /api/v1/tickets` — list tickets with filters
  - `GET /api/v1/tickets/{ticketId}` — ticket details
- **Rate Limits:** Follow Zoho API rate limits (varies by plan)
- **Custom Fields:** Map Zoho custom fields to complaint fields (device ID, lot number, etc.)
- **Error Handling:** Graceful degradation if Zoho API is unavailable; fall back to manual entry
- **Configuration:** Store Zoho API credentials and custom field mappings in environment variables
  - `ZOHO_DESK_CLIENT_ID`, `ZOHO_DESK_CLIENT_SECRET`, `ZOHO_DESK_REFRESH_TOKEN`, `ZOHO_DESK_ORG_ID`

### IMDRF Classification System

- International Medical Device Regulators Forum (IMDRF) coding system for complaints
- Top-level categories (examples): Clinical, Non-Clinical, Patient Problem, Device Problem
- Store reference data in `packages/shared/src/constants/imdrf-codes.ts` as a static array
- Provide fuzzy search via GraphQL query for the classification combobox
- This is a lookup/reference dataset, not user-editable

### Complaint vs. Incident

- **Complaint:** User/patient report of dissatisfaction or issue with the device
- **Incident:** Event that led to or could have led to harm (regulatory significance)
- Incidents have additional fields: harmSeverity, competentAuthorityNotified
- The `isIncident` boolean flag determines which fields are shown in the UI

### Async Sync Pattern

- Zoho sync runs as BullMQ job (`pms:sync-zoho-complaints`) in workers
- Progress reported via AsyncTask (visible in AsyncTaskPanel)
- Incremental sync: store `lastSyncTimestamp` per cycle, only fetch newer tickets
- Deduplication by `externalId` (Zoho ticket ID)

### Naming Conventions

- Domain events: `pms.complaints.imported`, `pms.complaint.created`, `pms.complaint.resolved`
- BullMQ queue: `pms:sync-zoho-complaints`
- Zoho service: `zoho-desk-client.ts`
- GraphQL: `createComplaint`, `importZohoComplaints`, `syncZohoComplaints`

### Anti-Patterns to Avoid

- Do NOT store Zoho API credentials in the database or code — use env vars
- Do NOT call Zoho API synchronously from GraphQL resolvers — use BullMQ async job
- Do NOT allow complaint deletion (regulatory data must be retained)
- Do NOT skip IMDRF classification — it is required for PSUR reporting

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    import-complaints.ts        # NEW
    create-complaint.ts         # NEW
    update-complaint.ts         # NEW
    sync-zoho-complaints.ts     # NEW
  application/dtos/
    create-complaint.dto.ts     # NEW
    update-complaint.dto.ts     # NEW
    import-complaints.dto.ts    # NEW
  infrastructure/
    repositories/
      complaint-repository.ts   # NEW
    services/
      zoho-desk-client.ts       # NEW (or updated)

apps/workers/src/processors/pms/
  sync-zoho-complaints.ts       # NEW

packages/shared/src/constants/
  imdrf-codes.ts                # NEW

apps/web/src/features/pms/
  components/
    ComplaintsDashboard.tsx      # NEW
    ComplaintDetailPanel.tsx     # NEW
    ComplaintCreationForm.tsx    # NEW
    ZohoImportPanel.tsx         # NEW
    ImdrfClassificationSelect.tsx  # NEW
```

### References

- **PRD FRs:** FR62a
- **Architecture:** External integration `modules/pms/infrastructure/services/zoho-desk-client.ts`, BullMQ async processing, Zod validation at API boundaries, MinIO for attachments
- **UX Spec:** ag-Grid with CORTEX theming, detail panel (380px), Combobox/Command pattern for search, AsyncTaskPanel for import progress, inline alerts for import results
- **Dependencies:** Story 6.3 (PMS Cycle), Story 6.4 (PMCF Activity of type COMPLAINTS)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
