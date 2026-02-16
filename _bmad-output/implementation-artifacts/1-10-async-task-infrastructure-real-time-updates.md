# Story 1.10: Async Task Infrastructure & Real-Time Updates

Status: done

## Story

As a user,
I want background tasks (AI scoring, report generation) to run asynchronously with real-time progress updates,
So that I can continue working while long-running operations complete.

## Acceptance Criteria

**Given** BullMQ 5.69 is configured with Redis for job queues
**When** a long-running task is enqueued (e.g., AI scoring)
**Then** the task runs in a dedicated worker process (apps/workers)
**And** the AsyncTaskPanel component shows active tasks with: name, progress bar, ETA, status
**And** real-time updates are delivered via GraphQL Subscriptions (graphql-ws)
**And** users can cancel running tasks (completed items are preserved) (FR19k)
**And** task history shows completion status and timestamps (FR19m)
**And** completion triggers a toast notification (FR19l)
**And** the task panel shows a badge count when tasks are active
**And** queue names follow the pattern `module:action` (e.g., `sls:score-articles`)

## Tasks / Subtasks

### Phase 1: Backend — BullMQ Queue Infrastructure

- [ ] **T1.1** Install BullMQ dependencies in `apps/api` and `apps/workers`
  - `bullmq` 5.69.x
  - `ioredis` (shared Redis connection)
- [ ] **T1.2** Create `apps/api/src/config/queues.ts` — Queue registration

  ```typescript
  // Queue name constants
  export const QUEUE_NAMES = {
    SLS_SCORE_ARTICLES: 'sls:score-articles',
    SLS_RETRIEVE_PDFS: 'sls:retrieve-pdfs',
    SLS_MINE_REFERENCES: 'sls:mine-references',
    SOA_EXTRACT_GRID: 'soa:extract-grid-data',
    SOA_DRAFT_NARRATIVE: 'soa:draft-narrative',
    SOA_QUALITY_ASSESSMENT: 'soa:quality-assessment',
    CER_DRAFT_SECTION: 'cer:draft-section',
    CER_GENERATE_DOCX: 'cer:generate-docx',
    VALIDATION_GENERATE_REPORT: 'validation:generate-report',
    PMS_GENERATE_PMCF: 'pms:generate-pmcf-report',
    PMS_GENERATE_PSUR: 'pms:generate-psur',
    NOTIFICATION_SEND_EMAIL: 'notification:send-email',
  } as const;
  ```

  - AC: queue names follow pattern `module:action`

- [ ] **T1.3** Create queue factory function
  ```typescript
  function createQueue(name: string): Queue {
    return new Queue(name, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 24 * 3600 }, // Keep for 24h
        removeOnFail: { age: 7 * 24 * 3600 }, // Keep failed for 7 days
      },
    });
  }
  ```
- [ ] **T1.4** Create `apps/api/src/shared/services/task-service.ts`
  - `enqueueTask(queueName, data, options)` — creates BullMQ job + AsyncTask DB record
  - `cancelTask(taskId)` — signals job cancellation via BullMQ abort
  - `getTaskStatus(taskId)` — returns current task status from DB
  - `getActiveTasks(userId)` — returns all running/pending tasks for a user
  - `getTaskHistory(userId, limit)` — returns completed/failed tasks
  - AC: tasks tracked in both BullMQ and AsyncTask DB table

### Phase 2: Backend — AsyncTask Database Integration

- [ ] **T2.1** Create task lifecycle management
  - On enqueue: create AsyncTask record with status PENDING
  - On worker start: update to RUNNING, set startedAt
  - On progress: update progress and estimated completion
  - On complete: update to COMPLETED, set completedAt, store result
  - On fail: update to FAILED, store error message
  - On cancel: update to CANCELLED
  - AC: task tracked in database
- [ ] **T2.2** Create Zod schemas for job data validation
  - Each queue has a typed job data interface
  - Validate at enqueue time with Zod
  - Define in `packages/shared/src/schemas/async-task.schema.ts`

