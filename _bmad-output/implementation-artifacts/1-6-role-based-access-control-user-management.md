# Story 1.6: Role-Based Access Control & User Management

Status: ready-for-dev

## Story

As an admin,
I want to manage users and assign roles that control access per module, per status, and per project,
So that each team member has exactly the permissions they need (FR68-FR73).

## Acceptance Criteria

**Given** 6 defined roles: Admin, RA Manager, Clinical Specialist, Data Science, Executive, Auditor
**When** an admin assigns a role to a user
**Then** the system enforces permissions at the GraphQL resolver level (not just UI hiding) (S2)
**And** permissions are checked across 3 axes: role x module x document status
**And** SLS access: Admin, RA Manager, Clinical Specialist
**And** SOA access: Admin, RA Manager, Clinical Specialist
**And** Validation access: Admin, RA Manager, Data Science
**And** CER access: Admin, RA Manager (Clinical Specialist read-only)
**And** PMS access: Admin, RA Manager, Clinical Specialist
**And** locked documents are read-only for all users except Admin (who can unlock with audit trail justification) (FR70, FR73)
**And** all permission checks are logged in the audit trail (FR72)
**And** admin can create, deactivate, and modify user accounts (FR68)
**And** admin can assign users to specific projects (FR71)

## Tasks / Subtasks

### Phase 1: RBAC Permission Matrix Definition

- [ ] **T1.1** Create `packages/shared/src/constants/permissions.ts`
      Define the complete permission matrix:

  ```typescript
  // Permission actions
  type PermissionAction = 'read' | 'write' | 'lock' | 'unlock' | 'delete' | 'admin';

  // Module permissions per role
  const ROLE_PERMISSIONS = {
    ADMIN: {
      project: ['read', 'write', 'lock', 'unlock', 'delete', 'admin'],
      sls: ['read', 'write', 'lock', 'unlock'],
      soa: ['read', 'write', 'lock', 'unlock'],
      validation: ['read', 'write', 'lock', 'unlock'],
      cer: ['read', 'write', 'lock', 'unlock'],
      pms: ['read', 'write', 'lock', 'unlock'],
      users: ['read', 'write', 'admin'],
      audit: ['read'],
    },
    RA_MANAGER: {
      project: ['read', 'write'],
      sls: ['read', 'write', 'lock'],
      soa: ['read', 'write', 'lock'],
      validation: ['read', 'write', 'lock'],
      cer: ['read', 'write', 'lock'],
      pms: ['read', 'write', 'lock'],
      users: ['read'],
      audit: ['read'],
    },
    CLINICAL_SPECIALIST: {
      project: ['read'],
      sls: ['read', 'write', 'lock'],
      soa: ['read', 'write', 'lock'],
      validation: ['read'],
      cer: ['read'], // Read-only for CER
      pms: ['read', 'write'],
      users: [],
      audit: [],
    },
    DATA_SCIENCE: {
      project: ['read'],
      sls: ['read'],
      soa: ['read'],
      validation: ['read', 'write'],
      cer: ['read'],
      pms: ['read'],
      users: [],
      audit: [],
    },
    EXECUTIVE: {
      project: ['read'],
      sls: ['read'],
      soa: ['read'],
      validation: ['read'],
      cer: ['read'],
      pms: ['read'],
      users: [],
      audit: ['read'],
    },
    AUDITOR: {
      project: ['read'],
      sls: ['read'],
      soa: ['read'],
      validation: ['read'],
      cer: ['read'],
      pms: ['read'],
      users: [],
      audit: ['read'],
    },
  };
  ```

  - AC: 6 defined roles with module-level permissions

- [ ] **T1.2** Create `packages/shared/src/types/permissions.ts`
  - Export TypeScript types for roles, modules, actions
  - Helper function `hasPermission(role, module, action): boolean`

### Phase 2: Backend — RBAC Middleware

- [ ] **T2.1** Create `apps/api/src/shared/middleware/rbac-middleware.ts`
  - Function `requirePermission(module: ModuleType, action: PermissionAction)`
  - Returns a middleware/helper that can be used in GraphQL resolvers
  - Checks: user role from context -> permission matrix -> allowed?
  - If denied: throw `PermissionDeniedError` with clear message
  - Log every permission check to audit trail (FR72)
  - AC: permissions enforced at GraphQL resolver level
- [ ] **T2.2** Implement status-based access control
  - Helper function `checkDocumentStatusAccess(user, document)`
  - Locked documents: read-only for all except Admin
  - Draft documents: write access per role matrix
  - AC: locked documents are read-only for all except Admin
- [ ] **T2.3** Implement project-scoped permissions
  - Check `ProjectMember` record: user must be assigned to the project
  - If user is Admin: access to all projects
  - AC: permissions checked per project
- [ ] **T2.4** Create resolver-level permission decorator/wrapper

  ```typescript
  // Usage in resolvers:
  builder.mutationField('createSlsSession', (t) =>
    t.field({
      resolve: withPermission('sls', 'write', async (_, args, ctx) => {
        // Only reached if permission check passes
      }),
    }),
  );
  ```

  - AC: clean permission enforcement pattern for all resolvers

