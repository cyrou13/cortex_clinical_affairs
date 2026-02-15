# Story 1.9: Project Dashboard & Pipeline Status

Status: ready-for-dev

## Story

As a user,
I want to see a dashboard showing the status of all modules for my project at a glance,
So that I always know where the project stands and what needs my attention (FR4-FR5).

## Acceptance Criteria

**Given** a user navigates to a project
**When** the project dashboard loads
**Then** the PipelineProgressBar shows current status of each module (not started, active, completed, locked, blocked)
**And** each module node is clickable to navigate to that module
**And** blocked modules show a tooltip explaining the dependency ("Requires SLS to be locked")
**And** the dashboard shows project timeline with deadlines and milestones (FR5)
**And** the main content area shows project cards for recent activity
**And** project-level metrics are displayed with Stripe-style typography (large numbers, clear hierarchy)
**And** the projects list page shows all projects the user has access to, with mini pipeline status dots

## Tasks / Subtasks

### Phase 1: Backend — Pipeline Status Computation Service

- [ ] **T1.1** Create `apps/api/src/modules/project/application/use-cases/get-pipeline-status.ts`
      Compute pipeline status for a project by querying each module's state:

  ```typescript
  interface PipelineStatus {
    sls: { status: ModuleStatus; sessionCount: number; lockedCount: number };
    soa: { status: ModuleStatus; analysisCount: number; lockedCount: number };
    validation: { status: ModuleStatus; studyCount: number; lockedCount: number };
    cer: { status: ModuleStatus; versionCount: number; lockedCount: number };
    pms: { status: ModuleStatus; cycleCount: number };
  }

  type ModuleStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED' | 'LOCKED' | 'BLOCKED';
  ```

  - SLS: NOT_STARTED if no sessions, ACTIVE if sessions exist, LOCKED if all sessions locked
  - SOA: BLOCKED if SLS not locked, ACTIVE if analyses exist, LOCKED if all locked
  - Validation: BLOCKED if SOA not locked, ACTIVE if studies exist, LOCKED if all locked
  - CER: BLOCKED if upstream not locked, ACTIVE if versions exist, LOCKED if current locked
  - PMS: BLOCKED if CER not locked, ACTIVE if plans exist
  - AC: PipelineProgressBar shows current status of each module

- [ ] **T1.2** Create pipeline dependency rules

  ```typescript
  const PIPELINE_DEPENDENCIES = {
    sls: [], // No dependencies
    soa: ['sls'], // Requires locked SLS
    validation: ['soa'], // Requires locked SOA
    cer: ['sls', 'soa', 'validation'], // Requires all upstream locked
    pms: ['cer'], // Requires locked CER
  };
  ```

  - AC: blocked modules with dependency explanations

### Phase 2: Backend — Dashboard Data Aggregation

- [ ] **T2.1** Create `apps/api/src/modules/project/application/use-cases/get-project-metrics.ts`
      Aggregate project-level metrics:

  ```typescript
  interface ProjectMetrics {
    totalArticles: number; // From SLS
    includedArticles: number; // From SLS (included status)
    soaSectionsComplete: number; // e.g., 8/11
    soaSectionsTotal: number;
    cerSectionsComplete: number; // e.g., 0/14
    cerSectionsTotal: number;
    traceabilityCoverage: number; // percentage
    teamMemberCount: number;
    lastActivityAt: string; // ISO 8601
  }
  ```

  - For new projects, all counts are 0
  - AC: project-level metrics displayed

- [ ] **T2.2** Create `apps/api/src/modules/project/application/use-cases/get-recent-activity.ts`
  - Query recent audit log entries for the project
  - Return last 20 entries with: user name, action description, timestamp
  - Format action descriptions for human readability
  - AC: recent activity feed
- [ ] **T2.3** Create `apps/api/src/modules/project/application/use-cases/get-project-timeline.ts`
  - Return project milestones and deadlines
  - Default milestones: one per module (SLS complete, SOA complete, etc.)
  - Each milestone: name, target date (optional), actual completion date, status
  - AC: project timeline with deadlines and milestones (FR5)

### Phase 3: Backend — GraphQL Dashboard Queries

- [ ] **T3.1** Update `apps/api/src/modules/project/graphql/queries.ts`
  - `projectDashboard(projectId: ID!)` — returns:
    - Project info (name, device, regulatory context)
    - Pipeline status
    - Metrics
    - Recent activity (last 20)
    - Timeline milestones
    - Team members
  - `projects(filter: ProjectFilter)` — returns project list with mini pipeline status for each
