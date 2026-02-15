# Story 1.8: Project Creation & CEP Configuration

Status: ready-for-dev

## Story

As an admin or RA Manager,
I want to create a new clinical affairs project and configure the Clinical Evaluation Plan,
So that my team can begin working on a device's regulatory documentation (FR1-FR3).

## Acceptance Criteria

**Given** an authenticated user with Admin or RA Manager role
**When** the user clicks "+ New Project" on the dashboard
**Then** a 3-step form appears: (1) Device information (name, class, regulatory context CE-MDR/FDA), (2) CEP configuration (scope, objectives, device classification), (3) Team assignment
**And** the project is created with a unique ID (UUID v7)
**And** the project dashboard shows the pipeline status bar with all 5 modules in "Not started" state
**And** the form auto-saves at each step change (R3)
**And** if it's the user's first project, an optional onboarding wizard is offered
**And** the project creation emits a domain event `project.project.created` via RabbitMQ
**And** FR2: CEP fields include scope, objectives, and device classification
**And** FR3: SLS sessions can be linked to this CEP

## Tasks / Subtasks

### Phase 1: Backend — Project Use Cases

- [ ] **T1.1** Create `apps/api/src/modules/project/application/use-cases/create-project.ts`
  - Validates input with Zod schema
  - Creates Project with UUID v7
  - Creates initial CEP record (empty, to be configured)
  - Adds the creating user as a ProjectMember
  - Emits `project.project.created` domain event via RabbitMQ
  - Requires ADMIN or RA_MANAGER role
  - AC: project created with unique ID (UUID v7)
- [ ] **T1.2** Create `apps/api/src/modules/project/application/use-cases/configure-cep.ts`
  - Updates CEP for a project
  - Fields: scope, objectives, deviceClassification, clinicalBackground, searchStrategy
  - Validates that project exists and user has write permission
  - AC: CEP fields include scope, objectives, device classification (FR2)
- [ ] **T1.3** Create `apps/api/src/modules/project/application/use-cases/assign-users.ts`
  - Adds multiple users to a project in batch
  - Each user gets a role assignment for the project
  - Validates users exist and are active
- [ ] **T1.4** Create `apps/api/src/modules/project/application/use-cases/get-project-dashboard.ts`
  - Returns project with:
    - CEP configuration
    - Pipeline status for all 5 modules (computed from module states)
    - Team members
    - Recent activity (last 10 audit entries)
  - AC: project dashboard shows pipeline status

### Phase 2: Backend — Domain Event Integration

- [ ] **T2.1** Create `apps/api/src/shared/events/event-bus.ts` — EventBus interface
  ```typescript
  interface EventBus {
    publish<T>(event: DomainEvent<T>): Promise<void>;
    subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
  }
  ```
- [ ] **T2.2** Create `apps/api/src/shared/events/rabbitmq-event-bus.ts` — RabbitMQ implementation
  - Connect to RabbitMQ using `amqplib`
  - Publish events with routing key = eventType
  - Exchange type: topic
  - AC: project creation emits domain event via RabbitMQ
- [ ] **T2.3** Create `apps/api/src/modules/project/domain/events/project-created.ts`
  ```typescript
  // Event payload
  interface ProjectCreatedData {
    projectId: string;
    name: string;
    deviceName: string;
    regulatoryContext: string;
    createdBy: string;
  }
  // Event type: 'project.project.created'
  ```

### Phase 3: Backend — GraphQL API for Projects

- [ ] **T3.1** Update `apps/api/src/modules/project/graphql/mutations.ts`
  - `createProject(input: CreateProjectInput!)` — creates project with initial CEP
  - `updateProject(id: ID!, input: UpdateProjectInput!)` — updates project metadata
  - `configureCep(projectId: ID!, input: ConfigureCepInput!)` — updates CEP configuration
  - All mutations wrapped with audit middleware and RBAC checks
- [ ] **T3.2** Update `apps/api/src/modules/project/graphql/queries.ts`
  - `projects(filter: ProjectFilter)` — list projects (filtered by user membership)
  - `project(id: ID!)` — single project with CEP, members, pipeline status
  - `projectDashboard(id: ID!)` — full dashboard data including pipeline status and recent activity
