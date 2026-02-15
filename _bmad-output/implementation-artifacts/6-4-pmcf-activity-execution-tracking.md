# Story 6.4: PMCF Activity Execution & Tracking

Status: ready-for-dev

## Story

As a Clinical Specialist,
I want to execute and track PMCF activities within a PMS Cycle,
So that all post-market data collection is systematically performed.

## Acceptance Criteria

**Given** a PMS Cycle with planned activities
**When** the Clinical Specialist executes PMCF activities
**Then** activity types include: Literature Update, Named Device Search, User Surveys, Vigilance Monitoring, Complaints, Installed Base Tracking, Trend Analysis (FR62)
**And** activity completion status is tracked per activity (FR62c)
**And** each completed activity has: summary of findings, data collected, conclusions
**And** activities can be assigned to specific team members
**And** the cycle dashboard shows progress: "5/7 activities completed"

## Tasks / Subtasks

### Backend

- [ ] Verify `PmcfActivity` model in `packages/prisma/schema/pms.prisma` has all required fields:
  - id (UUID v7), pmsCycleId, activityType (ActivityType enum), assigneeId (references User), title, description
  - status (PLANNED/IN_PROGRESS/COMPLETED), startedAt, completedAt
  - findingsSummary (Text), dataCollected (Json), conclusions (Text)
  - attachments (Json - array of file references)
  - createdAt, updatedAt
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/execute-activity.ts`:
  - Start activity: transition PLANNED -> IN_PROGRESS, set startedAt
  - Activity-type-specific logic:
    - `LITERATURE_UPDATE`: allow linking to a new SLS session (type `pms_update`)
    - `NAMED_DEVICE_SEARCH`: allow linking to a vigilance search (references CER Named Device Search)
    - `USER_SURVEYS`: allow attaching survey results (file upload to MinIO)
    - `VIGILANCE_MONITORING`: allow entering vigilance search results (structured data)
    - `COMPLAINTS`: handled in Story 6.5 (link to complaint data)
    - `INSTALLED_BASE`: allow entering installed base metrics (structured JSON)
    - `TREND_ANALYSIS`: handled in Story 6.6 (link to computed trends)
  - Emit domain event `pms.activity.started`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/complete-activity.ts`:
  - Validate findingsSummary and conclusions are not empty
  - Transition IN_PROGRESS -> COMPLETED, set completedAt
  - Emit domain event `pms.activity.completed`
  - Check if all activities in cycle are completed; if so, emit `pms.cycle.all-activities-completed` for notification
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/update-activity.ts`:
  - Update title, description, findings, data, conclusions
  - Only updateable when IN_PROGRESS or PLANNED
  - COMPLETED activities cannot be modified
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/reassign-activity.ts`:
  - Change assigneeId (allowed in any status except COMPLETED)
  - Emit domain event for notification
- [ ] Create DTOs:
  - `execute-activity.dto.ts` — activityId, optional linked references
  - `complete-activity.dto.ts` — findingsSummary, conclusions, dataCollected
  - `update-activity.dto.ts`
  - `reassign-activity.dto.ts`
- [ ] Create repository in `apps/api/src/modules/pms/infrastructure/repositories/pmcf-activity-repository.ts`:
  - `findActivityById(id)`
  - `findActivitiesByCycle(cycleId, filter?)`
  - `updateActivity(id, data)`
  - `getActivityProgress(cycleId)` — completed/total counts
- [ ] Add domain events:
  - `pms-activity-started.ts`
  - `pms-activity-completed.ts`
- [ ] Add GraphQL types:
  - PmcfActivity type with resolved user (assignee) and activity-specific data
  - ActivityStatus enum (PLANNED, IN_PROGRESS, COMPLETED)
  - ActivityProgress type (totalActivities, completedActivities, byType map)
- [ ] Add GraphQL queries:
  - `pmcfActivities(cycleId: UUID!, filter: ActivityFilter)` — list activities for cycle
  - `pmcfActivity(id: UUID!)` — single activity detail
  - `activityProgress(cycleId: UUID!)` — progress stats
- [ ] Add GraphQL mutations:
  - `startPmcfActivity(id: UUID!)` — transition to IN_PROGRESS
  - `updatePmcfActivity(id: UUID!, input: UpdatePmcfActivityInput!)`
  - `completePmcfActivity(id: UUID!, input: CompletePmcfActivityInput!)`
  - `reassignPmcfActivity(id: UUID!, assigneeId: UUID!)`
- [ ] Add email notification trigger (via domain event -> BullMQ `notification:send-email`):
  - Notify assignee when activity is assigned or reassigned
  - Notify RA Manager when all activities in a cycle are completed
- [ ] Write unit tests for activity status transitions
- [ ] Write unit tests for activity completion validation (non-empty findings/conclusions)

### Frontend

- [ ] Create `apps/web/src/features/pms/components/ActivityTracker.tsx`:
  - List view of all activities in a cycle
  - Each activity card shows: type icon (per activity type), title, assignee avatar + name, status badge, dates
  - Progress bar at top: "5/7 activities completed"
  - Filter by: status (all/planned/in-progress/completed), activity type, assignee
  - Sort by: status, type, date, assignee
- [ ] Create `ActivityCard.tsx`:
  - Card component per activity
  - Left accent bar colored by status (blue=planned, orange=in-progress, green=completed)
  - Activity type icon mapping:
    - Literature Update: Book icon
    - Named Device Search: Search icon
    - User Surveys: ClipboardList icon
    - Vigilance Monitoring: Shield icon
    - Complaints: AlertTriangle icon
    - Installed Base: BarChart icon
    - Trend Analysis: TrendingUp icon
  - Click expands to detail view or opens in detail panel
