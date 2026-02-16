# Story 1.3: Application Shell & Navigation Layout

Status: done

## Story

As a user,
I want a professional application shell with sidebar navigation, pipeline progress bar, and responsive layout,
So that I can navigate between modules and always know where I am in the project.

## Acceptance Criteria

**Given** the frontend workspace (apps/web) with React 19 + Vite
**When** the application loads
**Then** the layout displays: dark sidebar (240px, #0A3153) + topbar pipeline (56px) + main work area (flex-1) + retractable detail panel (380px) + statusbar (32px)
**And** the sidebar is collapsible to 64px (icon-only mode) with a toggle button
**And** TanStack Router is configured with type-safe routes matching the project structure
**And** Apollo Client is configured for GraphQL queries with normalized cache
**And** the PipelineProgressBar component renders 5 nodes (SLS -> SOA -> Validation -> CER -> PMS) with status icons
**And** the StatusBadge component renders with all 7 variants (draft, screening, uncertain, include, exclude, locked, completed)
**And** design tokens are defined in packages/config-tailwind (Cortex Blue palette, Inter font, spacing scale, status colors)
**And** shadcn/ui components are installed and themed with CORTEX design tokens
**And** Lucide Icons are used consistently across the application
**And** the layout adapts to screen sizes: >=1920px (full), 1440-1919px (panel retracted), 1280-1439px (sidebar icons), <1280px (minimum size message)
**And** Cmd+K opens a command palette for quick navigation
**And** skip link "Go to main content" is the first focusable element

## Tasks / Subtasks

### Phase 1: Frontend Dependencies Installation

- [ ] **T1.1** Install React 19 and Vite in `apps/web`
  - `react` 19.x, `react-dom` 19.x, `vite`, `@vitejs/plugin-react`
- [ ] **T1.2** Install TanStack Router
  - `@tanstack/react-router` 1.159.x, `@tanstack/router-devtools`
- [ ] **T1.3** Install Apollo Client
  - `@apollo/client` 3.x, `graphql` 16.x
- [ ] **T1.4** Install Tailwind CSS 4 and shadcn/ui
  - `tailwindcss` 4.x, `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`
  - Initialize shadcn/ui with `npx shadcn@latest init`
- [ ] **T1.5** Install Lucide Icons
  - `lucide-react`
- [ ] **T1.6** Install Zustand 5 for client-side state
  - `zustand` 5.x
- [ ] **T1.7** Install Inter font
  - `@fontsource-variable/inter` or configure from Google Fonts

### Phase 2: Design Tokens in packages/config-tailwind

- [ ] **T2.1** Define CORTEX color tokens in `packages/config-tailwind/tailwind.config.ts`

  ```
  Primary Scale (Cortex Blue):
  --cortex-blue-50: #F0F6FB    (hover, selected row)
  --cortex-blue-100: #E1EDF8   (active background, sidebar selected)
  --cortex-blue-200: #C2DCF0   (focus rings)
  --cortex-blue-300: #A4CBE8   (disabled accent, skeleton)
  --cortex-blue-400: #85BAE0   (secondary hover)
  --cortex-blue-500: #0F4C81   (PRIMARY — buttons, links, active states)
  --cortex-blue-600: #0D3F6A   (button hover)
  --cortex-blue-700: #0A3153   (sidebar background, pressed)
  --cortex-blue-800: #07233C   (dark accent)
  --cortex-blue-900: #051525   (text primary, headings)

  Semantic State Colors:
  --cortex-success: #27AE60
  --cortex-warning: #F39C12
  --cortex-error: #E74C3C
  --cortex-info: #3498DB

  Neutrals:
  --cortex-bg-primary: #FFFFFF
  --cortex-bg-secondary: #F8F9FA
  --cortex-bg-tertiary: #ECF0F1
  --cortex-border: #E1EDF8
  --cortex-border-strong: #C2DCF0
  --cortex-text-primary: #051525
  --cortex-text-secondary: #2C3E50
  --cortex-text-muted: #7F8C8D
  ```

  - AC: Cortex Blue palette defined

- [ ] **T2.2** Define typography scale

  ```
  --cortex-text-xs: 12px / 400 / 1.5
  --cortex-text-sm: 14px / 400 / 1.5
  --cortex-text-base: 16px / 400 / 1.6
  --cortex-text-lg: 18px / 500 / 1.5
  --cortex-text-xl: 20px / 600 / 1.4
  --cortex-text-2xl: 24px / 600 / 1.3
  --cortex-text-3xl: 30px / 700 / 1.2
  ```

  - AC: Inter font, 7-level type scale

- [ ] **T2.3** Define spacing scale (4px base unit)
  - space-1 (4px) through space-12 (48px)
  - AC: spacing scale defined
- [ ] **T2.4** Define desktop breakpoints
  ```
  compact: 1280px
  standard: 1440px
  wide: 1920px
  ultra: 2560px
  ```

### Phase 3: shadcn/ui Component Installation & Theming

- [ ] **T3.1** Install core shadcn/ui components in `packages/ui`
  - Button, Card, Dialog, Sheet, Badge, Tooltip, Popover, Command, Separator, ScrollArea, Skeleton, Toast, Breadcrumb, Progress, Alert, Tabs, DropdownMenu, Toggle, Input, Select, Textarea
- [ ] **T3.2** Re-theme all shadcn components with CORTEX design tokens via CSS variables
  - Button: 5 variants (primary/secondary/success/danger/ghost)
  - Card: shadow-sm, no border, white bg on #F8F9FA
  - Tooltip: bg #07233C, text white, 200ms delay
  - Dialog: backdrop blur, CORTEX styling
  - AC: shadcn/ui themed with CORTEX tokens

### Phase 4: Layout Shell Components

- [ ] **T4.1** Create `apps/web/src/shared/layouts/AppLayout.tsx`
  - Fixed layout: Topbar (56px) + Sidebar (240px/64px) + Main (flex-1) + Detail panel (380px/0px) + Statusbar (32px)
  - Use CSS Grid or Flexbox for layout zones
  - Three background levels: sidebar dark (#0A3153), page secondary (#F8F9FA), work area white (#FFFFFF)
  - AC: layout displays correctly
- [ ] **T4.2** Create sidebar component with dark theme
  - Background: #0A3153
  - Navigation items: Lucide icon + label text
  - Active item: bg blue-100 (#E1EDF8), text blue-50
  - Collapsible to 64px (icon-only) with toggle button
  - AC: sidebar is collapsible
- [ ] **T4.3** Create topbar component with pipeline progress area
  - Height: 56px, fixed at top
  - Contains PipelineProgressBar and breadcrumb
  - AC: topbar displays
- [ ] **T4.4** Create detail panel component
  - Width: 380px, retractable to 0px
  - Slide-in animation (200ms)
  - Uses shadcn Sheet as base
  - Closes with Escape key
  - AC: detail panel retractable
- [ ] **T4.5** Create statusbar component
  - Height: 32px
  - Background: #F8F9FA
  - Shows: auto-save indicator (green dot), session info, module context
  - AC: statusbar displays

### Phase 5: Custom CORTEX Components

- [ ] **T5.1** Create `apps/web/src/shared/components/PipelineProgressBar.tsx`
  - 5 circular nodes connected by horizontal lines
  - Nodes: SLS, SOA, Validation, CER, PMS
  - States: not_started (grey), blocked (grey + lock), active (blue-500, pulsing), completed (success + check), locked (success + lock)
  - Connected lines: solid if completed, dashed if not reached
  - Labels under each node
  - Clickable nodes navigate to the module
  - Blocked nodes show tooltip "Requires X to be locked"
  - `role="navigation"`, `aria-label="Pipeline progression"`, `aria-current="step"`
  - Keyboard navigation: left/right arrows between nodes
  - AC: PipelineProgressBar renders 5 nodes with status icons
- [ ] **T5.2** Create `apps/web/src/shared/components/StatusBadge.tsx`
  - Pill with icon + label text, semantic background color
  - 7 variants:
    - draft: Blue-100 / Blue-700, circle icon
    - screening: Info-100 / Info-700, magnifying glass icon
    - uncertain: Warning-100 / Warning-700, question mark icon
    - include: Success-100 / Success-700, check icon
    - exclude: Error-100 / Error-700, X icon
    - locked: Blue-800 / White, lock icon
    - completed: Success-100 / Success-700, double check icon
  - `role="status"`, text label always present
  - AC: StatusBadge renders all 7 variants

### Phase 6: TanStack Router Configuration

- [ ] **T6.1** Create route tree structure in `apps/web/src/routes/`

  ```
  routes/
  ├── __root.tsx                    # Root layout with AppLayout
  ├── _authenticated.tsx            # Auth guard layout
  ├── _authenticated/
  │   ├── projects/
  │   │   ├── index.tsx             # Projects list
  │   │   └── $projectId/
  │   │       ├── index.tsx         # Project dashboard
  │   │       ├── sls-sessions/
  │   │       ├── soa-analyses/
  │   │       ├── validation-studies/
  │   │       ├── cer-versions/
  │   │       └── pms/
  │   └── admin/
  │       ├── users.tsx
  │       └── settings.tsx
  └── login.tsx
  ```

  - AC: TanStack Router with type-safe routes

- [ ] **T6.2** Configure `_authenticated.tsx` layout wrapper
  - Checks if user is authenticated (placeholder for Story 1.4)
  - Redirects to `/login` if not authenticated
  - Wraps content in AppLayout
- [ ] **T6.3** Create placeholder pages for all routes
  - Each returns a minimal component with route name for verification

### Phase 7: Apollo Client Configuration

- [ ] **T7.1** Create `apps/web/src/shared/graphql/client.ts`
  - Configure Apollo Client with normalized InMemoryCache
  - Set up HTTP link pointing to API `/graphql` endpoint
  - Configure WebSocket link for future subscriptions (graphql-ws)
  - Add auth header injection (Bearer token from storage)
  - AC: Apollo Client configured for GraphQL queries with normalized cache

### Phase 8: Zustand Stores

- [ ] **T8.1** Create `apps/web/src/stores/sidebar-store.ts`
  - State: isCollapsed, activeModule
  - Actions: toggle, setActiveModule
- [ ] **T8.2** Create `apps/web/src/stores/task-panel-store.ts`
  - State: isOpen, tasks[]
  - Actions: open, close, addTask, updateTask, removeTask
- [ ] **T8.3** Create `apps/web/src/stores/editor-store.ts` (placeholder)

### Phase 9: Responsive Behavior

- [ ] **T9.1** Implement breakpoint detection hook `apps/web/src/shared/hooks/use-breakpoint.ts`
  - Returns current breakpoint: compact, standard, wide, ultra
- [ ] **T9.2** Implement responsive layout behavior
  - > = 1920px: full layout with detail panel visible
  - 1440-1919px: panel retracted by default
  - 1280-1439px: sidebar icons only (64px)
  - < 1280px: message "CORTEX is optimized for screens >= 1280px"
  - AC: layout adapts to screen sizes

### Phase 10: Command Palette & Accessibility

- [ ] **T10.1** Create Cmd+K command palette using shadcn Command component
  - Search: projects, modules, actions
  - Fuzzy search
  - Keyboard: Cmd+K to open, Escape to close, arrow keys to navigate, Enter to select
  - AC: Cmd+K opens command palette
- [ ] **T10.2** Implement skip link
  - "Go to main content" as first focusable element (visually hidden, visible on focus)
  - Links to `<main id="main-content">`
  - AC: skip link is first focusable element
- [ ] **T10.3** Ensure semantic HTML throughout
  - `<nav>` for sidebar and pipeline
  - `<main>` for work area
  - `<aside>` for detail panel
  - `<header>` for topbar
  - `<footer>` for statusbar

### Phase 11: Vite Configuration & Testing

- [ ] **T11.1** Configure `apps/web/vite.config.ts`
  - React plugin, Tailwind CSS, path aliases
  - Proxy `/graphql` to API server in development
- [ ] **T11.2** Configure `apps/web/vitest.config.ts` for component testing
- [ ] **T11.3** Write tests for PipelineProgressBar — renders 5 nodes, states work
- [ ] **T11.4** Write tests for StatusBadge — renders all 7 variants
- [ ] **T11.5** Write tests for AppLayout — responsive behavior

## Dev Notes

### Tech Stack & Versions

| Technology      | Version  | Package                        |
| --------------- | -------- | ------------------------------ |
| React           | 19.x     | `react`, `react-dom`           |
| Vite            | latest   | `vite`, `@vitejs/plugin-react` |
| TanStack Router | 1.159.x  | `@tanstack/react-router`       |
| Apollo Client   | 3.x      | `@apollo/client`               |
| Zustand         | 5.x      | `zustand`                      |
| Tailwind CSS    | 4.x      | `tailwindcss`                  |
| shadcn/ui       | latest   | Via `npx shadcn@latest`        |
| Lucide Icons    | latest   | `lucide-react`                 |
| Inter Font      | variable | `@fontsource-variable/inter`   |

### Design Direction: Hybrid B+F — "Hybrid Velocity with Stripe Clarity"

Key visual decisions from UX spec:

- **Sidebar**: Dark (#0A3153), Lucide icons + short labels, active item in blue-100 with text blue-50, collapsible to 64px
- **Pipeline topbar**: Circular nodes connected by lines, status icons (circle/lock/check), text labels under nodes
- **Typography hierarchy**: Large metrics (text-2xl bold), strong titles (text-xl semibold), sub-info in text-muted — Stripe data-first style
- **Table rows**: 3px colored accent bar on left (status color), hover in blue-50
- **Cards**: Box-shadow subtle (shadow-sm), no visible borders, white bg on page #F8F9FA
- **Detail panel**: 380px right panel, sections with blue-50 background and blue-400 left border for AI reasoning
- **Background**: Three levels — sidebar #0A3153, page #F8F9FA, work area #FFFFFF

### Naming Conventions (Frontend)

- **React components**: PascalCase.tsx — `PipelineProgressBar.tsx`, `StatusBadge.tsx`
- **Hooks**: use- prefix, kebab-case — `use-breakpoint.ts`, `use-current-user.ts`
- **Stores**: domain + Store — `useSidebarStore`, `useTaskPanelStore`
- **Routes**: File-based routing via TanStack Router conventions
- **CSS**: Tailwind utility classes, CORTEX design tokens via CSS variables
- **Files**: kebab-case for everything except React components

### Layout Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Topbar Pipeline (56px)                     │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Sidebar   │              Work Area                          │
│  (240px)   │              (flex-1)                           │
│            │                                                 │
│  Collaps.  │                                    ┌───────────┤
│  → 64px    │                                    │  Detail   │
│            │                                    │  Panel    │
│            │                                    │  (380px)  │
│            │                                    │  Retract. │
├────────────┴────────────────────────────────────┴───────────┤
│                    Statusbar (32px)                           │
└──────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

- **Cmd+K**: Open command palette
- **Escape**: Close panel/dialog
- **Left/Right arrows**: Navigate pipeline nodes (when focused)
- **Tab**: Standard focus navigation

### Anti-Patterns to Avoid

- Do NOT use `fetch()` directly — use Apollo Client for GraphQL, TanStack Query only for non-GraphQL
- Do NOT put server state in Zustand — use Apollo Client for all GraphQL data
- Do NOT use inline styles — use Tailwind utility classes with design tokens
- Do NOT hardcode colors — always use CORTEX design tokens via CSS variables
- Do NOT create `<div onClick>` — use `<button>` for interactive elements
- Do NOT suppress focus outlines — use visible focus rings (blue-200, 2px)
- Do NOT import between feature directories — go through `shared/`

### WCAG 2.1 AA Requirements

- All text >= 4.5:1 contrast ratio on background
- Interactive elements >= 3:1 contrast ratio
- Touch/click targets >= 44x44px
- Focus visible ring on all focusable elements (blue-200, 2px)
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`
- ARIA roles: `role="navigation"` on sidebar and pipeline, `role="status"` on badges
- Skip link as first focusable element
- No color as sole information vector — always icon + text + color

### Project Structure Notes

Files created by this story:

```
apps/web/
├── package.json                    # Updated with all dependencies
├── tsconfig.json
├── vite.config.ts                  # NEW
├── vitest.config.ts                # NEW
├── index.html                      # NEW
└── src/
    ├── main.tsx                    # NEW — App entry point
    ├── app.tsx                     # NEW — App component with providers
    ├── routes/
    │   ├── __root.tsx              # Root layout
    │   ├── _authenticated.tsx      # Auth guard
    │   ├── _authenticated/
    │   │   ├── projects/
    │   │   │   ├── index.tsx
    │   │   │   └── $projectId/
    │   │   │       └── index.tsx
    │   │   └── admin/
    │   │       └── users.tsx
    │   └── login.tsx
    ├── shared/
    │   ├── components/
    │   │   ├── PipelineProgressBar.tsx  # NEW — Custom CORTEX component
    │   │   ├── StatusBadge.tsx          # NEW — Custom CORTEX component
    │   │   ├── AsyncTaskPanel.tsx       # Placeholder
    │   │   └── LockIndicator.tsx        # Placeholder
    │   ├── hooks/
    │   │   ├── use-breakpoint.ts        # NEW
    │   │   └── use-current-user.ts      # Placeholder
    │   ├── layouts/
    │   │   ├── AppLayout.tsx            # NEW — Main layout shell
    │   │   ├── ProjectLayout.tsx        # Placeholder
    │   │   └── ModuleLayout.tsx         # Placeholder
    │   ├── graphql/
    │   │   └── client.ts               # NEW — Apollo Client config
    │   └── utils/
    └── stores/
        ├── sidebar-store.ts             # NEW
        ├── task-panel-store.ts          # NEW
        └── editor-store.ts              # Placeholder

packages/config-tailwind/
└── tailwind.config.ts               # NEW — CORTEX design tokens

packages/ui/src/
├── button.tsx                        # shadcn themed
├── card.tsx                          # shadcn themed
├── dialog.tsx                        # shadcn themed
├── sheet.tsx                         # shadcn themed
├── badge.tsx                         # shadcn themed
├── tooltip.tsx                       # shadcn themed
├── command.tsx                       # shadcn themed (Cmd+K)
├── ...                               # Other shadcn components
└── index.ts                          # Barrel export
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Frontend Architecture, Project Structure)
- UX Spec: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (Color System, Typography, Layout, Components, Responsive Strategy, Accessibility)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.3)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