- [ ] **T3.2** Create Pothos types for dashboard data
  - `PipelineStatusType` — with nested module status types
  - `ProjectMetricsType` — large number fields
  - `ActivityEntryType` — audit log entries formatted for display
  - `MilestoneType` — timeline entries

### Phase 4: Frontend — Project Dashboard Page

- [ ] **T4.1** Update `apps/web/src/routes/_authenticated/projects/$projectId/index.tsx`
      Full project dashboard layout:

  ```
  ┌──────────────────────────────────────────────────┐
  │         PipelineProgressBar (from topbar)         │
  ├──────────────────────────────────────────────────┤
  │                                                   │
  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
  │  │ Total   │ │ Included│ │ SOA     │ │ CER    │ │
  │  │ Articles│ │ Articles│ │ Sections│ │ Status │ │
  │  │ 4,521   │ │ 641     │ │ 0/11   │ │ 0/14   │ │
  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
  │                                                   │
  │  ┌──────────────────┐  ┌─────────────────────┐   │
  │  │ Project Timeline │  │ Recent Activity     │   │
  │  │ (milestones)     │  │ (audit feed)        │   │
  │  └──────────────────┘  └─────────────────────┘   │
  │                                                   │
  │  ┌──────────────────┐  ┌─────────────────────┐   │
  │  │ Team Members     │  │ Quick Actions       │   │
  │  └──────────────────┘  └─────────────────────┘   │
  └──────────────────────────────────────────────────┘
  ```

  - AC: main content area shows project cards

- [ ] **T4.2** Create project metrics cards with Stripe-style typography
  - Large number (text-2xl, bold, blue-900)
  - Label below (text-sm, text-muted)
  - Card container (white, shadow-sm)
  - 4 metrics in a row at the top
  - AC: project-level metrics with Stripe-style typography (large numbers, clear hierarchy)
- [ ] **T4.3** Create project timeline component
  - Vertical timeline with milestones
  - Each milestone: name, target date, status icon (check/circle/clock)
  - Connected by vertical line (solid for completed, dashed for upcoming)
  - AC: project timeline with deadlines and milestones (FR5)
- [ ] **T4.4** Create recent activity feed component
  - Timeline list of recent actions
  - Each entry: user avatar, action text, relative timestamp ("2 hours ago")
  - Clickable entries navigate to the relevant entity
  - AC: recent activity cards
- [ ] **T4.5** Create team members card
  - List of project members with: avatar, name, role badge
  - "Manage Team" link (visible to Admin/RA Manager only)
- [ ] **T4.6** Create quick actions card
  - Context-aware action buttons based on pipeline status
  - New project: "Start SLS" button
  - SLS locked: "Begin SOA" button
  - All locked: "Export CER" button
  - Each button navigates to the relevant module

### Phase 5: Frontend — Enhanced PipelineProgressBar

- [ ] **T5.1** Update PipelineProgressBar (from Story 1.3) with interactive features
  - Clickable nodes navigate to the module: `/projects/:projectId/sls-sessions`
  - Blocked nodes show tooltip: "Requires SLS to be locked"
  - Active node has subtle pulse animation
  - Count badge below each node: "3 sessions", "2 analyses"
  - AC: each module node is clickable, blocked modules show tooltip
- [ ] **T5.2** Create module navigation from pipeline clicks
  - SLS node -> `/projects/:projectId/sls-sessions`
  - SOA node -> `/projects/:projectId/soa-analyses`
  - Validation node -> `/projects/:projectId/validation-studies`
  - CER node -> `/projects/:projectId/cer-versions`
  - PMS node -> `/projects/:projectId/pms`

### Phase 6: Frontend — Projects List Enhancement

- [ ] **T6.1** Update projects list page with mini pipeline dots
  - Each project card shows 5 small colored circles:
    - Grey = not started
    - Blue = active
    - Green = completed/locked
    - Orange = blocked (with dependency)
  - Sorting: by name, by last activity, by creation date
  - Filtering: by regulatory context, by status
  - AC: projects list with mini pipeline status dots
- [ ] **T6.2** Create ProjectLayout wrapper
  - `apps/web/src/shared/layouts/ProjectLayout.tsx`
  - Wraps project pages with pipeline topbar and project-scoped sidebar
  - Loads project data and provides context to child routes

### Phase 7: Testing

