---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-13'
inputDocuments:
  - bmad-outputs/planning-artifacts/prd.md
  - bmad-outputs/planning-artifacts/product-brief-cortex-clinical-affairs-2026-02-13.md
  - specs/SLS_Module_Spec_v1.1.pdf
  - specs/SOA_Module_Spec_v1.1.pdf
  - specs/Validation_Module_Spec_v1.1.pdf
  - specs/CER_Module_Spec_v1.2.pdf
  - specs/PMS_Module_Spec_v1.2.pdf
  - user-provided-architecture-recommendations
workflowType: 'architecture'
project_name: 'cortex-clinical-affairs'
user_name: 'Cyril'
date: '2026-02-13'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

91 functional requirements (FR1–FR91) organized across 10 domains:

| # | Domain | FRs | Architectural Impact |
|---|--------|-----|---------------------|
| 1 | Project & Session Management | FR1–FR6 | Multi-project workspace, CEP linking, dashboard aggregation |
| 2 | Literature Search & Screening (SLS) | FR7–FR19o | Boolean query engine, multi-database API orchestration, AI scoring pipeline, PRISMA live calculation, PDF retrieval/verification, GROBID integration, reference mining, async task system, LLM abstraction layer |
| 3 | Clinical Evidence Analysis (SOA) | FR20–FR34c | Extraction grids with AI pre-population, per-cell confidence tracking, source quote deep-linking, QUADAS-2 assessments, MDR thematic sections (Clinical §1-6, Device §1-5), narrative drafting, benchmarks aggregation, similar device registry, claims management |
| 4 | Validation Management | FR35–FR44b | Standalone/MRMC study types, protocol versioning with amendments, XLS import with multi-version management, SOA benchmark auto-comparison, sample size calculator, GSPR mapping, 7 report types (including FDA 18.CVS, Algorithmic Fairness, Patch Validation) |
| 5 | CER Assembly | FR45–FR58p | 14-section MDR Annex XIV assembly, AI narrative drafting, traceability drill-down, GSPR compliance matrix, benefit-risk determination, cross-reference/bibliography management, external document version tracking, PCCP deviation workflow, evaluator records & signatures, CER versioning (initial/annual/patch) |
| 6 | Post-Market Surveillance (PMS) | FR59–FR67 | PMS/PMCF plan management, gap registry auto-population, PMCF activities (7 types), complaint classification (ZOHO + IMDRF), trend analysis, PMCF Report & PSUR generation, CER update decision, regulatory loop closure |
| 7 | User & Permission Management | FR68–FR73 | 6 roles RBAC, per-module + per-status + per-project permissions, backend enforcement, audit logging |
| 8 | Document Generation & Export | FR74–FR77 | DOCX template engine, MDR-compliant formatting, multi-format export, <5 min for 100+ pages, proof packages |
| 9 | Traceability & Audit | FR78–FR84 | Complete audit trails (WHO/WHAT/WHEN/WHY), claim-to-source drill-down, referential integrity enforcement, CSV/PDF audit export |
| 10 | AI-Assisted Workflows | FR85–FR91 | LLM abstraction (multi-provider), relevance scoring, grid extraction, narrative drafting, mandatory human review gates, spot-check validation, acceptance rate tracking |

**Non-Functional Requirements:**

| Category | Requirements | Key Constraints |
|----------|-------------|-----------------|
| Performance (P1-P6) | SLS query <30s for 10K articles, AI screening 1K articles <5min, AI abstraction 50 articles <10min, CER generation <2min, UI actions <2s, 5 concurrent users <10% degradation |
| Security (S1-S8) | AES-256 at rest, TLS 1.3 in transit, RBAC 6 roles, MFA required, immutable audit trails, 21 CFR Part 11 e-signatures, GDPR compliance, 30min session timeout |
| Scalability (SC1-SC5) | 50 concurrent users, 20 concurrent projects, 100K+ indexed articles, 500-page CER support, multi-tenant ready architecture |
| Reliability (R1-R6) | 99% availability (business hours), daily backups 30-day retention, auto-save 10s interval, immutable locked versions with checksum, RPO <24h / RTO <4h, referential integrity enforcement |
| Integration (I1-I4) | ISO 14971 import (XLSX/XML), DOCX export with configurable templates, SMTP notifications, future API extensibility |

**Scale & Complexity:**

- Primary domain: Full-stack web application (SaaS B2B, healthcare regulatory)
- Complexity level: Enterprise
- Estimated architectural components: 5 bounded contexts (SLS, SOA, Validation, CER, PMS) + 4 cross-cutting concerns (Auth/RBAC, Audit, Async Tasks, Document Generation)
- Data model entities (estimated from specs): 80-100+ domain entities across all modules
- External integrations: 10+ (PubMed, Cochrane, Embase, GROBID, CrossRef, Unpaywall, MAUDE, ANSM, BfArM, AFMPS, ZOHO Desk)

### Technical Constraints & Dependencies

**Hard Constraints (from PRD + specs + user architecture recommendations):**
- Sequential module dependency enforcement: SLS → SOA → Validation → CER → PMS (immutable pipeline)
- Version locking: CER versions lock ALL upstream dependencies as immutable snapshots
- 100% traceability: Architecture must enforce referential integrity — no orphaned CER claims permitted
- Human-in-the-loop: AI never publishes autonomously — mandatory review gates at every decision point
- Regulatory template compliance: MDR Annex XIV, MEDDEV 2.7/1 Rev 4, MDCG 2020-13
- 21 CFR Part 11: Electronic signatures for document approval workflows
- 15-year data retention: All regulatory submissions and audit trails
- Mono-tenant MVP: Single deployment, no tenant isolation required (multi-tenant deferred to V3.0+)

**Technology Decisions (from user-provided architecture recommendations):**
- Frontend: React 18 + TypeScript + TanStack Query + Zustand + Tailwind CSS + ag-Grid
- Backend: Node.js + Fastify + GraphQL (Apollo Server) + Zod validation
- Database: PostgreSQL + Prisma ORM
- Async Processing: Bull Queue (Redis-backed) with dedicated workers
- Event Bus: RabbitMQ (or Kafka for future scale)
- Object Storage: MinIO (S3-compatible) for PDFs and documents
- PDF Processing: GROBID for reference extraction
- Authentication: JWT-based with RBAC middleware
- Deployment: Docker + Kubernetes
- Architecture Pattern: Layered + Event-Driven with DDD bounded contexts per module

**Key External Dependencies:**
- PubMed API (free, rate-limited 10 req/s with key)
- Cochrane/Embase APIs (subscription licensing required)
- LLM providers (Claude/GPT/Ollama) — cost management critical at scale
- GROBID self-hosted service for PDF reference extraction
- CrossRef/PubMed APIs for reference validation
- Competent authority databases (MAUDE, ANSM, BfArM, AFMPS) for vigilance data
- ZOHO Desk API for complaint data import

### Cross-Cutting Concerns Identified

1. **Audit Trail System** — Every mutation across all 5 modules must be logged with WHO/WHAT/WHEN/WHY. Impacts every write operation in the system. Must be immutable, exportable (CSV/PDF), and retained 15 years.

2. **Status-Based Access Control** — Documents transition through lifecycle states (draft → screening → locked/immutable). Access permissions change dynamically based on document status. Must be enforced at API level, not just UI.

3. **Version Locking & Immutability** — CER versions create immutable snapshots of all upstream dependencies. Requires deep-copy or snapshot mechanism with checksum verification. Prevents retroactive changes to locked evidence chains.

4. **Async Task Infrastructure** — AI scoring, batch extraction, report generation, reference mining all run as background tasks. Requires progress tracking, ETA estimation, cancellation support, completion notifications. Spans all modules.

5. **LLM Abstraction Layer** — Multi-provider support (Claude/GPT/Ollama) with per-task configuration, cost optimization, fallback strategies. Used in SLS (scoring), SOA (extraction, drafting), CER (section drafting), PMS (trend analysis).

6. **Document Generation Engine** — DOCX template engine producing 10+ document types across modules. Must handle MDR-compliant formatting, cross-references, bibliography, 100+ page documents in <2 minutes.

7. **Sequential Dependency Enforcement** — Architectural invariant: modules unlock progressively. SOA requires locked SLS. Validation requires locked SOA. CER requires all upstream locked. PMS requires locked CER. Must be enforced at domain level.

