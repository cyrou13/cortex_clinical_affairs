# Story 1.7: Audit Trail Middleware

Status: done

## Story

As a compliance officer,
I want every data mutation automatically logged with WHO, WHAT, WHEN, WHY,
So that we maintain an immutable audit trail for regulatory compliance (FR78-FR81).

## Acceptance Criteria

**Given** any GraphQL mutation is executed
**When** the mutation completes (success or failure)
**Then** the audit middleware automatically logs: userId, action, targetType, targetId, before state, after state, timestamp (ISO 8601)
**And** audit entries are immutable (no UPDATE or DELETE on AuditLog table) (S4)
**And** workflow state transitions are logged (FR80)
**And** document version history is tracked with timestamps (FR81)
**And** agents do NOT manually log audit entries — the middleware handles it automatically
**And** the audit trail supports 15-year retention (S7)
**And** auto-save status is visible in the statusbar (saving indicator every 10 seconds) (R3)

## Tasks / Subtasks

### Phase 1: Backend — Audit Middleware Implementation

- [ ] **T1.1** Create `apps/api/src/shared/middleware/audit-middleware.ts`
      Core middleware that wraps GraphQL mutation resolvers:

  ```typescript
  // Conceptual structure
  function auditMiddleware(options: {
    action: string; // e.g., 'project.create', 'sls.session.lock'
    targetType: string; // e.g., 'Project', 'SlsSession'
    getTargetId: (args) => string;
    getBefore?: (args, ctx) => Promise<Record<string, unknown> | null>;
  }) {
    return async (resolve, root, args, ctx, info) => {
      const before = options.getBefore ? await options.getBefore(args, ctx) : null;
      const result = await resolve(root, args, ctx, info);
      const after = extractState(result);

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: options.action,
          targetType: options.targetType,
          targetId: options.getTargetId(args),
          before: before,
          after: after,
          metadata: { requestId: ctx.requestId },
          timestamp: new Date(),
        },
      });

      return result;
    };
  }
  ```

  - Captures before state (read entity before mutation)
  - Captures after state (from mutation result)
  - Logs on both success and failure
  - AC: audit middleware automatically logs userId, action, targetType, targetId, before/after, timestamp

- [ ] **T1.2** Implement Pothos plugin or middleware hook for automatic audit wrapping
  - Option A: Pothos middleware plugin that wraps all mutations
  - Option B: Higher-order resolver wrapper `withAudit(options, resolver)`
  - The chosen approach must be ergonomic for developers in all modules
  - AC: agents do NOT manually log audit entries
- [ ] **T1.3** Implement error audit logging
  - If a mutation fails (throws DomainError), log the failed attempt
  - Include error code and message in audit metadata
  - `action` suffix: `.failed` (e.g., `project.create.failed`)

### Phase 2: Backend — Immutability Enforcement

- [ ] **T2.1** Create database-level immutability constraint on AuditLog
  - PostgreSQL: Create trigger or policy that prevents UPDATE and DELETE on `audit_logs` table

  ```sql
  -- Migration: prevent modification of audit log entries
  CREATE OR REPLACE FUNCTION prevent_audit_modification()
  RETURNS TRIGGER AS $$
  BEGIN
    RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER audit_log_immutable_update
    BEFORE UPDATE ON "AuditLog"
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

  CREATE TRIGGER audit_log_immutable_delete
    BEFORE DELETE ON "AuditLog"
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  ```

  - AC: audit entries are immutable (S4)

- [ ] **T2.2** Ensure Prisma does not expose update/delete operations for AuditLog
  - Create a read-only repository for AuditLog queries
  - Only `create` is exposed via the audit middleware
  - No `update` or `delete` methods exist in the repository

### Phase 3: Backend — Workflow State Transition Logging

- [ ] **T3.1** Create audit action naming convention for state transitions
  - Format: `{module}.{entity}.{action}` — e.g., `sls.session.status_changed`
  - Before state: `{ status: 'DRAFT' }`
  - After state: `{ status: 'LOCKED' }`
  - Metadata: `{ fromStatus, toStatus, reason }`
  - AC: workflow state transitions logged (FR80)
- [ ] **T3.2** Implement version tracking for entity changes
  - Each audit entry implicitly creates a version history point
  - Add query: `getEntityHistory(targetType, targetId)` — returns ordered audit entries
  - AC: document version history tracked with timestamps (FR81)

### Phase 4: Backend — Audit Query API

- [ ] **T4.1** Create `apps/api/src/modules/audit/graphql/queries.ts`
  - `auditLogs(filter: AuditLogFilter!)` — paginated, filterable
  - Filter options: by userId, by targetType, by targetId, by action, by date range
  - Sorted by timestamp descending
  - Requires Admin, RA Manager, or Auditor role
- [ ] **T4.2** Create `apps/api/src/modules/audit/graphql/types.ts`
  - `AuditLogType` — Pothos type for AuditLog
  - `AuditLogFilter` — input type with filter fields
  - `AuditLogConnection` — Relay-style pagination
- [ ] **T4.3** Create entity history query
  - `entityHistory(targetType: String!, targetId: ID!)` — returns all audit entries for a specific entity
  - Used for version history display and drill-down

### Phase 5: Backend — Retention Policy Support

- [ ] **T5.1** Add `retentionExpiresAt` field to AuditLog (calculated: timestamp + 15 years)
  - This field is informational — actual deletion would require a separate cleanup job
  - AC: audit trail supports 15-year retention (S7)
- [ ] **T5.2** Create index for efficient querying
  - Composite index on `(targetType, targetId, timestamp)`
  - Index on `(userId, timestamp)`
  - Index on `(action, timestamp)`

### Phase 6: Frontend — Auto-Save Indicator