### Phase 3: Backend — User Management Use Cases

- [ ] **T3.1** Create `apps/api/src/modules/auth/application/use-cases/manage-users.ts`
  - `createUser(input)` — Admin only. Creates user with specified role
  - `updateUser(id, input)` — Admin only. Update name, role, isActive
  - `deactivateUser(id)` — Admin only. Sets isActive=false, invalidates all sessions
  - `reactivateUser(id)` — Admin only. Sets isActive=true
  - `listUsers(filter)` — Admin sees all, others see project members only
  - AC: admin can create, deactivate, modify user accounts (FR68)
- [ ] **T3.2** Create `apps/api/src/modules/auth/application/use-cases/assign-user-to-project.ts`
  - Admin or RA Manager can assign users to projects
  - Creates `ProjectMember` record with optional role override
  - Validates user exists and is active
  - AC: admin can assign users to specific projects (FR71)
- [ ] **T3.3** Create `apps/api/src/modules/auth/application/use-cases/unlock-document.ts`
  - Admin only
  - Requires justification text (mandatory)
  - Logs unlock action with justification in audit trail
  - Changes document status from LOCKED back to DRAFT
  - AC: Admin can unlock with audit trail justification (FR73)

### Phase 4: Backend — GraphQL User Management API

- [ ] **T4.1** Create/update `apps/api/src/modules/auth/graphql/mutations.ts`
  - `createUser(input: CreateUserInput!)` — Admin only
  - `updateUser(id: ID!, input: UpdateUserInput!)` — Admin only
  - `deactivateUser(id: ID!)` — Admin only
  - `assignUserToProject(userId: ID!, projectId: ID!, role: String)` — Admin/RA Manager
  - `removeUserFromProject(userId: ID!, projectId: ID!)` — Admin/RA Manager
  - `unlockDocument(targetType: String!, targetId: ID!, justification: String!)` — Admin only
- [ ] **T4.2** Create/update `apps/api/src/modules/auth/graphql/queries.ts`
  - `users(filter: UserFilter)` — paginated, Admin sees all
  - `projectMembers(projectId: ID!)` — members of a specific project
  - `userPermissions(userId: ID!)` — returns the effective permission matrix for a user
- [ ] **T4.3** Create Pothos types for user management
  - `UserType`, `UserFilter`, `CreateUserInput`, `UpdateUserInput`
  - `ProjectMemberType` with user and project relations
  - `PermissionMatrix` type for the permissions query

### Phase 5: Frontend — Admin User Management Page

- [ ] **T5.1** Create `apps/web/src/routes/_authenticated/admin/users.tsx`
  - Table of users with columns: name, email, role, status (active/inactive), last login
  - Sortable, filterable (by role, by status)
  - "Add User" button (opens dialog)
  - Row actions: Edit, Deactivate/Reactivate
  - AC: admin can manage users from UI
- [ ] **T5.2** Create user creation dialog
  - Form: email, name, role (select from 6 roles)
  - Validation: email required and valid, name required, role required
- [ ] **T5.3** Create user edit dialog
  - Form: name, role, isActive toggle
  - Shows current MFA status (enabled/disabled)
- [ ] **T5.4** Create project member assignment dialog
  - Accessible from project settings
  - Select user from dropdown, assign role
  - Show current project members list

### Phase 6: Frontend — Permission-Aware UI

- [ ] **T6.1** Create `apps/web/src/shared/hooks/use-permissions.ts`
  - `usePermissions()` — returns current user's permission matrix
  - `useHasPermission(module, action)` — boolean check
  - `useCanWrite(module)` — shorthand for write access
  - Used to show/hide UI elements based on permissions
- [ ] **T6.2** Implement permission-aware navigation
  - Sidebar items greyed out / hidden for unauthorized modules
  - "Read-only" badge on modules where user has only read access
  - Admin-only items (Users, Settings) hidden for non-admins
- [ ] **T6.3** Implement permission-aware action buttons
  - Lock buttons hidden if user doesn't have lock permission
  - Edit buttons hidden/disabled on locked documents
  - Unlock button visible only to Admin on locked documents

### Phase 7: Audit Logging for RBAC

- [ ] **T7.1** Log all permission checks
  - AuditLog: `{ action: 'permission.check', targetType: module, metadata: { action, role, result: allowed/denied } }`
  - AC: all permission checks logged in audit trail (FR72)
- [ ] **T7.2** Log user management actions
  - User created, updated, deactivated, reactivated
  - Project assignment changes
- [ ] **T7.3** Log unlock actions with justification
  - AuditLog: `{ action: 'document.unlock', targetType, targetId, metadata: { justification } }`

### Phase 8: Testing

- [ ] **T8.1** Unit tests for permission matrix — all 6 roles x all modules x all actions
- [ ] **T8.2** Unit tests for RBAC middleware — allowed and denied scenarios
- [ ] **T8.3** Unit tests for status-based access control — locked vs draft documents
- [ ] **T8.4** Integration test: Admin can create user and assign to project
- [ ] **T8.5** Integration test: Non-admin cannot access user management mutations
- [ ] **T8.6** Integration test: Clinical Specialist gets PermissionDenied when writing to CER
- [ ] **T8.7** Integration test: Admin can unlock a locked document with justification
- [ ] **T8.8** Frontend tests: usePermissions hook works correctly
- [ ] **T8.9** Frontend tests: admin page renders user list