8. **Traceability Graph** — Every CER claim must trace to its source through the full evidence chain. One-click drill-down from claim → CER section → SOA section → extraction grid cell → article → SLS query. Referential integrity must be architecture-enforced.

9. **RBAC Multi-Dimensional** — Permissions checked across 3 axes: role × module × document status. 6 roles with different module access patterns. Backend enforcement with audit logging of all permission checks.

10. **Event-Driven Integration** — Domain events (document locked, status changed, AI task completed) must propagate across modules for dependency enforcement, notification, and audit. Event bus (RabbitMQ) as backbone for inter-module communication.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (SaaS B2B) with separated frontend and backend, structured as a monorepo with shared packages. Based on user-provided architecture recommendations specifying Layered + Event-Driven architecture with DDD bounded contexts.

### Technology Versions (Verified February 2026)

| Technology | Selected Version | Status |
|---|---|---|
| React | 19.x | Stable (Dec 2024), upgraded from initial React 18 recommendation |
| Fastify | 5.7.x | Stable, Node.js 20+ required |
| Prisma | 7.2.x | Stable, Rust-free engine, PGVector & FTS support |
| Apollo Server | 4.x | Stable, `@as-integrations/fastify` 3.1.0 |
| TanStack Query | 5.90.x | Stable, ~20% smaller than v4, native Suspense |
| BullMQ | 5.69.x | Stable, very active development |
| Zustand | 5.x | Stable, lightweight state management |
| Zod | 3.x | Stable, schema validation |
| ag-Grid | 33.x | Enterprise data grid |
| Turborepo | 2.6.x | Stable, monorepo build orchestration |
| TypeScript | 5.7.x | Strict mode |
| Node.js | 20 LTS+ | Required by Fastify 5 |
| pnpm | 9.x | Package manager for workspaces |

### Starter Options Considered

| Starter | Alignment | Disqualification Reason |
|---|---|---|
| mnove/monorepo-starter-graphql | 70% | Uses GraphQL Yoga (not Apollo), better-auth (not JWT) |
| riipandi/fuelstack | 50% | Uses Drizzle (not Prisma), includes unnecessary Next.js |
| theogravity/fastify-starter-turbo-monorepo | 40% | Uses Kysely (not Prisma), no GraphQL, backend only |
| connected-repo-starter | 45% | Uses tRPC (not GraphQL/Apollo) |

### Selected Starter: Custom Turborepo Monorepo

**Rationale for Selection:**
No existing starter aligns sufficiently with the specific stack requirements (React 19 + Fastify + Apollo Server + Prisma + BullMQ + DDD bounded contexts). Adapting any existing starter would require more effort than scaffolding a clean Turborepo. A custom setup ensures exact stack alignment and proper DDD workspace structure from day one.

**Initialization Command:**

```bash
npx create-turbo@latest cortex-clinical-affairs --package-manager pnpm
```

Then restructure into the target monorepo layout.

**Target Monorepo Structure:**