- [ ] **T7.1** Unit test: pipeline status computation — all status combinations
- [ ] **T7.2** Unit test: dependency rules — blocked modules correctly identified
- [ ] **T7.3** Unit test: metrics aggregation returns correct counts
- [ ] **T7.4** Integration test: projectDashboard query returns complete data
- [ ] **T7.5** Frontend test: dashboard renders all sections correctly
- [ ] **T7.6** Frontend test: metrics cards show Stripe-style numbers
- [ ] **T7.7** Frontend test: pipeline nodes are clickable and navigate correctly
- [ ] **T7.8** Frontend test: blocked nodes show dependency tooltips
- [ ] **T7.9** Frontend test: projects list shows mini pipeline dots

## Dev Notes

### Tech Stack & Versions

No new dependencies. Uses existing Apollo Client, TanStack Router, and shadcn components.

### Pipeline Status Logic (Critical)

The pipeline status computation is the core wayfinding mechanism for the entire application. It must be deterministic and consistent:

```typescript
function computeModuleStatus(module: string, project: Project): ModuleStatus {
  const dependencies = PIPELINE_DEPENDENCIES[module];

  // Check if dependencies are met
  for (const dep of dependencies) {
    const depStatus = computeModuleStatus(dep, project);
    if (depStatus !== 'LOCKED' && depStatus !== 'COMPLETED') {
      return 'BLOCKED';
    }
  }

  // Check module-specific state
  const moduleData = getModuleData(module, project);
  if (!moduleData || moduleData.count === 0) return 'NOT_STARTED';
  if (moduleData.allLocked) return 'LOCKED';
  return 'ACTIVE';
}
```

### Stripe-Style Typography for Metrics

From UX spec — the "Stripe Clarity" influence:

- Large number: `text-2xl` (24px), `font-bold`, `text-cortex-blue-900`
- Label: `text-sm` (14px), `font-normal`, `text-cortex-text-muted`
- Card padding: `space-6` (24px)
- Card background: white, `shadow-sm`, no border
- Number alignment: use `tabular-nums` for consistent digit width

Example:

```
┌──────────┐
│  4,521   │  <- text-2xl bold
│ Articles │  <- text-sm muted
└──────────┘
```

### Dependency Tooltip Messages

| Module     | Blocked Message                             |
| ---------- | ------------------------------------------- |
| SOA        | "Requires at least one locked SLS session"  |
| Validation | "Requires at least one locked SOA analysis" |
| CER        | "Requires locked SLS, SOA, and Validation"  |
| PMS        | "Requires a locked CER version"             |

### Activity Feed Formatting

Transform audit log entries into human-readable activity descriptions:

- `project.project.created` -> "Marie created this project"
- `sls.session.created` -> "Thomas created SLS session 'Clinical Literature'"
- `sls.dataset.locked` -> "Thomas locked the SLS dataset (641 articles)"
- `auth.user.assigned` -> "Marie added Sophie to the team as Clinical Specialist"

### Anti-Patterns to Avoid

- Do NOT compute pipeline status on the frontend — compute on the backend for consistency
- Do NOT hardcode module counts — always query from the actual module data
- Do NOT block the entire dashboard if one query fails — show partial data with error indication
- Do NOT use polling for dashboard updates — use Apollo cache invalidation or subscriptions later
- Do NOT show raw audit log entries — format them for human readability

### Project Structure Notes

```
apps/api/src/modules/project/
├── application/use-cases/
│   ├── create-project.ts            # Existing
│   ├── get-pipeline-status.ts       # NEW
│   ├── get-project-metrics.ts       # NEW
│   ├── get-recent-activity.ts       # NEW
│   └── get-project-timeline.ts      # NEW
└── graphql/
    ├── types.ts                     # Updated — dashboard types
    └── queries.ts                   # Updated — dashboard query

apps/web/src/
├── routes/_authenticated/projects/
│   ├── index.tsx                    # Updated — enhanced list
│   └── $projectId/
│       └── index.tsx                # Updated — full dashboard
├── features/project/
│   ├── components/
│   │   ├── ProjectCard.tsx          # Updated — mini pipeline
│   │   ├── ProjectMetrics.tsx       # NEW
│   │   ├── ProjectTimeline.tsx      # NEW
│   │   ├── ActivityFeed.tsx         # NEW
│   │   ├── TeamMembersCard.tsx      # NEW
│   │   └── QuickActions.tsx         # NEW
│   └── hooks/
│       └── use-project-dashboard.ts # NEW
├── shared/
│   ├── components/
│   │   └── PipelineProgressBar.tsx  # Updated — clickable, tooltips
│   └── layouts/
│       └── ProjectLayout.tsx        # NEW
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Cross-Cutting — Sequential Dependency Enforcement)
- UX Spec: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (Journey 1, Pipeline Pattern, Stripe-style typography, Feedback patterns)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.9, FRs 4-5)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