### Phase 3: Backend — GraphQL Subscriptions

- [ ] **T3.1** Configure graphql-ws with Fastify
  - Install `graphql-ws`, `ws`
  - Create WebSocket server alongside Fastify HTTP server
  - Use `graphql-ws` for GraphQL subscription protocol
  - Authentication: verify JWT from connection params
  - AC: real-time updates via GraphQL Subscriptions
- [ ] **T3.2** Create `apps/api/src/shared/subscriptions/task-subscription.ts`
  - `onTaskProgress(userId: ID!)` — streams task progress updates
    ```typescript
    type TaskProgressEvent = {
      taskId: string;
      type: string; // queue name
      status: string; // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
      progress: number; // 0-100
      total: number; // Total items
      current: number; // Current item
      eta: string | null; // Estimated time remaining (ISO duration or seconds)
      message: string; // Human-readable progress message
    };
    ```
  - AC: real-time progress updates
- [ ] **T3.3** Create pub/sub mechanism for task updates
  - Use Redis Pub/Sub for inter-process communication (API <-> Workers)
  - Channel pattern: `task:progress:{userId}`
  - Workers publish progress to Redis channel
  - API server subscribes and forwards via GraphQL subscription
- [ ] **T3.4** Create Pothos subscription types
  - `Subscription.onTaskProgress` — filtered by userId
  - `Subscription.onTaskCompleted` — fires when any task completes
  - GraphQL types: `TaskProgressEvent`, `TaskCompletedEvent`

### Phase 4: Backend — Task GraphQL API

- [ ] **T4.1** Create `apps/api/src/modules/async-tasks/graphql/queries.ts`
  - `activeTasks` — returns running/pending tasks for current user
  - `taskHistory(limit: Int, offset: Int)` — returns completed tasks
  - `task(id: ID!)` — returns single task details
- [ ] **T4.2** Create `apps/api/src/modules/async-tasks/graphql/mutations.ts`
  - `cancelTask(taskId: ID!)` — cancels a running task
  - Returns updated task with CANCELLED status
  - Does NOT delete completed portions of the work
  - AC: users can cancel running tasks, completed items preserved (FR19k)
- [ ] **T4.3** Create Pothos types
  - `AsyncTaskType` — full task model
  - `TaskStatusEnum` — PENDING, RUNNING, COMPLETED, FAILED, CANCELLED

### Phase 5: Worker Process Setup

- [ ] **T5.1** Create `apps/workers/src/index.ts` — Worker bootstrap

  ```typescript
  // Worker entry point
  import { Worker } from 'bullmq';
  import { redisConnection } from './config/redis';

  // Register all processors
  const workers = [
    // SLS processors
    new Worker(QUEUE_NAMES.SLS_SCORE_ARTICLES, scoreArticlesProcessor, {
      connection: redisConnection,
    }),
    new Worker(QUEUE_NAMES.SLS_RETRIEVE_PDFS, retrievePdfsProcessor, {
      connection: redisConnection,
    }),
    // ... more workers registered per queue

    // Placeholder workers for future modules
  ];

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await Promise.all(workers.map((w) => w.close()));
  });
  ```

  - AC: tasks run in dedicated worker process (apps/workers)

- [ ] **T5.2** Create sample processor for testing: `apps/workers/src/processors/sample/echo-task.ts`
  - Simple processor that simulates a long-running task
  - Accepts: `{ iterations: number, delayMs: number }`
  - Reports progress at each iteration
  - Publishes progress updates to Redis channel
  - Used for E2E testing of the async infrastructure
- [ ] **T5.3** Create processor base class/helper

  ```typescript
  abstract class BaseProcessor<TData, TResult> {
    abstract process(job: Job<TData>): Promise<TResult>;

    // Helper to report progress
    async reportProgress(job: Job, current: number, total: number, message: string) {
      await job.updateProgress({ current, total, message });
      // Publish to Redis for real-time subscription
      await redis.publish(
        `task:progress:${job.data.userId}`,
        JSON.stringify({
          taskId: job.id,
          type: job.name,
          status: 'RUNNING',
          progress: (current / total) * 100,
          current,
          total,
          message,
        }),
      );
    }

    // Helper to check for cancellation
    async checkCancellation(job: Job): Promise<boolean> {
      const task = await prisma.asyncTask.findUnique({ where: { id: job.id } });
      return task?.status === 'CANCELLED';
    }
  }
  ```

  - AC: progress reporting and cancellation support