```
cortex-clinical-affairs/
├── apps/
│   ├── web/                    # React 19 + Vite + TanStack Query + Zustand + Tailwind + ag-Grid
│   ├── api/                    # Fastify 5 + Apollo Server 4 + Prisma 7
│   └── workers/                # BullMQ 5 processors (scoring, extraction, reporting)
├── packages/
│   ├── shared/                 # Shared types, domain models, Zod schemas
│   ├── prisma/                 # Prisma schema + generated client
│   ├── ui/                     # Shared React component library
│   ├── config-eslint/          # Shared ESLint config
│   ├── config-typescript/      # Shared TypeScript config
│   └── config-tailwind/        # Shared Tailwind config
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript 5.7+ in strict mode across all workspaces
- Node.js 20 LTS+ (required by Fastify 5)
- pnpm 9.x workspaces for dependency management

**Frontend (apps/web):**
- React 19 with Vite (fast dev server, HMR, optimized builds)
- TanStack Query v5 for server state management (GraphQL integration)
- Zustand 5 for client-side state
- Tailwind CSS 4 for styling
- ag-Grid Enterprise for data-heavy grids (extraction grids, article tables)

**Backend (apps/api):**
- Fastify 5.7 (schema-first, plugin architecture, high performance)
- Apollo Server 4 with `@as-integrations/fastify` for GraphQL
- Prisma 7.2 for database access (type-safe, migrations, PostgreSQL)
- Zod for runtime validation at API boundaries

**Async Processing (apps/workers):**
- BullMQ 5.69 for Redis-backed job queues
- Dedicated worker processes for AI scoring, extraction, report generation
- Shared Prisma client and domain models with API

**Build Tooling:**
- Turborepo 2.6 for build orchestration, remote caching, task parallelism
- Vite for frontend bundling
- tsc for backend/packages compilation
- Vitest for unit/integration testing
- Playwright for E2E testing

**Code Organization:**
- DDD bounded contexts mapped to module-specific directories within apps/api
- Shared domain types and Zod schemas in packages/shared
- Prisma schema and generated client in packages/prisma
- Reusable React components in packages/ui

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data modeling: Multi-file Prisma schemas per bounded context
- Authentication: Google OAuth + JWT
- GraphQL: Code-first with Pothos
- Real-time: GraphQL Subscriptions + SSE fallback
- DOCX Generation: Hybrid (docx npm + Carbone.io)

**Important Decisions (Shape Architecture):**
- Versioning: JSON snapshots + Audit Log
- Caching: Layered Redis strategy
- MFA: TOTP + Passkeys
- E-Signatures: Password + Hash + Audit
- Rich Text: Plate (Slate-based)
- Monitoring: Grafana + Prometheus + Loki + Sentry

**Deferred Decisions (Post-MVP):**
- Multi-tenant data isolation strategy (V3.0)
- SOC 2 / ISO 27001 certification (V3.0)
- Real-time collaboration (Google Docs-style) (V3.0)
- White-label / custom branding (V4.0)

### Data Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| Database | PostgreSQL | 16.x | Relational model required for traceability, referential integrity, JSONB for flexible data |
| ORM | Prisma | 7.2.x | Type-safe, Rust-free engine, native PGVector & FTS, multi-file schema support |
| Schema Organization | Multi-file (`prisma/schema/`) | Prisma 7+ `prismaSchemaFolder` | One file per bounded context (sls.prisma, soa.prisma, cer.prisma, validation.prisma, pms.prisma, shared.prisma) |
| Version Snapshots | JSON snapshots + AuditLog | Custom `version_snapshots` table | JSONB serialization of upstream state at lock time, SHA-256 checksum, audit trail. Best compromise between simplicity and integrity |
| Caching | Layered Redis | Redis 7.x (shared with BullMQ) | Layer 1: LLM result cache (same prompt+article = cached response). Layer 2: User sessions/JWT. Layer 3: Frequently computed aggregations (PRISMA stats, benchmark calculations) |
| Migrations | Prisma Migrate | Built-in | Schema-first migrations with version control |

**Affects:** All modules — data layer is foundational

### Authentication & Security

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| Authentication | Google OAuth 2.0 + JWT | `google-auth-library` + `jsonwebtoken` | SSO via Google workspace (internal tool), JWT for stateless API auth, no external auth service dependency |
| MFA | TOTP + WebAuthn/Passkeys | `speakeasy` + `@simplewebauthn/server` 13.2.x | TOTP as primary (Google Authenticator), Passkeys as modern alternative. Both required for 21 CFR Part 11 compliance |
| E-Signatures | Password re-entry + Hash + Audit | `bcrypt` + SHA-256 | For document approval workflows (CER, protocols): user re-enters password → bcrypt verify → SHA-256 hash of document content → timestamp + user ID logged in audit trail. Lightweight 21 CFR Part 11 compliance without PKI infrastructure |
| Session Management | JWT (access + refresh tokens) | `jsonwebtoken` | Access token: 15min, Refresh token: 7 days (Redis-stored), 30min inactivity timeout per S8 |
| Encryption | AES-256 at rest, TLS 1.3 in transit | PostgreSQL native + Nginx/K8s | Per S1 requirement |
| RBAC | Multi-dimensional (role × module × status) | Custom middleware | 6 roles, backend enforcement, permission check audit logging |

**Affects:** All modules — auth/security is cross-cutting

### API & Communication Patterns

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| GraphQL Schema | Code-first (Pothos) | `@pothos/core` v4 + `@pothos/plugin-prisma` | Type-safe schema from TypeScript, Prisma plugin for automatic relation handling, n+1 query prevention, excellent DX |
| Real-time Updates | GraphQL Subscriptions + SSE | `graphql-ws` (WebSocket) | Subscriptions for active UI (task progress, status changes). SSE as lightweight fallback for notifications. No polling needed |
| API Validation | Zod at boundaries | `zod` 3.x | Validate all external inputs (user input, XLS imports, API integrations). Trust internal domain types |
| Error Handling | Typed GraphQL errors | Custom error classes | Domain errors (TraceabilityViolation, LockConflict, PermissionDenied) as typed GraphQL errors with error codes |
| Rate Limiting | Per-user + per-LLM-provider | `@fastify/rate-limit` | API rate limiting per user. Separate LLM rate limiting per provider with cost tracking |

**Affects:** API layer, frontend-backend communication

### Frontend Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| Routing | TanStack Router | `@tanstack/react-router` 1.159.x | Fully type-safe routes, built-in search params validation, excellent TanStack Query integration |
| Forms | React Hook Form + Zod | `react-hook-form` + `@hookform/resolvers` + `zod` | Most mature, performant (uncontrolled), large ecosystem, Zod resolver for schema validation |
| Rich Text Editor | Plate | `@udecode/plate` (Slate-based) | Plugin architecture, shadcn/ui components, AI integration support, headless + pre-built UI. For CER narratives, SOA sections, review comments |
| Data Grid | ag-Grid | `ag-grid-react` 33.x | Enterprise-grade for extraction grids, article tables, GSPR matrix. Filtering, sorting, column grouping, export |
| State Management | Zustand (client) + TanStack Query (server) | `zustand` 5.x + `@tanstack/react-query` 5.90.x | Zustand for UI state (sidebar, modals, editor state). TanStack Query for all server state (GraphQL queries/mutations) |
| Styling | Tailwind CSS + shadcn/ui | `tailwindcss` 4.x + `shadcn/ui` | Utility-first, consistent design system, accessible components |
| GraphQL Client | Apollo Client | `@apollo/client` 3.x | Mature, GraphQL subscriptions support, normalized cache, devtools |

**Affects:** apps/web workspace

### Infrastructure & Deployment

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| CI/CD | GitHub Actions | github.com/actions | Turborepo remote caching, matrix builds per workspace, automated testing, Docker image builds |
| Container | Docker multi-stage | Dockerfile per app | Separate images for api, web (Nginx), workers. Multi-stage builds for minimal image size |
| Orchestration | Kubernetes | K8s 1.29+ | Separate deployments for api, web, workers. HPA for worker scaling based on queue depth |
| Monitoring | Grafana + Prometheus + Loki | Open-source stack | Prometheus: metrics (API latency, queue depth, LLM costs). Loki: centralized logs. Grafana: dashboards |
| Error Tracking | Sentry | `@sentry/node` + `@sentry/react` | Real-time error tracking, source maps, performance monitoring. SaaS for reliability |
| Environments | 3 environments | K8s namespaces | dev (local Docker Compose), staging (K8s), production (K8s). Env vars via K8s secrets |
| Backup | PostgreSQL automated | pg_dump + WAL archiving | Daily backups, 30-day retention (R2), WAL for point-in-time recovery. RPO <24h, RTO <4h |

**Affects:** All infrastructure, DevOps pipeline

### DOCX Generation Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| Programmatic DOCX | docx npm | `docx` 9.x | For dynamically constructed documents (PRISMA flowcharts, GSPR matrices, comparison tables) where structure varies per project |
| Template DOCX | Carbone.io | `carbone` 5.x | For MDR-compliant templates (20.CER, CEP, PCCP, PMCF Report, PSUR) where formatting is standardized. DOCX template + JSON data injection |
| Hybrid Strategy | docx + Carbone | Both | Carbone for template-driven documents (regulatory templates with fixed structure). docx npm for programmatic sections (dynamic tables, charts, computed content). Merge strategy: Carbone generates base document, docx inserts dynamic sections |

**Affects:** CER, Validation, PMS modules (document export workflows)

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo setup (Turborepo + pnpm + TypeScript configs)
2. Database setup (Prisma multi-file schema, PostgreSQL, migrations)
3. Auth setup (Google OAuth + JWT + RBAC middleware)
4. API foundation (Fastify + Pothos GraphQL + Zod validation)
5. Frontend foundation (React 19 + Vite + TanStack Router + Apollo Client)
6. Async infrastructure (BullMQ + Redis + worker processes)
7. Real-time (graphql-ws subscriptions)
8. Rich text editor (Plate integration)
9. DOCX generation (Carbone templates + docx programmatic)
10. Monitoring (Grafana/Prometheus/Loki/Sentry)

**Cross-Component Dependencies:**
- Prisma schema → Pothos plugin → GraphQL types → Apollo Client queries (full type chain)
- Redis → BullMQ queues + Session cache + LLM cache (shared infrastructure)
- Audit trail middleware → Every GraphQL mutation (cross-cutting)
- RBAC middleware → Every GraphQL resolver (cross-cutting)
- Event bus (RabbitMQ) → Module lock events → Dependency enforcement (cross-module)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 25+ areas where AI agents could make different choices, organized into 5 categories.

### Naming Patterns

**Database Naming (Prisma):**
- Tables: PascalCase in Prisma schema (auto-maps to snake_case SQL) — `model SlsSession`, `model SoaAnalysis`
- Columns: camelCase in Prisma (auto-maps to snake_case SQL) — `createdAt`, `projectId`, `relevanceScore`
- Relations: camelCase, named by role — `slsSessions`, `lockedByCer`
- Enums: PascalCase name, UPPER_SNAKE_CASE values — `enum ArticleStatus { PENDING, SCORED, INCLUDED }`
- Indexes: Prisma automatic format — `@@index([projectId, status])`

**GraphQL Naming (Pothos):**
- Types: PascalCase — `type SlsSession`, `type Article`
- Fields: camelCase — `relevanceScore`, `screeningDecision`
- Queries: camelCase, descriptive verb — `slsSession(id)`, `slsSessions(projectId, filter)`
- Mutations: camelCase, action + entity — `createSlsSession`, `lockSlsDataset`, `scoreArticles`
- Subscriptions: camelCase, on + entity + action — `onTaskProgress`, `onSessionStatusChanged`
- Error codes: UPPER_SNAKE_CASE, DOMAIN_ERROR format — `TRACEABILITY_VIOLATION`, `LOCK_CONFLICT`, `UPSTREAM_NOT_LOCKED`, `PERMISSION_DENIED`

**TypeScript Naming:**
- Variables/functions: camelCase — `articleCount`, `lockDataset()`
- Types/Interfaces: PascalCase, no I prefix — `type ArticleFilter`, `interface SlsRepository`
- Classes: PascalCase — `class SlsService`, `class ArticleNotFoundError`
- Constants: UPPER_SNAKE_CASE — `MAX_ARTICLES_PER_QUERY`, `DEFAULT_AI_THRESHOLD`
- Enums: PascalCase — `enum ModuleType { SLS, SOA, Validation, CER, PMS }`

**File & Directory Naming:**
- React components: PascalCase.tsx — `ArticleTable.tsx`, `SessionCard.tsx`
- Everything else: kebab-case.ts — `sls-service.ts`, `article-repository.ts`, `use-articles.ts`
- Hooks: `use-` prefix — `use-articles.ts`, `use-session-status.ts`
- Tests: co-located, `.test.ts` suffix — `sls-service.test.ts`
- Directories: kebab-case — `sls-module/`, `extraction-grids/`, `audit-trail/`

**Route URLs:** kebab-case
- `/projects/:projectId/sls-sessions/:sessionId`
- `/projects/:projectId/soa-analyses/:soaId/extraction-grids`
- `/projects/:projectId/cer-versions/:versionId/sections`

### Structure Patterns

**Backend (apps/api) — DDD per bounded context:**

```
apps/api/src/
├── modules/
│   ├── sls/
│   │   ├── domain/            # Entities, Value Objects, Domain Events
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── events/
│   │   ├── application/       # Use cases, DTOs
│   │   │   ├── use-cases/
│   │   │   └── dtos/
│   │   ├── infrastructure/    # Repository impls, external services
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   └── graphql/           # Pothos types, queries, mutations
│   │       ├── types.ts
│   │       ├── queries.ts
│   │       └── mutations.ts
│   ├── soa/                   # Same structure per module
│   ├── validation/
│   ├── cer/
│   └── pms/
├── shared/
│   ├── middleware/             # Auth, RBAC, audit-trail
│   ├── errors/                # Domain error classes
│   ├── events/                # Event bus interface + RabbitMQ impl
│   └── utils/
├── graphql/
│   ├── schema.ts              # Pothos schema builder (combines all modules)
│   └── context.ts             # GraphQL context type
└── server.ts                  # Fastify bootstrap
```

**Frontend (apps/web) — Feature-based:**

```
apps/web/src/
├── features/
│   ├── sls/
│   │   ├── components/        # SLS-specific React components
│   │   ├── hooks/             # SLS-specific hooks
│   │   ├── pages/             # Route pages
│   │   └── graphql/           # Queries, mutations, fragments
│   ├── soa/
│   ├── validation/
│   ├── cer/
│   └── pms/
├── shared/
│   ├── components/            # App-wide shared components
│   ├── hooks/                 # App-wide shared hooks
│   ├── layouts/               # Page layouts
│   └── utils/
├── routes/                    # TanStack Router route definitions
├── stores/                    # Zustand stores
└── main.tsx
```

**Workers (apps/workers):**

```
apps/workers/src/
├── processors/
│   ├── sls/                   # SLS-specific workers
│   │   ├── score-articles.ts
│   │   ├── retrieve-pdfs.ts
│   │   └── mine-references.ts
│   ├── soa/
│   │   ├── extract-grid-data.ts
│   │   └── draft-narrative.ts
│   ├── cer/
│   │   ├── draft-section.ts
│   │   └── generate-docx.ts
│   └── pms/
├── shared/
│   ├── llm/                   # LLM abstraction layer
│   └── utils/
└── index.ts                   # Worker bootstrap, queue registration
```

**Tests — co-located + E2E separate:**
- Unit/integration: co-located next to source file — `sls-service.test.ts` beside `sls-service.ts`
- E2E: separate directory at monorepo root — `e2e/sls-workflow.spec.ts`

### Format Patterns

**GraphQL Errors — Typed domain errors:**

```typescript
class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly extensions?: Record<string, unknown>
  ) { super(message); }
}