- [ ] **T6.1** Create `apps/web/src/shared/hooks/use-auto-save.ts`
  - Debounced save function (10-second interval)
  - For forms: watches React Hook Form values, triggers save mutation
  - For Plate editor: watches content changes, triggers save mutation
  - Returns state: `idle`, `saving`, `saved`, `error`
  - AC: auto-save every 10 seconds (R3)
- [ ] **T6.2** Update statusbar to show auto-save indicator
  - Green dot + "Saved" when last save succeeded
  - Orange dot + "Saving..." during save
  - Red dot + "Save failed" on error with retry option
  - Timestamp of last save: "Last saved: 14:32:05"
  - AC: auto-save status visible in statusbar

### Phase 7: Frontend — Audit Trail Viewer Component

- [ ] **T7.1** Create `apps/web/src/shared/components/AuditTrailViewer.tsx`
  - Reusable component showing audit history for any entity
  - Timeline view: entries ordered by timestamp (newest first)
  - Each entry shows: timestamp, user name, action description, before/after diff
  - Filters: by user, by date range, by action type
  - Used in: document detail panels, admin audit page
- [ ] **T7.2** Create `apps/web/src/routes/_authenticated/admin/audit.tsx` (placeholder)
  - Full audit log viewer for Admin/Auditor roles
  - Uses AuditTrailViewer with global filters

### Phase 8: Testing

- [ ] **T8.1** Unit test: audit middleware captures correct before/after state
- [ ] **T8.2** Unit test: audit middleware logs on both success and failure
- [ ] **T8.3** Integration test: mutation creates AuditLog entry automatically
- [ ] **T8.4** Integration test: AuditLog UPDATE/DELETE triggers throw error
- [ ] **T8.5** Integration test: audit log query with filters works correctly
- [ ] **T8.6** Integration test: entity history returns ordered audit entries
- [ ] **T8.7** Frontend test: auto-save hook triggers at 10-second interval
- [ ] **T8.8** Frontend test: AuditTrailViewer renders timeline correctly

## Dev Notes

### Tech Stack & Versions

No new major dependencies. Uses existing Prisma, Pothos, and GraphQL infrastructure.

### Audit Log Entry Structure

```typescript
interface AuditLogEntry {
  id: string; // UUID v7
  userId: string; // WHO — user who performed the action
  action: string; // WHAT — action identifier (e.g., 'project.create')
  targetType: string; // Entity type (e.g., 'Project', 'SlsSession')
  targetId: string; // Entity ID
  before: JSON | null; // State before mutation (null for creates)
  after: JSON | null; // State after mutation (null for deletes)
  metadata: JSON | null; // Additional context (requestId, reason, error details)
  timestamp: DateTime; // WHEN — ISO 8601 timestamp
}
```

### Action Naming Convention

Format: `{module}.{entity}.{verb}`

Examples:

- `project.project.created`
- `project.cep.updated`
- `auth.user.created`
- `auth.user.deactivated`
- `auth.login.success`
- `auth.login.failed`
- `sls.session.created`
- `sls.dataset.locked`
- `soa.analysis.locked`
- `cer.version.locked`
- `permission.check.denied`

### Auto-Save Implementation Pattern

```typescript
// use-auto-save.ts pattern
function useAutoSave(saveFn: () => Promise<void>, intervalMs = 10_000) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Debounced save triggered by data changes
  const debouncedSave = useDebouncedCallback(async () => {
    setStatus('saving');
    try {
      await saveFn();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, intervalMs);

  return { status, triggerSave: debouncedSave };
}
```

### Immutability Strategy

Two levels of protection:

1. **Application level**: The audit repository exposes only `create` — no `update` or `delete` methods
2. **Database level**: PostgreSQL triggers prevent UPDATE and DELETE on the AuditLog table

This dual protection ensures that even if the application code is modified, the database still prevents audit tampering.

### Anti-Patterns to Avoid

- Do NOT manually create AuditLog entries in use cases — the middleware handles it
- Do NOT expose UPDATE/DELETE operations on AuditLog through any code path
- Do NOT log sensitive data in before/after (passwords, tokens) — sanitize sensitive fields
- Do NOT skip audit logging for "small" mutations — every data change must be logged
- Do NOT use `console.log` as a substitute for audit logging — use the structured audit trail
- Do NOT delete old audit entries — 15-year retention is mandatory (S7)

### Performance Considerations

- Audit log writes are asynchronous (fire-and-forget after mutation succeeds) to avoid blocking the user
- Use connection pooling for audit writes
- Partition AuditLog table by timestamp for efficient querying of large datasets
- Create appropriate indexes (targetType+targetId, userId, timestamp)

### Project Structure Notes

```
apps/api/src/
├── shared/middleware/
│   └── audit-middleware.ts          # NEW — core audit middleware
├── modules/audit/
│   └── graphql/
│       ├── types.ts                 # NEW — AuditLog Pothos types
│       └── queries.ts              # NEW — audit log queries
└── modules/auth/
    └── infrastructure/repositories/
        └── audit-log-repository.ts  # NEW — read-only + create only

packages/prisma/schema/
├── shared.prisma                    # Updated — retentionExpiresAt field
└── audit.prisma                     # Updated — immutability triggers

apps/web/src/
├── shared/
│   ├── components/
│   │   └── AuditTrailViewer.tsx     # NEW
│   └── hooks/
│       └── use-auto-save.ts         # NEW
├── routes/_authenticated/admin/
│   └── audit.tsx                    # NEW (placeholder)
└── shared/layouts/
    └── AppLayout.tsx                # Updated — statusbar auto-save indicator
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Cross-Cutting Concerns — Audit Trail System, Process Patterns — Audit Trail)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.7, FRs 78-81)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