## Dev Notes

### Tech Stack & Versions

No new dependencies required — this story builds on existing auth infrastructure from Stories 1.2 and 1.4.

### Permission Matrix Summary Table

| Role                | Project | SLS   | SOA   | Validation | CER           | PMS   | Users | Audit |
| ------------------- | ------- | ----- | ----- | ---------- | ------------- | ----- | ----- | ----- |
| Admin               | Full    | Full  | Full  | Full       | Full          | Full  | Full  | Read  |
| RA Manager          | R/W     | R/W/L | R/W/L | R/W/L      | R/W/L         | R/W/L | Read  | Read  |
| Clinical Specialist | Read    | R/W/L | R/W/L | Read       | **Read-only** | R/W   | -     | -     |
| Data Science        | Read    | Read  | Read  | R/W        | Read          | Read  | -     | -     |
| Executive           | Read    | Read  | Read  | Read       | Read          | Read  | -     | Read  |
| Auditor             | Read    | Read  | Read  | Read       | Read          | Read  | -     | Read  |

R=Read, W=Write, L=Lock

### Three-Axis Permission Check

Every permission check evaluates three dimensions:

1. **Role**: Does the user's role allow this action on this module?
2. **Module**: Is this the correct module for the action?
3. **Document Status**: Is the document in a state that allows this action?

```typescript
// Permission check pseudocode
function checkPermission(user, module, action, document?) {
  // 1. Role check
  if (!ROLE_PERMISSIONS[user.role][module].includes(action)) {
    throw new PermissionDeniedError(`Role ${user.role} cannot ${action} on ${module}`);
  }

  // 2. Project membership check
  if (document?.projectId && !isProjectMember(user.id, document.projectId)) {
    throw new PermissionDeniedError('Not a member of this project');
  }

  // 3. Status-based check
  if (document?.status === 'LOCKED' && action === 'write') {
    if (user.role !== 'ADMIN') {
      throw new PermissionDeniedError('Document is locked. Only Admin can modify.');
    }
  }
}
```

### Admin Unlock Flow

When an Admin unlocks a locked document:

1. Admin clicks "Unlock" on a locked document
2. Dialog appears requiring justification text (mandatory, min 10 characters)
3. System logs: `{ action: 'document.unlock', targetType, targetId, before: { status: 'LOCKED' }, after: { status: 'DRAFT' }, metadata: { justification } }`
4. Document status changes from LOCKED to DRAFT
5. This is a heavyweight action — the LockConfirmation dialog pattern should be used

### Naming Conventions

- Permission types: UPPER_SNAKE_CASE — `READ`, `WRITE`, `LOCK`, `UNLOCK`, `DELETE`, `ADMIN`
- Module types: lowercase — `sls`, `soa`, `validation`, `cer`, `pms`, `project`, `users`, `audit`
- Role names: UPPER_SNAKE_CASE — `ADMIN`, `RA_MANAGER`, `CLINICAL_SPECIALIST`, `DATA_SCIENCE`, `EXECUTIVE`, `AUDITOR`

### Anti-Patterns to Avoid

- Do NOT rely on UI hiding alone for security — all permissions MUST be enforced at the GraphQL resolver level
- Do NOT check permissions inside use cases — use the RBAC middleware at the resolver boundary
- Do NOT allow deleting users — only deactivate (data retention requirement S7: 15 years)
- Do NOT allow removing the last Admin — at least one Admin must always exist
- Do NOT skip permission logging — every check must be audited (FR72)
- Do NOT hardcode role checks in components — use the `usePermissions` hook

### Project Structure Notes

```
packages/shared/src/
├── constants/
│   ├── roles.ts                     # Updated — full role list
│   └── permissions.ts               # NEW — permission matrix
└── types/
    └── permissions.ts               # NEW — permission types

apps/api/src/
├── modules/auth/
│   ├── application/use-cases/
│   │   ├── manage-users.ts          # NEW
│   │   ├── assign-user-to-project.ts # NEW
│   │   └── unlock-document.ts       # NEW
│   └── graphql/
│       ├── types.ts                 # Updated — User management types
│       ├── queries.ts               # Updated — users, projectMembers
│       └── mutations.ts             # Updated — CRUD, assignment, unlock
└── shared/middleware/
    └── rbac-middleware.ts           # NEW

apps/web/src/
├── routes/_authenticated/admin/
│   └── users.tsx                    # NEW — User management page
├── shared/hooks/
│   └── use-permissions.ts           # NEW
└── features/auth/components/
    ├── UserManagementTable.tsx       # NEW
    ├── UserCreateDialog.tsx          # NEW
    └── UserEditDialog.tsx            # NEW
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Authentication & Security — RBAC Multi-dimensional, Cross-Cutting Concerns)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.6, FRs 68-73)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