- [ ] **T3.3** Create Zod validation schemas in `packages/shared/src/schemas/`
  - `CreateProjectInput` — name (required, 3-100 chars), deviceName (required), deviceClass (required, enum), regulatoryContext (required, enum: CE_MDR, FDA_510K, BOTH)
  - `ConfigureCepInput` — scope, objectives, deviceClassification, clinicalBackground, searchStrategy (all optional text fields)

### Phase 4: Frontend — Project Creation Flow

- [ ] **T4.1** Create `apps/web/src/features/project/components/ProjectCreateWizard.tsx`
  - 3-step stepper form (horizontal stepper, cohesive with pipeline topbar):
    - **Step 1 — Device Information**: name, device name, device class (I, IIa, IIb, III), regulatory context (CE-MDR, FDA 510(k), Both)
    - **Step 2 — CEP Configuration**: scope (textarea), objectives (textarea), device classification (text), clinical background (textarea)
    - **Step 3 — Team Assignment**: user multi-select, role assignment per user
  - Stepper progress indicator at top
  - "Previous" / "Next" navigation buttons
  - Auto-save at each step change
  - Final "Create Project" button on step 3
  - AC: 3-step form appears
- [ ] **T4.2** Implement form validation with React Hook Form + Zod
  - Use `@hookform/resolvers/zod` for Zod schema validation
  - Validate per step before advancing
  - Labels above fields, inline validation messages below fields (per UX spec)
- [ ] **T4.3** Implement auto-save at step changes
  - Use `useAutoSave` hook from Story 1.7
  - Save partial data as draft at each step transition
  - AC: form auto-saves at each step change (R3)
- [ ] **T4.4** Create user multi-select component for team assignment
  - Search users by name/email
  - Assign role per user (dropdown)
  - Show selected users as chips

### Phase 5: Frontend — Projects List Page

- [ ] **T5.1** Create `apps/web/src/routes/_authenticated/projects/index.tsx`
  - Project cards grid layout
  - Each card shows: project name, device name, regulatory context badge, pipeline mini-dots (5 colored circles showing module status)
  - "+ New Project" button (primary, top right)
  - Empty state: "Welcome to CORTEX. Create your first project to get started."
  - AC: projects list with mini pipeline status dots