- [ ] **T5.4** Create placeholder processor files for all future queues
  - `apps/workers/src/processors/sls/score-articles.ts` — placeholder
  - `apps/workers/src/processors/sls/retrieve-pdfs.ts` — placeholder
  - `apps/workers/src/processors/sls/mine-references.ts` — placeholder
  - `apps/workers/src/processors/soa/extract-grid-data.ts` — placeholder
  - `apps/workers/src/processors/soa/draft-narrative.ts` — placeholder
  - `apps/workers/src/processors/cer/draft-section.ts` — placeholder
  - `apps/workers/src/processors/cer/generate-docx.ts` — placeholder
  - Each placeholder exports a stub that throws "Not yet implemented"

### Phase 6: Frontend — AsyncTaskPanel Component

- [ ] **T6.1** Create `apps/web/src/shared/components/AsyncTaskPanel.tsx`
  - Panel positioned in bottom-right or expandable from statusbar
  - Shows list of active tasks:
    - Task icon (brain for AI, download for export, arrows for sync)
    - Task name (human-readable)
    - Progress bar (animated, blue-500)
    - ETA text ("~3 min remaining")
    - Cancel button (X icon)
  - Badge count on panel toggle button when tasks are active
  - Expandable to show completed tasks history
  - AC: AsyncTaskPanel shows active tasks with name, progress bar, ETA, status
  - AC: task panel shows badge count when tasks are active
- [ ] **T6.2** Create task type to icon/name mapping
  ```typescript
  const TASK_DISPLAY = {
    'sls:score-articles': { icon: Brain, name: 'AI Screening' },
    'sls:retrieve-pdfs': { icon: FileDown, name: 'PDF Retrieval' },
    'soa:extract-grid-data': { icon: Brain, name: 'AI Extraction' },
    'soa:draft-narrative': { icon: Brain, name: 'AI Narrative' },
    'cer:draft-section': { icon: Brain, name: 'CER Section Draft' },
    'cer:generate-docx': { icon: FileDown, name: 'DOCX Export' },
  };
  ```
- [ ] **T6.3** Implement task cancellation from panel
  - Cancel button triggers `cancelTask` mutation
  - Cancelled task shows "Cancelled" status, strikethrough
  - Confirmation dialog: "Cancel this task? Completed items will be preserved."
  - AC: users can cancel running tasks
- [ ] **T6.4** Implement task completion toast notification
  - When subscription receives `COMPLETED` event: show success toast
  - Toast message: "AI Screening complete. 4,521 articles scored."
  - When `FAILED`: show error toast with "Retry" action
  - AC: completion triggers toast notification (FR19l)
- [ ] **T6.5** Implement task history view
  - Expandable section in AsyncTaskPanel
  - Shows completed/failed/cancelled tasks with timestamp
  - "Clear history" button
  - AC: task history shows completion status and timestamps (FR19m)

### Phase 7: Frontend — Subscription Integration

- [ ] **T7.1** Configure Apollo Client WebSocket link for subscriptions
  - Split link: HTTP for queries/mutations, WebSocket for subscriptions
  - Auto-reconnect on connection drop
  - Auth token passed via connection params
- [ ] **T7.2** Create `apps/web/src/shared/hooks/use-task-subscription.ts`
  - Uses Apollo `useSubscription` hook for `onTaskProgress`
  - Updates task panel store (Zustand) on each progress event
  - Handles connection state (connecting, connected, disconnected)
- [ ] **T7.3** Update Zustand task panel store
  - Actions: `onTaskProgress(event)`, `onTaskCompleted(event)`, `onTaskFailed(event)`
  - Maintain active tasks list and history