// Specific error classes per domain concern
class TraceabilityViolationError extends DomainError { code: 'TRACEABILITY_VIOLATION' }
class LockConflictError extends DomainError { code: 'LOCK_CONFLICT' }
class PermissionDeniedError extends DomainError { code: 'PERMISSION_DENIED' }
class UpstreamNotLockedError extends DomainError { code: 'UPSTREAM_NOT_LOCKED' }
class ValidationError extends DomainError { code: 'VALIDATION_ERROR' }
class NotFoundError extends DomainError { code: 'NOT_FOUND' }
```

**Data Formats:**
- Dates: ISO 8601 strings everywhere — `2026-02-13T14:30:00.000Z`
- IDs: UUID v7 (sortable, timestamp-based) — `crypto.randomUUID()`
- JSON fields: camelCase
- Booleans: `true`/`false` (never 1/0)
- Nulls: explicit `null` (never `undefined` in API responses)

**Pagination:**
- Cursor-based (Relay-style) for long lists — `ArticleConnection { edges, pageInfo, totalCount }`
- Offset-based for ag-Grid integration — `PaginatedArticles { items, total, offset, limit }`

### Communication Patterns

**Domain Events (RabbitMQ):**
- Naming: `module.aggregate.action` (dot notation, lowercase) — `sls.dataset.locked`, `cer.version.locked`
- Payload structure (mandatory format):

```typescript
interface DomainEvent<T = unknown> {
  eventType: string;           // 'sls.dataset.locked'
  aggregateId: string;         // UUID of the aggregate
  aggregateType: string;       // 'SlsSession'
  data: T;                     // Event-specific payload
  metadata: {
    userId: string;
    timestamp: string;         // ISO 8601
    correlationId: string;     // For tracing event chains
    version: number;           // Event schema version (start at 1)
  };
}
```

**BullMQ Job Naming:**
- Queue names: `module:action` (colon separator) — `sls:score-articles`, `soa:extract-grid-data`, `cer:generate-docx`
- Job data: typed interfaces, Zod-validated at queue entry

**Zustand Stores:**
- One store per UI concern, not per module — `useEditorStore`, `useSidebarStore`, `useTaskPanelStore`
- Naming: `use` + Domain + `Store`
- No server logic in Zustand — TanStack Query manages all server state

### Process Patterns

**Loading States:** TanStack Query native states only
- Use `isPending`, `isError`, `isSuccess` from query hooks
- Use `useSuspenseQuery` for route-level data loading
- Never create custom `isLoading` booleans

**Audit Trail:** Automatic middleware
- Every GraphQL mutation passes through audit middleware automatically
- Agents do NOT manually log audit entries
- Middleware captures: `{ userId, action, targetType, targetId, before, after, timestamp }`

**Validation:** Zod at boundaries only
- Validate: GraphQL inputs, XLS imports, external API responses
- Do NOT validate: internal service calls, domain objects
- Zod schemas in `packages/shared` for frontend/backend sharing

**Error Handling:**
- Backend: throw typed `DomainError` subclasses, caught by GraphQL error handler
- Frontend: `ErrorBoundary` per module/route, TanStack Query `onError` for mutations
- Never `throw new Error()` raw — always use domain error classes
- User-facing messages: extracted from error `code`, i18n-ready

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow exact naming conventions (no variation allowed)
2. Place files in DDD structure (domain/ application/ infrastructure/ graphql/)
3. Use domain error classes (never raw `throw new Error()`)
4. Log via audit middleware (never manual audit logging for mutations)
5. Validate with Zod only at system boundaries
6. Use TanStack Query for all server state (never `fetch()` direct)
7. Emit domain events for significant state transitions
8. Respect `DomainEvent<T>` format for all events
9. Use UUID v7 for all entity IDs
10. Write co-located tests for all new business logic

**Anti-Patterns to Avoid:**
- `any` in TypeScript — use `unknown` + type guard when needed
- `console.log` in production — use structured logger
- Business logic in GraphQL resolvers — delegate to use cases
- Server state in Zustand — TanStack Query only
- Circular imports between bounded contexts — use events or `shared/`
- Direct Prisma calls in resolvers — go through repository layer
- Inline SQL — use Prisma query builder only

### Pattern Examples

**Good: Creating a new use case**
```typescript
// apps/api/src/modules/sls/application/use-cases/lock-dataset.ts
export class LockDatasetUseCase {
  constructor(
    private readonly slsRepository: SlsRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(sessionId: string, userId: string): Promise<SlsSession> {
    const session = await this.slsRepository.findById(sessionId);
    if (!session) throw new NotFoundError('SLS session', sessionId);
    if (session.status === 'LOCKED') throw new LockConflictError(sessionId);

    const locked = session.lock();
    await this.slsRepository.save(locked);

    await this.eventBus.publish({
      eventType: 'sls.dataset.locked',
      aggregateId: sessionId,
      aggregateType: 'SlsSession',
      data: { articleCount: locked.articleCount },
      metadata: { userId, timestamp: new Date().toISOString(), correlationId: crypto.randomUUID(), version: 1 },
    });

    return locked;
  }
}
```

**Bad: What to avoid**
```typescript
// DON'T: Business logic in resolver
builder.mutationField('lockDataset', (t) =>
  t.field({
    resolve: async (_, { sessionId }, ctx) => {
      // BAD: logic should be in use case, not here
      const session = await prisma.slsSession.findUnique({ where: { id: sessionId } });
      await prisma.slsSession.update({ where: { id: sessionId }, data: { status: 'LOCKED' } });
      console.log('Dataset locked'); // BAD: no console.log
      return session;
    },
  })
);
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
cortex-clinical-affairs/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # Lint + test + build (all workspaces)
│   │   ├── deploy-staging.yml            # Deploy to K8s staging
│   │   ├── deploy-production.yml         # Deploy to K8s production
│   │   └── docker-build.yml             # Build & push Docker images
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .husky/
│   ├── pre-commit                        # lint-staged
│   └── commit-msg                        # commitlint
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── server.ts                 # Fastify bootstrap, plugin registration
│   │       ├── graphql/
│   │       │   ├── schema.ts             # Pothos schema builder (combines all modules)
│   │       │   ├── context.ts            # GraphQL context (user, prisma, eventBus)
│   │       │   └── scalars.ts            # Custom scalars (DateTime, JSON, UUID)
│   │       ├── modules/
│   │       │   ├── project/              # FR1-FR6: Project & CEP management
│   │       │   │   ├── domain/
│   │       │   │   │   ├── entities/
│   │       │   │   │   │   ├── project.ts
│   │       │   │   │   │   └── cep.ts
│   │       │   │   │   ├── value-objects/
│   │       │   │   │   └── events/
│   │       │   │   ├── application/
│   │       │   │   │   ├── use-cases/
│   │       │   │   │   │   ├── create-project.ts
│   │       │   │   │   │   ├── configure-cep.ts
│   │       │   │   │   │   └── assign-users.ts
│   │       │   │   │   └── dtos/
│   │       │   │   ├── infrastructure/
│   │       │   │   │   └── repositories/
│   │       │   │   └── graphql/
│   │       │   │       ├── types.ts
│   │       │   │       ├── queries.ts
│   │       │   │       └── mutations.ts
│   │       │   ├── sls/                  # FR7-FR19o: Literature Search & Screening
│   │       │   │   ├── domain/
│   │       │   │   │   ├── entities/
│   │       │   │   │   │   ├── sls-session.ts
│   │       │   │   │   │   ├── query.ts
│   │       │   │   │   │   ├── query-execution.ts
│   │       │   │   │   │   ├── article.ts
│   │       │   │   │   │   ├── article-query-link.ts
│   │       │   │   │   │   ├── screening-decision.ts
│   │       │   │   │   │   └── exclusion-code.ts
│   │       │   │   │   ├── value-objects/
│   │       │   │   │   │   ├── article-status.ts
│   │       │   │   │   │   ├── session-status.ts
│   │       │   │   │   │   ├── relevance-score.ts
│   │       │   │   │   │   └── prisma-stats.ts
│   │       │   │   │   └── events/
│   │       │   │   │       ├── dataset-locked.ts
│   │       │   │   │       └── scoring-completed.ts
│   │       │   │   ├── application/
│   │       │   │   │   ├── use-cases/
│   │       │   │   │   │   ├── create-session.ts
│   │       │   │   │   │   ├── construct-query.ts
│   │       │   │   │   │   ├── execute-query.ts
│   │       │   │   │   │   ├── import-articles.ts
│   │       │   │   │   │   ├── score-articles.ts
│   │       │   │   │   │   ├── screen-article.ts
│   │       │   │   │   │   ├── lock-dataset.ts
│   │       │   │   │   │   ├── generate-prisma.ts
│   │       │   │   │   │   ├── retrieve-pdfs.ts
│   │       │   │   │   │   ├── add-manual-article.ts
│   │       │   │   │   │   └── mine-references.ts
│   │       │   │   │   └── dtos/
│   │       │   │   ├── infrastructure/
│   │       │   │   │   ├── repositories/
│   │       │   │   │   │   ├── sls-session-repository.ts
│   │       │   │   │   │   └── article-repository.ts
│   │       │   │   │   └── services/
│   │       │   │   │       ├── pubmed-client.ts
│   │       │   │   │       ├── cochrane-client.ts
│   │       │   │   │       ├── embase-client.ts
│   │       │   │   │       ├── deduplication-service.ts
│   │       │   │   │       └── pdf-retrieval-service.ts
│   │       │   │   └── graphql/
│   │       │   │       ├── types.ts
│   │       │   │       ├── queries.ts
│   │       │   │       ├── mutations.ts
│   │       │   │       └── subscriptions.ts
│   │       │   ├── soa/                  # FR20-FR34c: Clinical Evidence Analysis
│   │       │   │   ├── domain/
│   │       │   │   │   ├── entities/
│   │       │   │   │   │   ├── soa-analysis.ts
│   │       │   │   │   │   ├── extraction-grid.ts
│   │       │   │   │   │   ├── grid-cell.ts
│   │       │   │   │   │   ├── thematic-section.ts
│   │       │   │   │   │   ├── similar-device.ts
│   │       │   │   │   │   ├── benchmark.ts
│   │       │   │   │   │   ├── claim.ts
│   │       │   │   │   │   └── quality-assessment.ts
│   │       │   │   │   ├── value-objects/
│   │       │   │   │   │   ├── soa-type.ts
│   │       │   │   │   │   ├── confidence-level.ts
│   │       │   │   │   │   ├── extraction-status.ts
│   │       │   │   │   │   └── data-contribution.ts
│   │       │   │   │   └── events/
│   │       │   │   │       └── soa-locked.ts
│   │       │   │   ├── application/
│   │       │   │   │   ├── use-cases/
│   │       │   │   │   │   ├── create-soa.ts
│   │       │   │   │   │   ├── link-sls-sessions.ts
│   │       │   │   │   │   ├── check-dependency.ts
│   │       │   │   │   │   ├── configure-grid.ts
│   │       │   │   │   │   ├── extract-grid-data.ts
│   │       │   │   │   │   ├── validate-extraction.ts
│   │       │   │   │   │   ├── create-section.ts
│   │       │   │   │   │   ├── draft-narrative.ts
│   │       │   │   │   │   ├── manage-claims.ts
│   │       │   │   │   │   ├── lock-soa.ts
│   │       │   │   │   │   └── assess-quality.ts
│   │       │   │   │   └── dtos/
│   │       │   │   ├── infrastructure/
│   │       │   │   │   ├── repositories/
│   │       │   │   │   └── services/
│   │       │   │   └── graphql/
│   │       │   │       ├── types.ts
│   │       │   │       ├── queries.ts
│   │       │   │       ├── mutations.ts
│   │       │   │       └── subscriptions.ts
│   │       │   ├── validation/           # FR35-FR44b: Validation Management
│   │       │   │   ├── domain/
│   │       │   │   │   ├── entities/
│   │       │   │   │   │   ├── validation-study.ts
│   │       │   │   │   │   ├── protocol.ts
│   │       │   │   │   │   ├── data-import.ts
│   │       │   │   │   │   ├── results-mapping.ts
│   │       │   │   │   │   └── gspr-mapping.ts
│   │       │   │   │   ├── value-objects/
│   │       │   │   │   │   ├── study-type.ts
│   │       │   │   │   │   └── protocol-version.ts
│   │       │   │   │   └── events/
│   │       │   │   │       └── validation-locked.ts
│   │       │   │   ├── application/
│   │       │   │   │   ├── use-cases/
│   │       │   │   │   │   ├── create-study.ts
│   │       │   │   │   │   ├── link-soa-benchmarks.ts
│   │       │   │   │   │   ├── define-protocol.ts
│   │       │   │   │   │   ├── import-xls.ts
│   │       │   │   │   │   ├── manage-import-versions.ts
│   │       │   │   │   │   ├── map-results.ts
│   │       │   │   │   │   ├── generate-reports.ts
│   │       │   │   │   │   └── lock-validation.ts
│   │       │   │   │   └── dtos/
│   │       │   │   ├── infrastructure/
│   │       │   │   │   ├── repositories/
│   │       │   │   │   └── services/
│   │       │   │   │       └── xls-parser-service.ts
│   │       │   │   └── graphql/
│   │       │   ├── cer/                  # FR45-FR58p: CER Assembly
│   │       │   │   ├── domain/
│   │       │   │   │   ├── entities/
│   │       │   │   │   │   ├── cer-version.ts
│   │       │   │   │   │   ├── cer-section.ts
│   │       │   │   │   │   ├── external-document.ts
│   │       │   │   │   │   ├── claim-trace.ts
│   │       │   │   │   │   ├── gspr-matrix.ts
│   │       │   │   │   │   ├── benefit-risk.ts
│   │       │   │   │   │   ├── cross-reference.ts
│   │       │   │   │   │   ├── bibliography-entry.ts
│   │       │   │   │   │   ├── pccp-deviation.ts
│   │       │   │   │   │   └── evaluator.ts
│   │       │   │   │   ├── value-objects/
│   │       │   │   │   │   ├── cer-status.ts
│   │       │   │   │   │   ├── version-type.ts
│   │       │   │   │   │   └── regulatory-context.ts
│   │       │   │   │   └── events/
│   │       │   │   │       └── cer-locked.ts
│   │       │   │   ├── application/
│   │       │   │   │   ├── use-cases/
│   │       │   │   │   │   ├── create-cer.ts
│   │       │   │   │   │   ├── link-upstream.ts
│   │       │   │   │   │   ├── manage-external-docs.ts
│   │       │   │   │   │   ├── named-device-search.ts
│   │       │   │   │   │   ├── assemble-sections.ts
│   │       │   │   │   │   ├── draft-section.ts
│   │       │   │   │   │   ├── review-section.ts
│   │       │   │   │   │   ├── generate-gspr.ts
│   │       │   │   │   │   ├── determine-benefit-risk.ts
│   │       │   │   │   │   ├── manage-versions.ts
│   │       │   │   │   │   ├── export-cer.ts
│   │       │   │   │   │   ├── manage-bibliography.ts
│   │       │   │   │   │   ├── track-deviations.ts
│   │       │   │   │   │   └── lock-cer.ts
│   │       │   │   │   └── dtos/
│   │       │   │   ├── infrastructure/
│   │       │   │   │   ├── repositories/
│   │       │   │   │   └── services/
│   │       │   │   │       ├── maude-client.ts
│   │       │   │   │       ├── ansm-client.ts
│   │       │   │   │       └── vigilance-aggregator.ts
│   │       │   │   └── graphql/
│   │       │   ├── pms/                  # FR59-FR67: Post-Market Surveillance
│   │       │   │   ├── domain/
│   │       │   │   │   ├── entities/
│   │       │   │   │   │   ├── pms-plan.ts
│   │       │   │   │   │   ├── pmcf-plan.ts
│   │       │   │   │   │   ├── gap-registry.ts
│   │       │   │   │   │   ├── pms-cycle.ts
│   │       │   │   │   │   ├── pmcf-activity.ts
│   │       │   │   │   │   ├── complaint.ts
│   │       │   │   │   │   └── trend-analysis.ts
│   │       │   │   │   ├── value-objects/
│   │       │   │   │   │   ├── activity-type.ts
│   │       │   │   │   │   └── plan-status.ts
│   │       │   │   │   └── events/
│   │       │   │   │       └── cycle-completed.ts
│   │       │   │   ├── application/
│   │       │   │   │   ├── use-cases/
│   │       │   │   │   │   ├── create-pms-plan.ts
│   │       │   │   │   │   ├── populate-gap-registry.ts
│   │       │   │   │   │   ├── create-cycle.ts
│   │       │   │   │   │   ├── execute-activity.ts
│   │       │   │   │   │   ├── import-complaints.ts
│   │       │   │   │   │   ├── compute-trends.ts
│   │       │   │   │   │   ├── generate-pmcf-report.ts
│   │       │   │   │   │   ├── generate-psur.ts
│   │       │   │   │   │   ├── cer-update-decision.ts
│   │       │   │   │   │   └── update-gap-registry.ts
│   │       │   │   │   └── dtos/
│   │       │   │   ├── infrastructure/
│   │       │   │   │   ├── repositories/
│   │       │   │   │   └── services/
│   │       │   │   │       └── zoho-desk-client.ts
│   │       │   │   └── graphql/
│   │       │   └── auth/                 # FR68-FR73: User & Permission Management
│   │       │       ├── domain/
│   │       │       │   └── entities/
│   │       │       │       └── user.ts
│   │       │       ├── application/
│   │       │       │   ├── use-cases/
│   │       │       │   │   ├── google-oauth.ts
│   │       │       │   │   ├── verify-mfa.ts
│   │       │       │   │   ├── e-sign-document.ts
│   │       │       │   │   └── manage-users.ts
│   │       │       │   └── dtos/
│   │       │       ├── infrastructure/
│   │       │       │   ├── repositories/
│   │       │       │   └── services/
│   │       │       │       ├── jwt-service.ts
│   │       │       │       ├── totp-service.ts
│   │       │       │       └── webauthn-service.ts
│   │       │       └── graphql/
│   │       ├── shared/
│   │       │   ├── middleware/
│   │       │   │   ├── auth-middleware.ts
│   │       │   │   ├── rbac-middleware.ts
│   │       │   │   └── audit-middleware.ts
│   │       │   ├── errors/
│   │       │   │   ├── domain-error.ts
│   │       │   │   ├── traceability-violation.ts
│   │       │   │   ├── lock-conflict.ts
│   │       │   │   ├── upstream-not-locked.ts
│   │       │   │   ├── permission-denied.ts
│   │       │   │   └── not-found.ts
│   │       │   ├── events/
│   │       │   │   ├── event-bus.ts
│   │       │   │   └── rabbitmq-event-bus.ts
│   │       │   ├── services/
│   │       │   │   ├── snapshot-service.ts
│   │       │   │   └── checksum-service.ts
│   │       │   └── utils/
│   │       │       └── logger.ts
│   │       └── config/
│   │           ├── env.ts
│   │           ├── redis.ts
│   │           ├── rabbitmq.ts
│   │           └── llm.ts
│   ├── web/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── app.tsx
│   │       ├── routes/
│   │       │   ├── __root.tsx
│   │       │   ├── _authenticated.tsx
│   │       │   ├── _authenticated/
│   │       │   │   ├── projects/
│   │       │   │   │   ├── index.tsx
│   │       │   │   │   └── $projectId/
│   │       │   │   │       ├── index.tsx              # Project dashboard
│   │       │   │   │       ├── sls-sessions/
│   │       │   │   │       │   ├── index.tsx
│   │       │   │   │       │   └── $sessionId.tsx
│   │       │   │   │       ├── soa-analyses/
│   │       │   │   │       │   ├── index.tsx
│   │       │   │   │       │   └── $soaId.tsx
│   │       │   │   │       ├── validation-studies/
│   │       │   │   │       │   ├── index.tsx
│   │       │   │   │       │   └── $studyId.tsx
│   │       │   │   │       ├── cer-versions/
│   │       │   │   │       │   ├── index.tsx
│   │       │   │   │       │   └── $versionId.tsx
│   │       │   │   │       └── pms/
│   │       │   │   │           ├── index.tsx
│   │       │   │   │           └── $cycleId.tsx
│   │       │   │   └── admin/
│   │       │   │       ├── users.tsx
│   │       │   │       └── settings.tsx
│   │       │   └── login.tsx
│   │       ├── features/
│   │       │   ├── sls/
│   │       │   │   ├── components/
│   │       │   │   │   ├── QueryBuilder.tsx
│   │       │   │   │   ├── ArticleTable.tsx
│   │       │   │   │   ├── ScreeningPanel.tsx
│   │       │   │   │   ├── AiScoringProgress.tsx
│   │       │   │   │   └── PrismaFlowChart.tsx
│   │       │   │   ├── hooks/
│   │       │   │   └── graphql/
│   │       │   ├── soa/
│   │       │   │   ├── components/
│   │       │   │   │   ├── ExtractionGrid.tsx
│   │       │   │   │   ├── GridCellEditor.tsx
│   │       │   │   │   ├── ConfidenceIndicator.tsx
│   │       │   │   │   ├── SourceQuotePopover.tsx
│   │       │   │   │   ├── SectionEditor.tsx
│   │       │   │   │   ├── BenchmarkChart.tsx
│   │       │   │   │   ├── DeviceComparison.tsx
│   │       │   │   │   └── ClaimsManager.tsx
│   │       │   │   ├── hooks/
│   │       │   │   └── graphql/
│   │       │   ├── validation/
│   │       │   │   ├── components/
│   │       │   │   │   ├── StudyConfigurator.tsx
│   │       │   │   │   ├── ProtocolEditor.tsx
│   │       │   │   │   ├── XlsImporter.tsx
│   │       │   │   │   ├── ImportVersionDiff.tsx
│   │       │   │   │   ├── ResultsMapping.tsx
│   │       │   │   │   └── GsprMapping.tsx
│   │       │   │   ├── hooks/
│   │       │   │   └── graphql/
│   │       │   ├── cer/
│   │       │   │   ├── components/
│   │       │   │   │   ├── CerAssembler.tsx
│   │       │   │   │   ├── SectionEditor.tsx
│   │       │   │   │   ├── TraceabilityDrillDown.tsx
│   │       │   │   │   ├── GsprMatrix.tsx
│   │       │   │   │   ├── BenefitRiskPanel.tsx
│   │       │   │   │   ├── CrossReferenceManager.tsx
│   │       │   │   │   ├── BibliographyPanel.tsx
│   │       │   │   │   ├── EvaluatorPanel.tsx
│   │       │   │   │   └── VersionTimeline.tsx
│   │       │   │   ├── hooks/
│   │       │   │   └── graphql/
│   │       │   ├── pms/
│   │       │   │   ├── components/
│   │       │   │   │   ├── PmsPlanEditor.tsx
│   │       │   │   │   ├── GapRegistry.tsx
│   │       │   │   │   ├── CycleTimeline.tsx
│   │       │   │   │   ├── ActivityTracker.tsx
│   │       │   │   │   ├── ComplaintsDashboard.tsx
│   │       │   │   │   ├── TrendChart.tsx
│   │       │   │   │   └── CerUpdateDecision.tsx
│   │       │   │   ├── hooks/
│   │       │   │   └── graphql/
│   │       │   └── auth/
│   │       │       ├── components/
│   │       │       │   ├── LoginForm.tsx
│   │       │       │   ├── MfaSetup.tsx
│   │       │       │   └── ESignatureModal.tsx
│   │       │       └── hooks/
│   │       ├── shared/
│   │       │   ├── components/
│   │       │   │   ├── AsyncTaskPanel.tsx
│   │       │   │   ├── AuditTrailViewer.tsx
│   │       │   │   ├── StatusBadge.tsx
│   │       │   │   ├── LockIndicator.tsx
│   │       │   │   └── ExportButton.tsx
│   │       │   ├── hooks/
│   │       │   │   ├── use-async-task.ts
│   │       │   │   ├── use-permissions.ts
│   │       │   │   └── use-current-user.ts
│   │       │   ├── layouts/
│   │       │   │   ├── AppLayout.tsx
│   │       │   │   ├── ProjectLayout.tsx
│   │       │   │   └── ModuleLayout.tsx
│   │       │   └── utils/
│   │       └── stores/
│   │           ├── editor-store.ts
│   │           ├── sidebar-store.ts
│   │           └── task-panel-store.ts
│   └── workers/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── processors/
│           │   ├── sls/
│           │   │   ├── score-articles.ts
│           │   │   ├── retrieve-pdfs.ts
│           │   │   └── mine-references.ts
│           │   ├── soa/
│           │   │   ├── extract-grid-data.ts
│           │   │   ├── draft-narrative.ts
│           │   │   └── batch-quality-assessment.ts
│           │   ├── cer/
│           │   │   ├── draft-section.ts
│           │   │   └── generate-docx.ts
│           │   ├── validation/
│           │   │   └── generate-reports.ts
│           │   └── pms/
│           │       ├── generate-pmcf-report.ts
│           │       └── generate-psur.ts
│           └── shared/
│               ├── llm/
│               │   ├── llm-abstraction.ts
│               │   ├── claude-provider.ts
│               │   ├── openai-provider.ts
│               │   ├── ollama-provider.ts
│               │   └── cost-tracker.ts
│               ├── docx/
│               │   ├── carbone-engine.ts
│               │   ├── docx-builder.ts
│               │   └── templates/
│               │       ├── cer-mdr.docx
│               │       ├── cep.docx
│               │       ├── pccp.docx
│               │       ├── pmcf-report.docx
│               │       ├── psur.docx
│               │       ├── validation-report.docx
│               │       └── fda-18cvs.docx
│               └── grobid/
│                   └── grobid-client.ts
├── packages/
│   ├── prisma/
│   │   ├── package.json
│   │   ├── schema/
│   │   │   ├── shared.prisma
│   │   │   ├── auth.prisma
│   │   │   ├── project.prisma
│   │   │   ├── sls.prisma
│   │   │   ├── soa.prisma
│   │   │   ├── validation.prisma
│   │   │   ├── cer.prisma
│   │   │   ├── pms.prisma
│   │   │   └── audit.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── domain-event.ts
│   │       │   ├── pagination.ts
│   │       │   ├── module-types.ts
│   │       │   └── async-task.ts
│   │       ├── schemas/
│   │       │   ├── article.schema.ts
│   │       │   ├── soa.schema.ts
│   │       │   ├── cer.schema.ts
│   │       │   └── common.schema.ts
│   │       ├── constants/
│   │       │   ├── mdr-sections.ts
│   │       │   ├── exclusion-codes.ts
│   │       │   └── roles.ts
│   │       └── utils/
│   │           ├── uuid.ts
│   │           └── date.ts
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts                  # shadcn/ui component re-exports
│   ├── config-eslint/
│   │   ├── package.json
│   │   └── index.js
│   ├── config-typescript/
│   │   ├── package.json
│   │   ├── base.json
│   │   ├── react.json
│   │   └── node.json
│   └── config-tailwind/
│       ├── package.json
│       └── tailwind.config.ts
├── e2e/
│   ├── package.json
│   ├── playwright.config.ts
│   └── tests/
│       ├── sls-workflow.spec.ts
│       ├── soa-workflow.spec.ts
│       ├── cer-assembly.spec.ts
│       └── fixtures/
├── docker/
│   ├── docker-compose.yml                # Dev: PostgreSQL, Redis, RabbitMQ, MinIO, GROBID
│   ├── docker-compose.test.yml           # CI test environment
│   └── nginx/
│       └── nginx.conf
├── k8s/
│   ├── base/
│   │   ├── api-deployment.yaml
│   │   ├── web-deployment.yaml
│   │   ├── workers-deployment.yaml
│   │   ├── redis-deployment.yaml
│   │   ├── rabbitmq-deployment.yaml
│   │   └── minio-deployment.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc.js
└── commitlint.config.js
```

### Architectural Boundaries

**API Boundaries:**
- GraphQL is the sole external entry point (no REST except health check `/health`)
- Each module exposes types/queries/mutations via Pothos, combined in `graphql/schema.ts`
- Modules do NOT call each other directly — communication via domain events (RabbitMQ)
- Exception: use cases may read (not write) other modules' repositories for queries

**Data Boundaries:**
- Each bounded context has its own Prisma schema file
- Cross-module relations via ID reference (not Prisma cross-schema relations)
- `shared.prisma` contains shared models (AuditLog, VersionSnapshot, AsyncTask)
- `packages/prisma` generates a single unified Prisma client

**Worker Boundaries:**
- Workers share Prisma client and LLM abstraction layer with API
- Workers are BullMQ consumers — they do NOT touch GraphQL
- Results written directly to DB, notifications via domain events

**Frontend Boundaries:**
- Each feature directory is self-contained (components, hooks, graphql)
- Cross-feature communication via Zustand stores or shared components
- No direct imports between feature directories — go through `shared/`

### Requirements to Structure Mapping

| FR Category | Backend Module | Frontend Feature | Worker Processor |
|---|---|---|---|
| FR1-FR6: Project Management | `modules/project/` | `routes/_authenticated/projects/` | — |
| FR7-FR19o: SLS | `modules/sls/` | `features/sls/` | `processors/sls/` |
| FR20-FR34c: SOA | `modules/soa/` | `features/soa/` | `processors/soa/` |
| FR35-FR44b: Validation | `modules/validation/` | `features/validation/` | `processors/validation/` |
| FR45-FR58p: CER | `modules/cer/` | `features/cer/` | `processors/cer/` |
| FR59-FR67: PMS | `modules/pms/` | `features/pms/` | `processors/pms/` |
| FR68-FR73: Auth/RBAC | `modules/auth/` | `features/auth/` | — |
| FR74-FR77: DOCX Generation | — | — | `shared/docx/` |
| FR78-FR84: Audit/Traceability | `shared/middleware/` | `shared/components/` | — |
| FR85-FR91: AI Workflows | — | — | `shared/llm/` |

### Cross-Cutting Concerns Mapping

| Concern | Location |
|---|---|
| Audit Trail | `apps/api/src/shared/middleware/audit-middleware.ts` |
| RBAC Enforcement | `apps/api/src/shared/middleware/rbac-middleware.ts` |
| Domain Events | `apps/api/src/shared/events/` + `packages/shared/src/types/domain-event.ts` |
| Version Snapshots | `apps/api/src/shared/services/snapshot-service.ts` |
| LLM Abstraction | `apps/workers/src/shared/llm/` |
| DOCX Generation | `apps/workers/src/shared/docx/` |
| Zod Schemas | `packages/shared/src/schemas/` |
| Error Classes | `apps/api/src/shared/errors/` |

### Integration Points

**Internal Communication:**
- Frontend → Backend: Apollo Client → GraphQL (Pothos/Fastify)
- Backend modules: Domain Events via RabbitMQ
- Backend → Workers: BullMQ job queues (Redis)
- Workers → Frontend: Domain event → GraphQL subscription → Apollo Client

**External Integrations:**
- Literature DBs: `modules/sls/infrastructure/services/` (PubMed, Cochrane, Embase)
- Vigilance DBs: `modules/cer/infrastructure/services/` (MAUDE, ANSM, BfArM)
- Complaints: `modules/pms/infrastructure/services/zoho-desk-client.ts`
- PDF Processing: `apps/workers/src/shared/grobid/grobid-client.ts`
- LLM Providers: `apps/workers/src/shared/llm/` (Claude, GPT, Ollama)

**Data Flow:**
```
User → React (TanStack Router) → Apollo Client → GraphQL (Pothos/Fastify)
  → Use Case → Repository (Prisma) → PostgreSQL
  → Event Bus (RabbitMQ) → Other modules
  → BullMQ Queue (Redis) → Worker → LLM/GROBID → DB → Event → Subscription → Client
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All 30+ technology choices verified as compatible. Key validated combinations:
- Fastify 5 + Apollo Server 4 (via `@as-integrations/fastify` 3.1.0)
- Pothos v4 + Prisma 7 (via `@pothos/plugin-prisma`)
- React 19 + TanStack Router 1.x + Plate + ag-Grid 33
- BullMQ 5 + Redis 7 + graphql-ws
- All versions verified against Feb 2026 stable releases

**Clarification — Apollo Client vs TanStack Query Boundary:**
- Apollo Client: ALL GraphQL operations (queries, mutations, subscriptions, normalized cache)
- TanStack Query: ONLY non-GraphQL operations (file uploads, health checks, REST calls to external APIs)
- Rule: if GraphQL → Apollo Client. If REST/fetch → TanStack Query.

**Note — Carbone.io Dependency:**
Carbone requires LibreOffice in the worker Docker image (~800MB+ image size). Acceptable for K8s deployment, noted for Docker image optimization.

**Pattern Consistency:** All naming conventions, structure patterns, and communication patterns align with the chosen technology stack. DDD bounded context structure maps cleanly to Prisma multi-file schemas, Pothos module-based types, and feature-based frontend organization.

**Structure Alignment:** Project structure directly supports all architectural decisions. Each bounded context has a consistent internal structure (domain/ application/ infrastructure/ graphql/) enabling predictable AI agent implementation.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage: 91/91 mapped**
All FRs (FR1–FR91) across 10 categories are mapped to specific backend modules, frontend features, and worker processors in the project structure.

**Non-Functional Requirements Coverage: 21/23 addressed, 2 gaps resolved**

| NFR | Status | Resolution |
|---|---|---|
| P1-P6 (Performance) | ✅ | Fastify high-perf, BullMQ async, Apollo cache, Vite optimized builds |
| S1-S8 (Security) | ✅ | AES-256, TLS 1.3, RBAC 6 roles, MFA (TOTP+Passkeys), e-signatures, audit trails, 30min timeout |
| SC1-SC5 (Scalability) | ✅ | K8s HPA, PostgreSQL, Redis cache, multi-tenant ready architecture |
| R1-R2 (Availability/Backup) | ✅ | K8s deployments, pg_dump + WAL, 30-day retention |
| R3 (Auto-save 10s) | ✅ RESOLVED | Add `use-auto-save.ts` hook: Plate editor debounced save via Apollo mutation, React Hook Form `watch()` + debounced save, UI indicator "Saved/Saving..." |
| R4-R6 (Integrity) | ✅ | Snapshot service, SHA-256 checksums, referential integrity enforcement |
| I1-I2 (Import/Export) | ✅ | XLS parser service, Carbone + docx hybrid |
| I3 (Email/SMTP) | ✅ RESOLVED | Add email service: `resend` or `nodemailer`, BullMQ queue `notification:send-email`, email templates, triggered by domain events |
| I4 (Future API) | ✅ | GraphQL inherently extensible |

**Gap Resolutions Added to Architecture:**

1. **Auto-save (R3):** `apps/web/src/shared/hooks/use-auto-save.ts` — debounced Apollo mutations every 10s for Plate editor and forms
2. **Email Notifications (I3):** `apps/api/src/shared/services/email-service.ts` + `apps/workers/src/processors/notification/send-email.ts` — domain event-triggered email via BullMQ queue

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 30+ technology decisions with verified versions ✅
- All critical, important, and deferred decisions categorized ✅
- Rationale documented for every decision ✅

**Structure Completeness:**
- 200+ files/directories explicitly defined ✅
- All 5 bounded contexts fully structured ✅
- Cross-cutting concerns located with specific file paths ✅
- Integration points mapped (internal + 10+ external) ✅

**Pattern Completeness:**
- 25+ conflict points identified and resolved ✅
- Naming conventions cover DB, GraphQL, TypeScript, files, routes ✅
- Communication patterns: domain events, BullMQ jobs, subscriptions ✅
- Process patterns: error handling, loading, audit, validation ✅
- Good/bad examples provided ✅

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (91 FRs, 23 NFRs, 5 module specs, product brief)
- [x] Scale and complexity assessed (Enterprise-grade, 5 bounded contexts)
- [x] Technical constraints identified (MDR, 21 CFR Part 11, sequential dependencies, version locking)
- [x] Cross-cutting concerns mapped (10 concerns: audit, RBAC, events, snapshots, LLM, DOCX, dependencies, traceability, async tasks, status-based access)

**✅ Architectural Decisions**
- [x] Critical decisions documented with verified versions (Feb 2026)
- [x] Technology stack fully specified (React 19, Fastify 5.7, Prisma 7.2, Apollo Server 4, Pothos v4, BullMQ 5.69, etc.)
- [x] Integration patterns defined (GraphQL, domain events, BullMQ queues, subscriptions)
- [x] Performance considerations addressed (all P1-P6 NFRs)
- [x] Security architecture complete (auth, MFA, e-signatures, RBAC, audit, encryption)

**✅ Implementation Patterns**
- [x] Naming conventions established (database, GraphQL, TypeScript, files, routes, events, queues)
- [x] Structure patterns defined (DDD per bounded context, feature-based frontend)
- [x] Communication patterns specified (domain events format, BullMQ naming, Zustand stores)
- [x] Process patterns documented (error handling, loading states, audit, validation boundaries)
- [x] Enforcement guidelines with good/bad examples

**✅ Project Structure**
- [x] Complete directory structure defined (monorepo: apps/api, apps/web, apps/workers, packages/*)
- [x] Component boundaries established (API, Data, Worker, Frontend boundaries)
- [x] Integration points mapped (internal communication + external APIs)
- [x] Requirements to structure mapping complete (91/91 FRs mapped to specific directories)

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Clean DDD architecture with 5 bounded contexts matching regulatory module boundaries
- Modern, verified tech stack (all versions confirmed Feb 2026 stable releases)
- Comprehensive consistency patterns preventing AI agent implementation conflicts
- Complete FR→structure mapping (91/91) ensuring no requirements fall through cracks
- Well-isolated cross-cutting concerns (audit, RBAC, events) as shared middleware
- Hybrid DOCX strategy (Carbone templates + docx programmatic) covering all regulatory document types
- LLM abstraction layer enabling multi-provider flexibility with cost tracking

**Areas for Future Enhancement (non-blocking):**
- OpenTelemetry distributed tracing (valuable as cross-module flows increase)
- Feature flags system for progressive deployments
- GraphQL API versioning strategy (needed when API becomes public, V3.0+)
- Advanced cache invalidation via domain events
- Rate limiting dashboard for LLM cost monitoring

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow ALL architectural decisions exactly as documented — versions, patterns, structure
2. Use implementation patterns consistently across all components
3. Respect project structure and module boundaries (no cross-module direct calls)
4. Emit domain events for all significant state transitions
5. Use typed domain errors (never raw `throw new Error()`)
6. Validate with Zod at system boundaries only
7. Refer to this document for all architectural questions

**First Implementation Priority:**
```bash
npx create-turbo@latest cortex-clinical-affairs --package-manager pnpm
```
Then restructure into the target monorepo layout with apps/api, apps/web, apps/workers, and packages/*.