- [ ] Create `ActivityDetailPanel.tsx` (right panel, 380px):
  - Activity header: type badge, title, status, assignee
  - Editable fields (when IN_PROGRESS):
    - Findings Summary (textarea with auto-save)
    - Data Collected (structured form per activity type or JSON editor)
    - Conclusions (textarea with auto-save)
  - File attachments (upload to MinIO, display list)
  - Action buttons:
    - "Start Activity" (if PLANNED, Primary)
    - "Mark Complete" (if IN_PROGRESS, Success) — requires findings and conclusions
    - "Reassign" (Ghost, opens user select)
  - Read-only view when COMPLETED
- [ ] Create `ActivityTypeSpecificForm.tsx`:
  - Render different form fields based on activity type:
    - Literature Update: link to SLS session, summary of new articles found
    - Named Device Search: link to vigilance search results
    - User Surveys: file upload for survey results, summary field
    - Vigilance Monitoring: structured form for vigilance findings
    - Installed Base: metrics form (units sold, active devices, regions)
  - All forms share: findings summary and conclusions at the bottom
- [ ] Create `ActivityProgressRing.tsx`:
  - Circular progress indicator showing completion (e.g., 5/7)
  - Color transitions: all planned=gray, some done=blue, all done=green
  - Used in CycleDashboard header
- [ ] Add auto-save hook for activity detail editing (use `use-auto-save.ts` with debounced mutation every 10s)
- [ ] Integrate with PMS sidebar: add "Activities" navigation item under cycle
- [ ] Write component tests for ActivityTracker filtering and ActivityDetailPanel form validation

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Frontend:** React 19, Apollo Client 3.x, shadcn/ui + Tailwind CSS 4
- **Workers:** BullMQ 5.69 for email notifications
- **Storage:** MinIO (S3-compatible) for file attachments
- **Events:** RabbitMQ for domain events, email notifications via `notification:send-email` queue

### Activity Type System

- 7 activity types defined as an enum (LITERATURE_UPDATE, NAMED_DEVICE_SEARCH, USER_SURVEYS, VIGILANCE_MONITORING, COMPLAINTS, INSTALLED_BASE, TREND_ANALYSIS)
- Each type may have type-specific data collection fields stored in `dataCollected` JSON field
- The `dataCollected` JSON schema varies by activity type
- Use Zod discriminated union for runtime validation of `dataCollected` based on `activityType`

### Activity Status Machine

```
PLANNED -> IN_PROGRESS    (manual start by assignee)
IN_PROGRESS -> COMPLETED  (requires findingsSummary + conclusions non-empty)
```

- No reverse transitions from COMPLETED
- Reassignment allowed in PLANNED and IN_PROGRESS

### File Attachments

- Files uploaded to MinIO via presigned URL
- Store file references in `attachments` JSON field: `[{ name, key, mimeType, size, uploadedAt }]`
- Use existing MinIO infrastructure from SLS PDF storage

### Notification Pattern

- When an activity is assigned/reassigned, emit domain event
- Domain event listener creates a BullMQ job in `notification:send-email` queue
- Email service sends notification to assignee
- This follows the architecture's I3 requirement (SMTP notifications)

### Naming Conventions

- Domain events: `pms.activity.started`, `pms.activity.completed`
- GraphQL: `startPmcfActivity`, `completePmcfActivity`
- Files: `execute-activity.ts`, `ActivityTracker.tsx`, `ActivityCard.tsx`

### UX Patterns

- Follow "AI propose, humain dispose" pattern: some activities may leverage AI (Literature Update can re-use SLS scoring)
- Activity cards use accent bar left pattern (3px colored bar)
- Detail panel is the right 380px panel (consistent with SLS article detail, SOA source quote)
- Progress feedback at 3 levels: pipeline (topbar), cycle (progress ring), activity (status badge)
- Auto-save every 10s on textarea fields
- "Pas de cul-de-sac": after completing all activities, suggest "Complete Cycle" or "Generate PMCF Report"

### Anti-Patterns to Avoid

- Do NOT allow completing an activity without findings and conclusions
- Do NOT allow modifying completed activities
- Do NOT store large files in the database — use MinIO object storage
- Do NOT send emails synchronously — use BullMQ queue

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    execute-activity.ts       # NEW
    complete-activity.ts      # NEW
    update-activity.ts        # NEW
    reassign-activity.ts      # NEW
  application/dtos/
    execute-activity.dto.ts   # NEW
    complete-activity.dto.ts  # NEW
    update-activity.dto.ts    # NEW
    reassign-activity.dto.ts  # NEW
  infrastructure/repositories/
    pmcf-activity-repository.ts  # NEW
  domain/events/
    pms-activity-started.ts   # NEW
    pms-activity-completed.ts # NEW

apps/web/src/features/pms/
  components/
    ActivityTracker.tsx        # NEW
    ActivityCard.tsx            # NEW
    ActivityDetailPanel.tsx    # NEW
    ActivityTypeSpecificForm.tsx  # NEW
    ActivityProgressRing.tsx   # NEW
```

### References

- **PRD FRs:** FR62, FR62c
- **Architecture:** DDD use case pattern, MinIO for object storage, BullMQ for notifications, domain events via RabbitMQ, SMTP email (I3)
- **UX Spec:** Card with accent bar left pattern, detail panel (380px), StatusBadge component, progress indicators, auto-save hook, Lucide icons per activity type
- **Dependencies:** Story 6.1 (PMS Plan with responsibilities), Story 6.3 (PMS Cycle with activities), User system (Epic 1)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