### Phase 8: Testing

- [ ] **T8.1** Unit test: BullMQ queue creation and job enqueuing
- [ ] **T8.2** Unit test: task service — enqueue, cancel, get status
- [ ] **T8.3** Unit test: sample echo processor — progress reporting, cancellation
- [ ] **T8.4** Integration test: enqueue task -> worker processes -> DB updated -> subscription delivers
- [ ] **T8.5** Integration test: cancel task -> worker stops -> status updated
- [ ] **T8.6** Integration test: GraphQL subscription delivers progress updates
- [ ] **T8.7** Frontend test: AsyncTaskPanel renders active tasks
- [ ] **T8.8** Frontend test: progress bar updates in real-time
- [ ] **T8.9** Frontend test: cancel button triggers mutation
- [ ] **T8.10** Frontend test: toast notification on task completion

## Dev Notes

### Tech Stack & Versions

| Technology | Version | Package      |
| ---------- | ------- | ------------ |
| BullMQ     | 5.69.x  | `bullmq`     |
| ioredis    | latest  | `ioredis`    |
| graphql-ws | latest  | `graphql-ws` |
| ws         | latest  | `ws`         |

### Architecture Overview

```
Frontend (Apollo Client)
    │
    ├── GraphQL Queries/Mutations ──> API Server (Fastify)
    │                                    │
    │                                    ├── Enqueue Job ──> Redis (BullMQ Queue)
    │                                    │
    └── WebSocket Subscription ──────> API Server (graphql-ws)
                                         │
                                         └── Subscribe ──> Redis Pub/Sub
                                                              ↑
    Worker Process (apps/workers)                              │
    ├── Consume Job from BullMQ Queue                         │
    ├── Process (AI scoring, report gen)                      │
    ├── Report Progress ──> Update AsyncTask DB               │
    └── Publish Progress ──> Redis Pub/Sub ───────────────────┘
```

### Queue Naming Convention

Pattern: `module:action` (colon separator, lowercase)

| Queue Name                   | Module        | Purpose                        |
| ---------------------------- | ------------- | ------------------------------ |
| `sls:score-articles`         | SLS           | AI relevance scoring           |
| `sls:retrieve-pdfs`          | SLS           | PDF retrieval from sources     |
| `sls:mine-references`        | SLS           | Reference extraction from PDFs |
| `soa:extract-grid-data`      | SOA           | AI extraction grid population  |
| `soa:draft-narrative`        | SOA           | AI narrative section drafting  |
| `soa:quality-assessment`     | SOA           | Batch quality assessment       |
| `cer:draft-section`          | CER           | AI CER section drafting        |
| `cer:generate-docx`          | CER           | DOCX document generation       |
| `validation:generate-report` | Validation    | Report generation              |
| `pms:generate-pmcf-report`   | PMS           | PMCF report generation         |
| `pms:generate-psur`          | PMS           | PSUR generation                |
| `notification:send-email`    | Cross-cutting | Email notifications            |

### Job Data Interface Pattern

Every BullMQ job MUST have typed data validated with Zod:

```typescript
// Example: SLS score articles job
interface ScoreArticlesJobData {
  sessionId: string;
  userId: string;
  articleIds: string[];
  llmProvider?: string;
  thresholds: {
    likelyRelevant: number; // default 75
    likelyIrrelevant: number; // default 40
  };
}

const scoreArticlesSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  articleIds: z.array(z.string().uuid()),
  llmProvider: z.string().optional(),
  thresholds: z.object({
    likelyRelevant: z.number().min(0).max(100).default(75),
    likelyIrrelevant: z.number().min(0).max(100).default(40),
  }),
});
```

### Cancellation Pattern

```typescript
// In processor:
async process(job: Job<TData>) {
  for (let i = 0; i < items.length; i++) {
    // Check for cancellation before each item
    if (await this.checkCancellation(job)) {
      // Save partial results, return what's done
      return { processed: i, total: items.length, cancelled: true };
    }

    await processItem(items[i]);
    await this.reportProgress(job, i + 1, items.length, `Processed ${i + 1}/${items.length}`);
  }
}
```