- [ ] **T5.2** Create `apps/web/src/features/project/components/ProjectCard.tsx`
  - Card (shadow-sm, white bg on #F8F9FA)
  - Shows: name, device name, regulatory context badge, creation date
  - Mini pipeline dots: 5 small circles (SLS, SOA, Validation, CER, PMS) with status colors
  - Click navigates to project dashboard

### Phase 6: Frontend — Onboarding Wizard

- [ ] **T6.1** Implement optional onboarding wizard
  - Check if user has 0 projects -> show onboarding banner
  - Non-intrusive banner at top of dashboard (not a blocking modal)
  - "First time here? Let me guide you through the process." + "Get Started" / "Skip"
  - If accepted: tooltip-style walkthrough of key UI elements (pipeline, sidebar, modules)
  - AC: optional onboarding wizard offered for first project

### Phase 7: Frontend — Project Dashboard Page

- [ ] **T7.1** Create `apps/web/src/routes/_authenticated/projects/$projectId/index.tsx`
  - Full PipelineProgressBar at top (from Story 1.3)
  - All 5 modules in "Not started" state for new projects
  - Project info card: device name, class, regulatory context
  - CEP summary card (if configured)
  - Team members list
  - Recent activity feed (from audit trail)
  - AC: pipeline status bar with all 5 modules in "Not started" state
- [ ] **T7.2** Update sidebar navigation for project context
  - When inside a project, sidebar shows project-specific navigation
  - Items: Dashboard, SLS Sessions, SOA Analyses, Validation Studies, CER Versions, PMS, Settings
  - Each item shows status dot matching pipeline status

### Phase 8: Testing

- [ ] **T8.1** Unit test: create-project use case creates project, CEP, and emits event
- [ ] **T8.2** Unit test: configure-cep use case validates input and updates CEP
- [ ] **T8.3** Integration test: full project creation flow via GraphQL
- [ ] **T8.4** Integration test: RabbitMQ event published on project creation
- [ ] **T8.5** Frontend test: ProjectCreateWizard renders 3 steps
- [ ] **T8.6** Frontend test: form validation works per step
- [ ] **T8.7** Frontend test: ProjectCard renders with mini pipeline dots
- [ ] **T8.8** Frontend test: project dashboard shows pipeline in "Not started" state

## Dev Notes

### Tech Stack & Versions

| Technology          | Version | Package                     |
| ------------------- | ------- | --------------------------- |
| amqplib             | latest  | `amqplib` (RabbitMQ client) |
| React Hook Form     | latest  | `react-hook-form`           |
| @hookform/resolvers | latest  | `@hookform/resolvers`       |

### Domain Event Format

```typescript
// project.project.created event
{
  eventType: 'project.project.created',
  aggregateId: '<project-uuid>',
  aggregateType: 'Project',
  data: {
    projectId: '<project-uuid>',
    name: 'CINA CSpine Clinical Evaluation',
    deviceName: 'CINA CSpine',
    regulatoryContext: 'CE_MDR',
    createdBy: '<user-uuid>',
  },
  metadata: {
    userId: '<user-uuid>',
    timestamp: '2026-02-14T10:30:00.000Z',
    correlationId: '<request-uuid>',
    version: 1,
  },
}
```

### Pipeline Status Computation

For a new project, all 5 module statuses default to `NOT_STARTED`:

```typescript
type ModuleStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED' | 'LOCKED' | 'BLOCKED';

interface PipelineStatus {
  sls: ModuleStatus; // NOT_STARTED -> ACTIVE -> LOCKED
  soa: ModuleStatus; // BLOCKED (until SLS locked) -> ACTIVE -> LOCKED
  validation: ModuleStatus;
  cer: ModuleStatus;
  pms: ModuleStatus;
}
```

For a new project: `{ sls: 'NOT_STARTED', soa: 'BLOCKED', validation: 'BLOCKED', cer: 'BLOCKED', pms: 'BLOCKED' }`

### Device Classification Options

- Class I
- Class IIa
- Class IIb
- Class III

### Regulatory Context Options

- CE-MDR (European Medical Device Regulation)
- FDA 510(k) (US Food & Drug Administration)
- Both (dual submission)

### Form Pattern (from UX Spec)

- Stepper horizontal at top (cohesive with pipeline topbar)
- Labels above fields, text-secondary (14px semi-bold)
- Placeholder as hint, not label
- Validation inline: error message in red below field, red border on field
- "Previous" button (secondary, left) / "Next" button (primary, right)
- Auto-save at each step change

### Anti-Patterns to Avoid

- Do NOT create projects without a CEP — always create an empty CEP record alongside the project
- Do NOT skip the domain event — `project.project.created` must be emitted for downstream listeners
- Do NOT put project creation logic in the resolver — use the create-project use case
- Do NOT validate in the use case what Zod already validates — validate at the boundary only
- Do NOT show the onboarding wizard as a blocking modal — use a dismissible banner

### Project Structure Notes

```
apps/api/src/
├── modules/project/
│   ├── application/use-cases/
│   │   ├── create-project.ts        # NEW
│   │   ├── configure-cep.ts         # NEW
│   │   ├── assign-users.ts          # NEW
│   │   └── get-project-dashboard.ts # NEW
│   ├── domain/events/
│   │   └── project-created.ts       # NEW
│   ├── infrastructure/repositories/
│   │   └── project-repository.ts    # Updated
│   └── graphql/
│       ├── types.ts                 # Updated
│       ├── queries.ts               # Updated
│       └── mutations.ts             # Updated
├── shared/events/
│   ├── event-bus.ts                 # NEW — interface
│   └── rabbitmq-event-bus.ts        # NEW — RabbitMQ implementation

packages/shared/src/schemas/
├── project.schema.ts                # NEW — Zod schemas
└── common.schema.ts                 # Updated

apps/web/src/
├── routes/_authenticated/projects/
│   ├── index.tsx                    # Updated — projects list
│   └── $projectId/
│       └── index.tsx                # Updated — project dashboard
├── features/project/
│   ├── components/
│   │   ├── ProjectCreateWizard.tsx  # NEW
│   │   ├── ProjectCard.tsx          # NEW
│   │   └── TeamAssignment.tsx       # NEW
│   ├── hooks/
│   │   └── use-projects.ts         # NEW
│   └── graphql/
│       ├── queries.ts              # NEW
│       └── mutations.ts            # NEW
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Domain Events, Project Module structure)
- UX Spec: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (Journey 1 — Project Setup & Onboarding, Form Patterns)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.8, FRs 1-3)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