### AsyncTaskPanel UX (from UX Spec)

- **States**: No tasks (hidden) -> Tasks running (badge count) -> Task completed (toast + check animation) -> Task failed (toast error + retry button)
- **Accessibility**: `role="status"`, `aria-live="polite"` for progress updates
- **Icons**: Brain (AI tasks), FileDown (downloads/exports), ArrowsRotate (sync)
- **Position**: Bottom-right corner or expandable from statusbar
- **Badge**: Number badge on the panel toggle when tasks are active

### Anti-Patterns to Avoid

- Do NOT poll for task status — use GraphQL subscriptions for real-time updates
- Do NOT process tasks in the API server — always use the dedicated worker process
- Do NOT store large results in the AsyncTask table — store references (file paths, IDs)
- Do NOT skip Zod validation on job data — validate at enqueue time
- Do NOT ignore cancellation checks in processors — check at reasonable intervals
- Do NOT use `console.log` in workers — use the structured Pino logger
- Do NOT create tight coupling between workers and GraphQL — communicate via Redis Pub/Sub

### Worker Configuration Notes

- Workers share the Prisma client and Redis connection with the API
- Workers do NOT have access to GraphQL resolvers or Express/Fastify
- Results are written directly to the database
- Notifications are published via Redis Pub/Sub (picked up by API server for subscriptions)
- Workers should be horizontally scalable — multiple worker instances can process from the same queue

### Project Structure Notes

```
apps/api/src/
├── config/
│   ├── redis.ts                     # Updated — shared Redis config
│   └── queues.ts                    # NEW — queue name constants + factory
├── shared/
│   ├── services/
│   │   └── task-service.ts          # NEW — enqueue, cancel, status
│   └── subscriptions/
│       └── task-subscription.ts     # NEW — GraphQL subscriptions
├── modules/async-tasks/
│   └── graphql/
│       ├── types.ts                 # NEW — AsyncTask types
│       ├── queries.ts               # NEW — task queries
│       ├── mutations.ts             # NEW — cancel task
│       └── subscriptions.ts         # NEW — onTaskProgress

apps/workers/src/
├── index.ts                         # NEW — worker bootstrap
├── config/
│   └── redis.ts                     # NEW — worker Redis config
├── shared/
│   ├── base-processor.ts            # NEW — base processor class
│   └── progress-reporter.ts         # NEW — progress pub/sub
├── processors/
│   ├── sample/
│   │   └── echo-task.ts             # NEW — test processor
│   ├── sls/
│   │   ├── score-articles.ts        # Placeholder
│   │   ├── retrieve-pdfs.ts         # Placeholder
│   │   └── mine-references.ts       # Placeholder
│   ├── soa/
│   │   ├── extract-grid-data.ts     # Placeholder
│   │   └── draft-narrative.ts       # Placeholder
│   ├── cer/
│   │   ├── draft-section.ts         # Placeholder
│   │   └── generate-docx.ts         # Placeholder
│   ├── validation/
│   │   └── generate-reports.ts      # Placeholder
│   └── pms/
│       ├── generate-pmcf-report.ts  # Placeholder
│       └── generate-psur.ts         # Placeholder

packages/shared/src/
├── schemas/
│   └── async-task.schema.ts         # NEW — Zod schemas for job data
└── types/
    └── async-task.ts                # Updated — task types

apps/web/src/
├── shared/
│   ├── components/
│   │   └── AsyncTaskPanel.tsx       # Updated from placeholder — full implementation
│   ├── hooks/
│   │   └── use-task-subscription.ts # NEW
│   └── graphql/
│       └── client.ts                # Updated — WebSocket link for subscriptions
└── stores/
    └── task-panel-store.ts          # Updated — subscription integration
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Async Processing, BullMQ, Real-time Updates, Worker Process structure)
- UX Spec: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (AsyncTaskPanel component spec, AI Feedback patterns)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.10, FRs 19j-19m)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
