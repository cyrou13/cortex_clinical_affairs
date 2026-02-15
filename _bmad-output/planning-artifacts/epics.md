---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - planning-artifacts/prd.md
  - planning-artifacts/architecture.md
  - planning-artifacts/ux-design-specification.md
projectName: cortex-clinical-affairs
date: 2026-02-14
author: Cyril
---

# cortex-clinical-affairs - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cortex-clinical-affairs, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories. CORTEX is a full-lifecycle clinical affairs platform for medical device manufacturers, covering Systematic Literature Search (SLS), State of the Art Analysis (SOA), Clinical Validation, Clinical Evaluation Report (CER) assembly, and Post-Market Surveillance (PMS).

## Requirements Inventory

### Functional Requirements

FR1: Admin can create new projects with project name, device information, and regulatory context
FR2: Admin can configure Clinical Evaluation Plan (CEP) with scope, objectives, and device classification
FR3: Clinical Specialist can create SLS sessions linked to a specific CEP
FR4: Users can view project dashboard showing status of all modules
FR5: Users can view project timeline with deadlines and milestones
FR6: Admin can assign users to specific projects with role-based permissions
FR7: Clinical Specialist can construct Boolean queries with operators and version control
FR7a: Clinical Specialist can create SLS session with type that drives downstream behavior
FR7b: System can display different scope fields based on session type
FR8: Clinical Specialist can execute queries across multiple databases (PubMed, Cochrane, Embase)
FR8a: System can create Query Execution Record as PRISMA source of truth
FR8b: System can track execution counts per query
FR9: System can import article metadata from database APIs
FR10: System can deduplicate articles across multiple database sources
FR10a: System can apply deduplication rules (DOI exact, PMID exact, title fuzzy)
FR10b: System can track deduplication statistics for PRISMA flowchart
FR11: System can track Article-Query Links
FR11a: System can manage article lifecycle states
FR11b: Clinical Specialist can transition articles between lifecycle states with logged justification
FR12: AI can score articles for relevance based on abstract content (0-100 score)
FR12a: AI can return suggested exclusion code mapped to project-specific code list
FR12b: Clinical Specialist can cancel AI scoring in progress
FR12c: System can display AI scoring progress with ETA and completion notifications
FR13: Clinical Specialist can configure relevance thresholds
FR13a: Admin can configure project-specific exclusion-reason codes
FR13b: Admin can add, rename, hide, reorder exclusion codes
FR13c: System can use exclusion codes in AI suggestions and screening decisions
FR14: Clinical Specialist can manually review articles and make screening decisions
FR14a: Clinical Specialist can define optional Custom AI Filter
FR14b: System can display Custom AI Filter as sortable/filterable column
FR15: System can log screening decisions with reason and timestamp
FR16: Clinical Specialist can perform spot-check validation of AI screening decisions
FR17: Clinical Specialist can lock SLS dataset (change status to immutable)
FR18: System can auto-generate PRISMA flowchart with per-query and per-database breakdown
FR18a: System can generate reproducibility statements per database
FR19: System can prevent modifications to locked SLS datasets
FR19a: System can retrieve full-text PDFs via multiple sources
FR19b: System can perform smart verification of PDFs
FR19c: Clinical Specialist can manually upload PDFs for articles
FR19d: Clinical Specialist can review and resolve PDF mismatch warnings
FR19e: Clinical Specialist can manually add articles not from searches
FR19f: System can extract references from PDFs using GROBID + LLM fallback
FR19g: System can validate extracted references via CrossRef/PubMed APIs
FR19h: System can deduplicate mined references against existing article pool
FR19i: Clinical Specialist can review and approve mined references for inclusion
FR19j: System can display async task panel with progress, ETA, and status
FR19k: Users can cancel async tasks in progress
FR19l: System can run tasks in background and send completion notifications
FR19m: Users can view task history with completion status and timestamps
FR19n: Admin can configure LLM backends per task type
FR19o: System can apply cost-optimization strategy for LLM selection
FR20: Clinical Specialist can create SOA analysis with type (clinical, similar_device, alternative)
FR21: Clinical Specialist can link SOA to one or more locked SLS sessions
FR22: System can enforce sequential dependency for Device SOA
FR23: Clinical Specialist can configure extraction grids with custom columns per SOA type
FR24: Clinical Specialist can select from pre-built extraction grid templates
FR25: AI can pre-populate extraction grids from article PDFs
FR26: Clinical Specialist can validate and correct AI-extracted data in grids
FR26a: Clinical Specialist can perform QUADAS-2 quality assessment per article
FR26b: Clinical Specialist can perform Internal Reading Grids quality assessment per article
FR26c: System can generate combined quality assessment summary
FR26d: Clinical Specialist can assign data contribution level per article
FR26e: System can display per-cell AI confidence level for extracted data
FR26f: Clinical Specialist can flag cells with low AI confidence for manual review
FR26g: System can store source quote for extracted numeric values
FR26h: Clinical Specialist can view source quote when hovering over extracted cell value
FR26i: System can deep-link from grid cell to PDF location where data was extracted
FR26j: System can track per-article extraction status in grid
FR26k: System can display extraction progress per SOA analysis
FR26l: Clinical Specialist can filter grid by extraction status
FR27: Clinical Specialist can create MDR-aligned thematic sections (Clinical §1-6, Device §1-5)
FR28: AI can generate narrative drafts for thematic sections based on extraction grid data
FR29: Clinical Specialist can review, edit, and approve AI-drafted narratives
FR30: Clinical Specialist can create Similar Device Registry (Clinical SOA Section 6)
FR31: Clinical Specialist can aggregate performance benchmarks
FR32: Clinical Specialist can create device comparison tables from similar device registry
FR33: Clinical Specialist can manage claims linked to articles and sections
FR34: Clinical Specialist can lock SOA analysis (change status to immutable)
FR34a: System can run batch quality assessment asynchronously with progress tracking
FR34b: System can cancel SOA async operations in progress
FR34c: System can display SOA async operations in task panel with status
FR35: RA Manager can create validation study with type (Standalone, MRMC)
FR35a: RA Manager can launch mini literature search from Validation
FR35b: System can link mini literature search to Validation study for traceability
FR36: RA Manager can link validation study to SOA Device analysis
FR37: RA Manager can define study protocol (endpoints, sample size justification, statistical strategy)
FR37a: System can warn when protocol is amended after approval
FR37b: System can automatically increment protocol version when amended
FR37c: System can include amendment history in Validation Report
FR38: Data Science can import validation results via XLS file upload
FR38a: System can manage multiple XLS import versions per validation study
FR38b: Data Science can select "active" import version for report generation
FR38c: System can display diff between import versions
FR38d: System can rollback to previous import version if needed
FR39: System can validate XLS schema (ensure required fields present)
FR40: System can map validation results to SOA benchmarks (auto-compare)
FR41: System can generate Validation Report (DOCX)
FR42: System can generate Clinical Benefit Report for MRMC studies (DOCX)
FR42a: System can generate Algorithmic Fairness Report (DOCX)
FR42b: System can generate Labeling Validation Checklist (DOCX)
FR42c: System can generate Benefit Quantification Report (DOCX)
FR42d: System can export structured output set
FR42e: System can generate Patch Validation Report with delta analysis
FR42f: System can highlight what changed between parent study and patch study
FR42g: System can generate FDA 18.CVS standalone report (DOCX)
FR42h: System can export FDA 18.CVS with FDA-specific formatting
FR43: RA Manager can map validation results to GSPR requirements
FR44: RA Manager can lock validation study (change status to immutable)
FR44a: System can display which Validation actions run asynchronously
FR44b: System can track async Validation operations in task panel
FR45: RA Manager can create CER with regulatory context (CE-MDR, FDA 510(k))
FR46: RA Manager can link CER to locked upstream modules (SLS, SOA, Validation)
FR47: RA Manager can reference external documents with summary
FR48: RA Manager can create Named Device Literature Search
FR48a: System can search competent authority databases (MAUDE, ANSM, BfArM, AFMPS)
FR48b: System can aggregate vigilance findings from multiple competent authority sources
FR49: System can assemble CER with 14 MDR Annex XIV sections
FR50: AI can draft narrative for each CER section based on upstream data
FR51: RA Manager can review, edit, and finalize AI-drafted CER sections
FR52: Users can drill-down from any CER claim to view source with one click
FR53: System can auto-generate GSPR Compliance Matrix
FR54: System can generate Benefit-Risk Determination
FR55: RA Manager can manage CER versions (initial, annual_update, patch_update)
FR55a: System can duplicate previous locked CER when creating update version
FR55b: System can display "unchanged since vN" indicators for sections
FR55c: System can flag sections requiring updates based on upstream module changes
FR55d: System can generate delta summary showing what changed between CER versions
FR56: System can lock upstream dependencies as immutable snapshots per CER version
FR57: System can export CER in multiple formats (20.CER, CEP, PCCP, GSPR Table - all DOCX)
FR58: RA Manager can complete and lock CER (change status to immutable)
FR58a: System can differentiate cross-reference numbering rules
FR58b: System can auto-renumber cross-references when sections are edited
FR58c: System can detect version mismatches when external documents change version
FR58d: System can flag impacted CER sections when external document version changes
FR58e: System can compile bibliography from all cited articles across CER sections
FR58f: System can deduplicate bibliography entries
FR58g: System can support multiple citation output styles (Vancouver, author-year)
FR58h: RA Manager can track deviations from PCCP
FR58i: RA Manager can configure deviation significance threshold
FR58j: System can flag significant deviations requiring justification
FR58k: RA Manager can assign evaluator roles per CER section
FR58l: RA Manager can attach evaluator CV to CER metadata
FR58m: RA Manager can record evaluator COI declarations
FR58n: System can display evaluator metadata and signature trail
FR58o: System can auto-generate GSPR compliance statement
FR58p: System can include GSPR compliance statement in CER document
FR59: RA Manager can create PMS Plan with update frequency and data collection methods
FR59a: Admin can configure vigilance databases per PMS Plan
FR59b: Admin can define vigilance search keywords per similar device
FR59c: Admin can link survey templates to PMS Plan
FR59d: System can manage PMS Plan statuses (draft → approved → active)
FR59e: RA Manager can define Responsibilities table per PMS activity
FR60: System can auto-populate Gap Registry from SOA, Validation, and CER open questions
FR61: RA Manager can create PMS Cycles linked to CER version
FR62: Clinical Specialist can execute PMCF activities
FR62a: Clinical Specialist can enter complaints and incidents data from Zoho Desk
FR62b: System can compute trend analysis from complaints, incidents, and installed base data
FR62c: System can track activity completion status per PMCF activity
FR63: System can generate PMCF Report (DOCX)
FR64: System can generate PSUR (DOCX)
FR64a: System clarifies: PSUR is the comprehensive annual report
FR65: RA Manager can document CER Update Decision with benefit-risk re-assessment
FR66: System can update Gap Registry based on PMS findings
FR67: System can trigger CER version update when PSUR identifies material changes
FR68: Admin can create users with roles
FR69: System can enforce role-based permissions per module
FR70: System can enforce status-based access control (draft = editable, locked = read-only)
FR71: Admin can assign users to specific projects
FR72: System can log all permission checks
FR73: Admin can unlock locked documents with audit trail justification
FR74: System can generate DOCX documents using MDR-compliant templates
FR75: System can generate multiple document types
FR76: System can complete DOCX generation in <5 minutes for 100+ page documents
FR77: Users can export proof packages for Notified Body audits
FR78: System can log all user actions with WHO, WHAT, WHEN, WHY
FR79: System can log screening decisions with inclusion/exclusion reasons
FR80: System can log workflow state transitions
FR81: System can log document version history with timestamps
FR82: Auditors can drill-down from any CER claim to view complete source chain
FR83: Auditors can export audit trails in CSV or PDF format
FR84: System can enforce 100% traceability
FR85: AI can perform relevance scoring for literature screening
FR86: AI can pre-populate SOA extraction grids from article PDFs
FR87: AI can generate narrative drafts for SOA thematic sections and CER sections
FR88: System can enforce mandatory human review gates before finalization
FR89: Clinical Specialist can perform spot-check validation of AI decisions
FR90: System can track AI acceptance rate
FR91: Users can override AI decisions at any point

### NonFunctional Requirements

P1: SLS query execution completes in <30 seconds for queries returning up to 10,000 articles
P2: AI screening processes 1,000 articles in <5 minutes
P3: Full-text AI abstraction processes 50 articles in <10 minutes
P4: CER document generation (100+ pages) completes in <2 minutes
P5: User interface actions respond in <2 seconds
P6: System supports 5 concurrent users on same project with <10% performance degradation
S1: All data encrypted at rest (AES-256) and in transit (TLS 1.3)
S2: Role-Based Access Control (RBAC) strictly enforced for 6 defined roles
S3: Multi-Factor Authentication (MFA) required for all users
S4: Immutable audit trail logs all critical actions
S5: Electronic signatures compliant with 21 CFR Part 11
S6: GDPR-compliant data handling for patient data in clinical studies
S7: Data retention of 15 years for all regulatory submissions
S8: Session timeout after 30 minutes of inactivity
SC1: System supports up to 50 concurrent users
SC2: System supports up to 20 concurrent device projects
SC3: Shared article database scales to 100,000+ indexed articles
SC4: CER generation supports documents up to 500 pages with annexes
SC5: Architecture permits future migration to multi-tenant SaaS
R1: System availability of 99% during business hours
R2: Automated daily database backups with 30-day retention
R3: All user inputs auto-saved every 10 seconds
R4: Locked document versions are immutable with checksum verification
R5: Recovery Point Objective (RPO) <24 hours, Recovery Time Objective (RTO) <4 hours
R6: Architecture-enforced traceability prevents orphaned CER claims
I1: Import Risk Management files in .xlsx and .xml formats
I2: Export regulatory submissions in DOCX format with configurable templates
I3: Email notifications via SMTP for workflow assignments and PMS alerts
I4: Architecture permits future API for third-party integrations

### Additional Requirements

**From Architecture:**
- Starter Template: Custom Turborepo monorepo (npx create-turbo@latest) — Epic 1 Story 1
- Technology Stack: React 19, Fastify 5.7, Apollo Server 4 (Pothos code-first), Prisma 7.2, BullMQ 5.69, Zustand 5, TanStack Router, ag-Grid 33, Plate editor
- Multi-file Prisma schemas per bounded context (sls.prisma, soa.prisma, cer.prisma, validation.prisma, pms.prisma, shared.prisma, auth.prisma, project.prisma, audit.prisma)
- Event bus (RabbitMQ) for inter-module domain events with typed DomainEvent<T> format
- Version snapshots via JSON serialization + SHA-256 checksum for CER version locking
- Layered Redis caching (LLM results, sessions, aggregations) — shared with BullMQ
- Google OAuth 2.0 + JWT (access 15min + refresh 7d) for authentication
- TOTP + WebAuthn/Passkeys for MFA
- E-Signatures: password re-entry + bcrypt verify + SHA-256 document hash + audit trail
- GraphQL Subscriptions (graphql-ws) + SSE fallback for real-time updates
- Hybrid DOCX generation: Carbone.io (template-driven) + docx npm (programmatic sections)
- Docker + Kubernetes deployment with separate images for api, web, workers
- Monitoring: Grafana + Prometheus + Loki + Sentry
- CI/CD: GitHub Actions with Turborepo remote caching

**From UX Design:**
- Desktop-first (≥1280px minimum, optimized for 1920px+), no mobile
- Design direction: Hybrid B+F — "Hybrid Velocity with Stripe Clarity"
- Dark sidebar (#0A3153) + neutral page background (#F8F9FA) + white work area
- Cortex Blue (#0F4C81) as primary brand color
- Inter font, 7-level type scale (12px–30px)
- Layout: Topbar pipeline (56px) + Sidebar (240px, collapsible to 64px) + Work area (flex-1) + Detail panel (380px, retractable) + Statusbar (32px)
- 8 custom components: PipelineProgressBar, StatusBadge, LockConfirmation, AiConfidenceIndicator, SourceQuotePopover, TraceabilityDrillDown, AsyncTaskPanel, ESignatureModal
- shadcn/ui + Tailwind CSS 4 design system with CORTEX design tokens
- ag-Grid themed with CORTEX tokens for data-heavy views
- Plate (Slate-based) rich text editor for CER/SOA narratives
- Keyboard navigation for power users (I/E/↑↓/Space/Escape/Cmd+K)
- Progressive disclosure, optimistic updates, skeleton loading states
- WCAG 2.1 AA accessibility compliance
- Irréversible action patterns: standard (simple dialog) → important (LockConfirmation with checkbox) → critical (ESignatureModal with password)

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1-FR6 | Epic 1 | Project & Session Management |
| FR7-FR7b | Epic 2 | SLS Session & Query Construction |
| FR8-FR8b | Epic 2 | Multi-Database Query Execution |
| FR9-FR10b | Epic 2 | Article Import & Deduplication |
| FR11-FR11b | Epic 2 | Article Lifecycle & Query Links |
| FR12-FR12c | Epic 2 | AI Scoring with Exclusion Codes |
| FR13-FR13c | Epic 2 | Exclusion Code System |
| FR14-FR14b | Epic 2 | Manual Screening & Custom AI Filter |
| FR15-FR16 | Epic 2 | Screening Audit & Spot-Check |
| FR17-FR19 | Epic 2 | Dataset Locking & PRISMA |
| FR19a-FR19d | Epic 2 | PDF Retrieval & Verification |
| FR19e-FR19i | Epic 2 | Manual Article Addition & Reference Mining |
| FR19j-FR19m | Epic 2 | Async Task System |
| FR19n-FR19o | Epic 2 | LLM Abstraction Layer |
| FR20-FR22 | Epic 3 | SOA Configuration & Linking |
| FR23-FR24 | Epic 3 | Extraction Grid Configuration |
| FR25-FR26 | Epic 3 | AI Grid Pre-Population |
| FR26a-FR26d | Epic 3 | Evidence Quality Assessment |
| FR26e-FR26i | Epic 3 | AI Confidence & Source Tracking |
| FR26j-FR26l | Epic 3 | Per-Article Extraction Status |
| FR27 | Epic 3 | MDR-Aligned Thematic Sections |
| FR28-FR29 | Epic 3 | AI Narrative Drafting |
| FR30-FR32 | Epic 3 | Similar Devices & Benchmarks |
| FR33 | Epic 3 | Claims Management |
| FR34-FR34c | Epic 3 | SOA Locking & Async |
| FR35-FR36 | Epic 4 | Validation Study Creation |
| FR37-FR37c | Epic 4 | Protocol Management |
| FR38-FR39 | Epic 4 | XLS Data Import |
| FR40 | Epic 4 | Results Mapping |
| FR41-FR42h | Epic 4 | Report Generation |
| FR43-FR44b | Epic 4 | GSPR Mapping & Locking |
| FR45-FR47 | Epic 5 | CER Creation & Configuration |
| FR48-FR48b | Epic 5 | Named Device Literature Search |
| FR49-FR51 | Epic 5 | CER Assembly & AI Drafting |
| FR52 | Epic 5 | Traceability Drill-Down |
| FR53-FR54 | Epic 5 | GSPR Matrix & Benefit-Risk |
| FR55-FR56 | Epic 5 | CER Version Management |
| FR57-FR58 | Epic 5 | CER Export & Locking |
| FR58a-FR58g | Epic 5 | Cross-References & Bibliography |
| FR58h-FR58j | Epic 5 | PCCP Deviation Workflow |
| FR58k-FR58n | Epic 5 | Evaluator Records & E-Signatures |
| FR58o-FR58p | Epic 5 | GSPR Compliance Statement |
| FR59-FR59e | Epic 6 | PMS Plan Configuration |
| FR60 | Epic 6 | Gap Registry |
| FR61 | Epic 6 | PMS Cycles |
| FR62-FR62c | Epic 6 | PMCF Activities |
| FR63-FR64a | Epic 6 | PMCF Report & PSUR |
| FR65-FR67 | Epic 6 | CER Update Decision & Loop Closure |
| FR68-FR73 | Epic 1 | User & Permission Management |
| FR74-FR76 | Epic 4 | Document Generation Engine |
| FR77 | Epic 5 | Proof Package Export |
| FR78-FR81 | Epic 1 | Audit Trail Foundation |
| FR82-FR84 | Epic 5 | Auditor Traceability & Enforcement |
| FR85 | Epic 2 | AI Relevance Scoring |
| FR86 | Epic 3 | AI Grid Extraction |
| FR87 | Epic 3, Epic 5 | AI Narrative Drafting |
| FR88-FR89 | Epic 2 | Human Review Gates & Spot-Check |
| FR90-FR91 | Epic 2 | AI Acceptance Rate & Override |

## Epic List

### Epic 1: Project Foundation & User Management
Users can create secure accounts, manage teams with role-based permissions, and set up clinical affairs projects with full pipeline visibility. This epic establishes the application shell, authentication, RBAC, project management, and cross-cutting infrastructure (audit trails, async tasks) that all subsequent modules depend on.
**FRs covered:** FR1-FR6, FR68-FR73, FR78-FR81
**NFRs addressed:** S1-S8, R1-R3, SC1-SC2, SC5

### Epic 2: Systematic Literature Search (SLS)
Clinical Specialists can conduct comprehensive systematic literature searches with AI-assisted screening, achieving 80-90% time reduction. This includes multi-database query execution, AI relevance scoring, manual review workflows, dataset locking with PRISMA generation, and PDF retrieval with reference mining.
**FRs covered:** FR7-FR19o, FR85, FR88-FR91
**NFRs addressed:** P1-P2, SC3

### Epic 3: State of the Art Analysis (SOA)
Clinical Specialists can perform thorough clinical evidence analysis with AI-assisted extraction grids, quality assessments, MDR-aligned thematic sections with AI-drafted narratives, performance benchmarks, and claims management.
**FRs covered:** FR20-FR34c, FR86, FR87 (SOA part)
**NFRs addressed:** P3

### Epic 4: Clinical Validation Management
RA Managers and Data Science teams can manage validation studies, import results, map to SOA benchmarks, and generate submission-ready validation reports in DOCX format. This epic also establishes the DOCX generation engine used by all subsequent modules.
**FRs covered:** FR35-FR44b, FR74-FR76
**NFRs addressed:** P4, I1-I2

### Epic 5: Clinical Evaluation Report (CER) Assembly
RA Managers can assemble AI-drafted, submission-ready Clinical Evaluation Reports with full traceability, GSPR compliance, benefit-risk determination, e-signatures, version management, and multi-format DOCX export.
**FRs covered:** FR45-FR58p, FR77, FR82-FR84, FR87 (CER part)
**NFRs addressed:** P4, S5, SC4, R4, R6

### Epic 6: Post-Market Surveillance (PMS)
RA Managers and Clinical Specialists can manage the complete post-market surveillance lifecycle, closing the regulatory loop from PMS findings back to CER updates.
**FRs covered:** FR59-FR67
**NFRs addressed:** S7, I3

## Epic 1: Project Foundation & User Management

Users can create secure accounts via Google OAuth, manage teams with role-based permissions across 6 roles, and set up clinical affairs projects with CEP configuration and full pipeline status visibility. This epic delivers the application shell, authentication, RBAC, project management, audit trail infrastructure, and async task system that all subsequent modules depend on.

### Story 1.1: Initialize Turborepo Monorepo & Development Environment

As a developer,
I want to initialize the project from a custom Turborepo monorepo with the complete workspace structure,
So that the team has a consistent, well-structured codebase to build upon.

**Acceptance Criteria:**

**Given** no existing project repository
**When** the monorepo is initialized with `npx create-turbo@latest cortex-clinical-affairs --package-manager pnpm`
**Then** the project has the target structure: apps/api, apps/web, apps/workers, packages/prisma, packages/shared, packages/ui, packages/config-eslint, packages/config-typescript, packages/config-tailwind
**And** TypeScript 5.7+ is configured in strict mode across all workspaces
**And** pnpm 9.x workspaces are configured with pnpm-workspace.yaml
**And** ESLint, Prettier, and commitlint are configured with shared configs
**And** Husky pre-commit hooks run lint-staged
**And** Docker Compose file is created for local development (PostgreSQL 16, Redis 7, RabbitMQ)
**And** .env.example documents all required environment variables
**And** `pnpm install` and `pnpm build` complete successfully across all workspaces

### Story 1.2: API Server, Database & GraphQL Foundation

As a developer,
I want a running Fastify API server with Pothos GraphQL schema and Prisma database connection,
So that we have the backend foundation for all modules.

**Acceptance Criteria:**

**Given** the initialized monorepo from Story 1.1
**When** the API server starts
**Then** Fastify 5.7 serves a GraphQL endpoint at `/graphql` via Apollo Server 4 with @as-integrations/fastify
**And** Pothos schema builder is configured with Prisma plugin for type-safe schema generation
**And** Prisma 7.2 connects to PostgreSQL with multi-file schema support (prismaSchemaFolder)
**And** Initial schema files are created: shared.prisma (AuditLog, AsyncTask, VersionSnapshot), auth.prisma (User, Session, MfaDevice), project.prisma (Project, Cep)
**And** Custom GraphQL scalars are registered (DateTime, UUID, JSON)
**And** A `/health` REST endpoint returns server status
**And** Zod validation is configured for GraphQL input types
**And** Domain error classes are implemented (DomainError, NotFoundError, PermissionDeniedError, LockConflictError, ValidationError)
**And** Structured logger is configured (no console.log in production)
**And** Prisma migrations run successfully and seed data can be loaded

### Story 1.3: Application Shell & Navigation Layout

As a user,
I want a professional application shell with sidebar navigation, pipeline progress bar, and responsive layout,
So that I can navigate between modules and always know where I am in the project.

**Acceptance Criteria:**

**Given** the frontend workspace (apps/web) with React 19 + Vite
**When** the application loads
**Then** the layout displays: dark sidebar (240px, #0A3153) + topbar pipeline (56px) + main work area (flex-1) + retractable detail panel (380px) + statusbar (32px)
**And** the sidebar is collapsible to 64px (icon-only mode) with a toggle button
**And** TanStack Router is configured with type-safe routes matching the project structure
**And** Apollo Client is configured for GraphQL queries with normalized cache
**And** the PipelineProgressBar component renders 5 nodes (SLS → SOA → Validation → CER → PMS) with status icons
**And** the StatusBadge component renders with all 7 variants (draft, screening, uncertain, include, exclude, locked, completed)
**And** design tokens are defined in packages/config-tailwind (Cortex Blue palette, Inter font, spacing scale, status colors)
**And** shadcn/ui components are installed and themed with CORTEX design tokens
**And** Lucide Icons are used consistently across the application
**And** the layout adapts to screen sizes: ≥1920px (full), 1440-1919px (panel retracted), 1280-1439px (sidebar icons), <1280px (minimum size message)
**And** Cmd+K opens a command palette for quick navigation
**And** skip link "Go to main content" is the first focusable element

### Story 1.4: User Authentication & Session Management

As a user,
I want to log in securely via Google OAuth with JWT session management,
So that my identity is verified and my session persists across browser tabs.

**Acceptance Criteria:**

**Given** a user with a valid Google Workspace account
**When** the user clicks "Sign in with Google"
**Then** the system redirects to Google OAuth 2.0 consent screen
**And** upon successful authentication, a JWT access token (15min TTL) and refresh token (7 days, Redis-stored) are issued
**And** the User record is created in the database if first login (with default role)
**And** the session times out after 30 minutes of inactivity (S8)
**And** the refresh token is rotated on each use (prevent replay)
**And** all authentication data is encrypted at rest (AES-256) and in transit (TLS 1.3) (S1)
**And** the login page displays the CORTEX branding with Cortex Blue palette
**And** failed login attempts are logged in the audit trail

### Story 1.5: Multi-Factor Authentication

As an admin,
I want all users to set up MFA (TOTP or Passkeys) after first login,
So that the system meets S3 security requirements and 21 CFR Part 11 compliance.

**Acceptance Criteria:**

**Given** a user who has completed Google OAuth login
**When** MFA is not yet configured for this user
**Then** the system redirects to MFA setup page
**And** the user can set up TOTP via QR code (compatible with Google Authenticator, Authy)
**And** alternatively, the user can register a WebAuthn/Passkey device
**And** the system requires MFA verification on every new session
**And** recovery codes are generated and shown once (user must save them)
**And** MFA device management is available in user settings (add, remove devices)
**And** the MfaSetup component follows UX spec styling (Cortex Blue, professional layout)

### Story 1.6: Role-Based Access Control & User Management

As an admin,
I want to manage users and assign roles that control access per module, per status, and per project,
So that each team member has exactly the permissions they need (FR68-FR73).

**Acceptance Criteria:**

**Given** 6 defined roles: Admin, RA Manager, Clinical Specialist, Data Science, Executive, Auditor
**When** an admin assigns a role to a user
**Then** the system enforces permissions at the GraphQL resolver level (not just UI hiding) (S2)
**And** permissions are checked across 3 axes: role × module × document status
**And** SLS access: Admin, RA Manager, Clinical Specialist
**And** SOA access: Admin, RA Manager, Clinical Specialist
**And** Validation access: Admin, RA Manager, Data Science
**And** CER access: Admin, RA Manager (Clinical Specialist read-only)
**And** PMS access: Admin, RA Manager, Clinical Specialist
**And** locked documents are read-only for all users except Admin (who can unlock with audit trail justification) (FR70, FR73)
**And** all permission checks are logged in the audit trail (FR72)
**And** admin can create, deactivate, and modify user accounts (FR68)
**And** admin can assign users to specific projects (FR71)

### Story 1.7: Audit Trail Middleware

As a compliance officer,
I want every data mutation automatically logged with WHO, WHAT, WHEN, WHY,
So that we maintain an immutable audit trail for regulatory compliance (FR78-FR81).

**Acceptance Criteria:**

**Given** any GraphQL mutation is executed
**When** the mutation completes (success or failure)
**Then** the audit middleware automatically logs: userId, action, targetType, targetId, before state, after state, timestamp (ISO 8601)
**And** audit entries are immutable (no UPDATE or DELETE on AuditLog table) (S4)
**And** workflow state transitions are logged (FR80)
**And** document version history is tracked with timestamps (FR81)
**And** agents do NOT manually log audit entries — the middleware handles it automatically
**And** the audit trail supports 15-year retention (S7)
**And** auto-save status is visible in the statusbar (saving indicator every 10 seconds) (R3)

### Story 1.8: Project Creation & CEP Configuration

As an admin or RA Manager,
I want to create a new clinical affairs project and configure the Clinical Evaluation Plan,
So that my team can begin working on a device's regulatory documentation (FR1-FR3).

**Acceptance Criteria:**

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

### Story 1.9: Project Dashboard & Pipeline Status

As a user,
I want to see a dashboard showing the status of all modules for my project at a glance,
So that I always know where the project stands and what needs my attention (FR4-FR5).

**Acceptance Criteria:**

**Given** a user navigates to a project
**When** the project dashboard loads
**Then** the PipelineProgressBar shows current status of each module (not started, active, completed, locked, blocked)
**And** each module node is clickable to navigate to that module
**And** blocked modules show a tooltip explaining the dependency ("Requires SLS to be locked")
**And** the dashboard shows project timeline with deadlines and milestones (FR5)
**And** the main content area shows project cards for recent activity
**And** project-level metrics are displayed with Stripe-style typography (large numbers, clear hierarchy)
**And** the projects list page shows all projects the user has access to, with mini pipeline status dots

### Story 1.10: Async Task Infrastructure & Real-Time Updates

As a user,
I want background tasks (AI scoring, report generation) to run asynchronously with real-time progress updates,
So that I can continue working while long-running operations complete.

**Acceptance Criteria:**

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

## Epic 2: Systematic Literature Search (SLS)

Clinical Specialists can conduct comprehensive systematic literature searches with AI-assisted screening, achieving 80-90% time reduction. From Boolean query construction to multi-database execution, AI relevance scoring, manual review with keyboard navigation, and dataset locking with auto-generated PRISMA flowcharts — this epic delivers the foundational evidence gathering capability that feeds all downstream modules.

### Story 2.1: SLS Session Creation & Configuration

As a Clinical Specialist,
I want to create SLS sessions with configurable types and scope fields linked to my project's CEP,
So that I can organize my literature searches by purpose (FR3, FR7a, FR7b).

**Acceptance Criteria:**

**Given** a project with a configured CEP
**When** the Clinical Specialist creates a new SLS session
**Then** they can select a session type: soa_clinical, soa_device, similar_device, pms_update, ad_hoc
**And** the system displays different scope fields based on the selected session type (FR7b)
**And** the session is linked to the project's CEP (FR3)
**And** the SLS module sidebar shows the list of sessions with their status
**And** the session dashboard shows the current state (articles count, screening progress)
**And** the Prisma schema for SLS entities is created (SlsSession, Query, Article, etc.)
**And** the SLS module uses the dark sidebar navigation pattern from the UX spec

### Story 2.2: Boolean Query Builder with Version Control

As a Clinical Specialist,
I want to construct Boolean queries with AND/OR/NOT operators and track query versions,
So that I can build precise search strategies with full reproducibility (FR7).

**Acceptance Criteria:**

**Given** an open SLS session
**When** the Clinical Specialist opens the query builder
**Then** they can construct queries using Boolean operators (AND, OR, NOT) with parenthetical grouping
**And** each query version is saved with a version number and timestamp
**And** the user can view the history of query versions and compare changes
**And** queries can be duplicated and modified to create variations
**And** the query builder validates syntax before execution
**And** multiple queries can exist within a single SLS session
**And** the query builder follows the UX form patterns (labels above, inline validation)

### Story 2.3: Multi-Database Query Execution

As a Clinical Specialist,
I want to execute my queries across PubMed, Cochrane, and Embase simultaneously,
So that I get comprehensive literature coverage from multiple sources (FR8, FR8a, FR8b).

**Acceptance Criteria:**

**Given** a valid Boolean query in an SLS session
**When** the Clinical Specialist clicks "Execute Query"
**Then** the query is sent to PubMed API (and Cochrane/Embase when configured)
**And** a Query Execution Record is created as PRISMA source of truth with execution status (success/partial/failed/cancelled) (FR8a)
**And** execution counts are tracked per query (articles returned vs articles imported) (FR8b)
**And** PubMed API rate limiting is respected (10 requests/second with API key) (P1)
**And** query execution completes in <30 seconds for up to 10,000 articles (P1)
**And** the execution progress is shown in the AsyncTaskPanel
**And** reproducibility statements are generated per database (FR18a)
**And** errors from individual databases are handled gracefully (partial results accepted)

### Story 2.4: Article Import, Deduplication & Pool Management

As a Clinical Specialist,
I want imported articles to be automatically deduplicated and organized in a searchable pool,
So that I have a clean dataset without duplicates across databases (FR9, FR10, FR10a, FR10b, FR11).

**Acceptance Criteria:**

**Given** articles returned from database queries
**When** articles are imported into the SLS session
**Then** article metadata is extracted: title, abstract, authors, DOI, publication date, source database (FR9)
**And** deduplication rules are applied: DOI exact match, PMID exact match, title fuzzy >95% + same first author + same year (FR10a)
**And** deduplication statistics are tracked for PRISMA flowchart (FR10b)
**And** Article-Query Links are maintained (which query/database returned each article) (FR11)
**And** the article pool is displayed in an ag-Grid table with columns: title, authors, year, source, status
**And** the table supports sorting, filtering, column resize, and infinite scroll for 4,500+ articles
**And** articles have initial lifecycle state "pending" (FR11a)

### Story 2.5: LLM Abstraction Layer & AI Configuration

As an admin,
I want to configure which LLM provider is used for each AI task type with cost optimization,
So that we can control AI costs and switch providers as needed (FR19n, FR19o).

**Acceptance Criteria:**

**Given** supported LLM providers: Claude API, OpenAI (GPT-4), Ollama (local)
**When** an admin configures LLM backends
**Then** LLM providers can be set at 3 levels: system default, project override, per-task override (FR19n)
**And** cost-optimization strategy is applied for LLM selection (FR19o)
**And** the abstraction layer provides a unified interface for all AI tasks (scoring, extraction, drafting)
**And** LLM results are cached in Redis (same prompt + same article = cached response)
**And** rate limiting is applied per LLM provider with cost tracking
**And** fallback to manual workflows if LLM service is unavailable
**And** the implementation is in apps/workers/src/shared/llm/ following the architecture structure

### Story 2.6: AI-Assisted Abstract Screening

As a Clinical Specialist,
I want AI to score article relevance (0-100) based on abstract content with suggested exclusion codes,
So that I can quickly identify relevant articles and focus manual review on uncertain cases (FR12, FR12a, FR85).

**Acceptance Criteria:**

**Given** articles in "pending" status in an SLS session
**When** the Clinical Specialist clicks "Launch AI Screening"
**Then** AI processes articles asynchronously via BullMQ queue `sls:score-articles`
**And** each article receives a relevance score (0-100) (FR12)
**And** AI returns a suggested exclusion code mapped to the project-specific code list (FR12a)
**And** the AI scoring progress is displayed with a real-time counter and ETA (FR12c) — "2,800 / 4,500 articles scored. Estimated: 3 min remaining"
**And** 1,000 articles are processed in <5 minutes (P2)
**And** the Clinical Specialist can cancel scoring in progress (completed items are preserved) (FR12b)
**And** articles are categorized: Likely Relevant (≥75), Uncertain (40-74), Likely Irrelevant (<40)
**And** the scoring completion triggers a toast notification
**And** AI acceptance rate is tracked (FR90)

### Story 2.7: Exclusion Code System & Custom AI Filters

As a Clinical Specialist,
I want configurable exclusion codes and optional custom AI filters,
So that I can categorize excluded articles with standardized reasons for PRISMA reporting (FR13, FR13a-FR13c, FR14a, FR14b).

**Acceptance Criteria:**

**Given** a project with SLS sessions
**When** an admin configures exclusion-reason codes
**Then** project-specific codes can be added, renamed, hidden, and reordered with uniqueness constraints (FR13b)
**And** exclusion codes have short codes for PRISMA display (FR13a)
**And** AI scoring suggestions use the configured exclusion codes (FR13c)
**And** the Clinical Specialist can configure relevance thresholds (likely relevant, uncertain, likely irrelevant) (FR13)
**And** the Clinical Specialist can define an optional Custom AI Filter with a user-written criterion (FR14a)
**And** the Custom AI Filter produces a secondary 0-100 score displayed as a sortable/filterable column (FR14b)

### Story 2.8: Manual Screening Workflow

As a Clinical Specialist,
I want to manually review articles with keyboard shortcuts for rapid screening decisions,
So that I can efficiently process uncertain articles with full control over include/exclude decisions (FR14, FR11a, FR11b).

**Acceptance Criteria:**

**Given** articles with AI scores in an SLS session
**When** the Clinical Specialist opens the screening view
**Then** articles are displayed in an ag-Grid table with: title, abstract preview, AI score (colored badge), status, exclusion code
**And** keyboard navigation is supported: ↑↓ to navigate rows, I to Include, E to Exclude, Space to open detail panel
**And** the detail panel (380px right) shows: full abstract, AI reasoning (blue-50 box with blue-400 left border), source quote
**And** articles can transition between lifecycle states: pending → scored → included/excluded/skipped → full_text_review → final_included/final_excluded (FR11a)
**And** each transition requires logged justification (FR11b)
**And** the screening decision includes the selected exclusion code
**And** bulk actions are available: select multiple articles → "Include All" / "Exclude All"
**And** filter tabs show counts: Likely Relevant, Uncertain, Likely Irrelevant
**And** users can override AI decisions at any point (FR91)

### Story 2.9: Screening Audit Log & Validation

As a Clinical Specialist,
I want screening decisions logged with reason and timestamp, with spot-check validation capability,
So that the screening process is fully auditable and AI accuracy can be validated (FR15, FR16, FR79, FR88, FR89).

**Acceptance Criteria:**

**Given** screening decisions are made (include/exclude)
**When** a decision is recorded
**Then** the system logs: userId, articleId, decision, exclusionCode, reason, timestamp (FR15, FR79)
**And** the system enforces mandatory human review gates before finalization (FR88)
**And** Clinical Specialist can perform spot-check validation of AI screening decisions (FR16, FR89)
**And** spot-check results are logged and contribute to AI acceptance rate metrics
**And** the audit log is viewable in a dedicated panel with filters (by user, date, decision type)
**And** the audit trail is immutable

### Story 2.10: Dataset Locking & PRISMA Flowchart

As a Clinical Specialist,
I want to lock the screened dataset and auto-generate a PRISMA flowchart,
So that the literature evidence base is finalized and immutable for downstream modules (FR17, FR18, FR18a, FR19).

**Acceptance Criteria:**

**Given** all articles in an SLS session have been screened (no "pending" articles remain)
**When** the Clinical Specialist clicks "Lock Dataset"
**Then** a LockConfirmation dialog appears with: checkbox "I understand this action is irreversible", recap (e.g., "641 articles included"), and disabled "Lock" button until checkbox is checked
**And** upon confirmation, the dataset status changes to "locked" (immutable) (FR17)
**And** no modifications are permitted to locked datasets (FR19)
**And** PRISMA flowchart is auto-generated with per-query and per-database breakdown (FR18)
**And** the PRISMA flowchart includes: identification (databases, articles found), screening (AI + manual), eligibility (full-text review), inclusion (final dataset)
**And** deduplication counts are shown per step
**And** the lock triggers domain event `sls.dataset.locked` via RabbitMQ
**And** the pipeline progress bar updates: SLS node → "completed" with check icon
**And** a success toast appears: "Dataset locked. 641 articles included. PRISMA flowchart ready."

### Story 2.11: PDF Retrieval & Verification

As a Clinical Specialist,
I want the system to automatically retrieve and verify full-text PDFs for included articles,
So that I have access to source documents for extraction and analysis (FR19a-FR19d).

**Acceptance Criteria:**

**Given** articles included in a locked or in-progress SLS dataset
**When** PDF retrieval is triggered
**Then** the system searches multiple sources: PMC, Unpaywall, Europe PMC, DOI resolution (FR19a)
**And** retrieved PDFs undergo smart verification: title/authors extracted and compared to metadata (FR19b)
**And** mismatched PDFs are flagged for manual review (FR19d)
**And** Clinical Specialist can manually upload PDFs for articles without automatic retrieval (FR19c)
**And** PDF retrieval runs asynchronously with progress tracking in AsyncTaskPanel
**And** PDFs are stored in MinIO (S3-compatible object storage)
**And** retrieval statistics are shown: X/Y PDFs found, Z mismatches to review

### Story 2.12: Manual Article Addition & Reference Mining

As a Clinical Specialist,
I want to manually add articles and mine references from existing PDFs,
So that I can capture relevant literature not found through database searches (FR19e-FR19i).

**Acceptance Criteria:**

**Given** an SLS session (locked or in-progress)
**When** the Clinical Specialist uploads a PDF manually
**Then** LLM extracts metadata (title, authors, year, journal, DOI) from the PDF, user can edit before confirming (FR19e)
**And** the article enters the screening funnel with "pending" status
**And** references can be extracted from PDFs using GROBID + LLM fallback (FR19f)
**And** extracted references are validated via CrossRef/PubMed APIs (FR19g)
**And** mined references are deduplicated against the existing article pool (FR19h)
**And** Clinical Specialist can review and approve mined references for inclusion in the screening funnel (FR19i)
**And** reference mining runs asynchronously with progress tracking

## Epic 3: State of the Art Analysis (SOA)

Clinical Specialists can perform comprehensive clinical evidence analysis with AI-assisted extraction grids, per-cell confidence tracking, evidence quality assessments, MDR-aligned thematic sections with AI-drafted narratives, performance benchmarks, device comparison tables, and claims management. SOA analyses link to locked SLS datasets and enforce sequential dependencies.

### Story 3.1: SOA Configuration, SLS Linking & Dependency Enforcement

As a Clinical Specialist,
I want to create SOA analyses linked to locked SLS sessions with sequential dependency enforcement,
So that my evidence analysis is built on a solid, immutable literature foundation (FR20, FR21, FR22).

**Acceptance Criteria:**

**Given** one or more locked SLS datasets in the project
**When** the Clinical Specialist creates a new SOA analysis
**Then** they can select the SOA type: clinical, similar_device, alternative (FR20)
**And** the SOA is linked to one or more locked SLS sessions (FR21)
**And** only locked SLS sessions are available for linking
**And** the system warns if a Device SOA is created before Clinical SOA Section 6 is finalized (FR22)
**And** the SOA module sidebar shows sections: Clinical §1-6, Device §1-5 (depending on SOA type)
**And** the Prisma schema for SOA entities is created (SoaAnalysis, ExtractionGrid, GridCell, ThematicSection, Claim, etc.)
**And** the SOA dashboard shows progress per section

### Story 3.2: Configurable Extraction Grids with Templates

As a Clinical Specialist,
I want to configure extraction grids with custom columns and select from pre-built templates,
So that I can systematically extract data from articles in a structured format (FR23, FR24).

**Acceptance Criteria:**

**Given** an SOA analysis with linked SLS articles
**When** the Clinical Specialist configures an extraction grid
**Then** custom columns can be added per SOA type (author, year, study type, population, intervention, outcomes, etc.) (FR23)
**And** pre-built extraction grid templates are available for common SOA types (FR24)
**And** columns can be reordered, renamed, and removed
**And** the extraction grid is rendered using ag-Grid Enterprise with CORTEX theming
**And** the grid supports inline cell editing (Tab to move between cells, Excel-like flow)
**And** each row represents one article from the linked SLS dataset

### Story 3.3: AI Pre-Population of Extraction Grids

As a Clinical Specialist,
I want AI to pre-populate extraction grid cells from article PDFs,
So that I save time on data extraction and focus on validation (FR25, FR26, FR86).

**Acceptance Criteria:**

**Given** an extraction grid with defined columns and linked articles with PDFs
**When** the Clinical Specialist clicks "AI Pre-fill"
**Then** AI processes articles asynchronously via BullMQ queue `soa:extract-grid-data`
**And** cells are populated with data extracted from the article PDFs (FR25, FR86)
**And** 50 articles are processed in <10 minutes (P3)
**And** the Clinical Specialist can validate and correct AI-extracted data (FR26)
**And** AI extraction progress is shown in the AsyncTaskPanel
**And** extraction can be cancelled with completed items preserved

### Story 3.4: AI Confidence Indicators & Source Quote Tracking

As a Clinical Specialist,
I want to see per-cell AI confidence levels and source quotes for extracted data,
So that I can prioritize review of low-confidence cells and verify data accuracy (FR26e-FR26i).

**Acceptance Criteria:**

**Given** extraction grid cells populated by AI
**When** the grid is displayed
**Then** each cell shows an AiConfidenceIndicator badge: H (green, ≥80%), M (orange, 50-79%), L (red, <50%) (FR26e)
**And** cells with low confidence can be flagged for manual review (FR26f)
**And** source quotes (text snippets from the PDF) are stored per extracted value (FR26g)
**And** hovering over a cell value shows a SourceQuotePopover with the source quote in italics, article reference, and page number (FR26h)
**And** clicking "View in PDF" deep-links to the PDF location where data was extracted (FR26i)
**And** validated cells show a check overlay, corrected cells show an edit overlay

### Story 3.5: Per-Article Extraction Status & Progress

As a Clinical Specialist,
I want to track extraction status per article and see overall progress,
So that I know which articles still need review (FR26j, FR26k, FR26l).

**Acceptance Criteria:**

**Given** an extraction grid with multiple articles
**When** extraction work is in progress
**Then** each article row shows extraction status: pending, extracted, reviewed, flagged (FR26j)
**And** overall extraction progress is displayed per SOA analysis (e.g., "45/187 articles reviewed") (FR26k)
**And** the grid can be filtered by extraction status (FR26l)
**And** the sidebar shows a progress indicator for each section

### Story 3.6: Evidence Quality Assessment

As a Clinical Specialist,
I want to perform QUADAS-2 and Internal Reading Grids quality assessments per article,
So that I can evaluate evidence quality and assign data contribution levels (FR26a-FR26d).

**Acceptance Criteria:**

**Given** articles in an extraction grid
**When** the Clinical Specialist performs quality assessment
**Then** QUADAS-2 regulatory quality assessment can be completed per article (FR26a)
**And** Internal Reading Grids quality assessment can be completed per article (FR26b)
**And** the system generates a combined quality assessment summary (FR26c)
**And** data contribution level can be assigned per article: pivotal, supportive, background (FR26d)
**And** batch quality assessment can run asynchronously with progress tracking (FR34a)
**And** async quality assessment operations can be cancelled (FR34b)
**And** quality assessment status is visible in the async task panel (FR34c)

### Story 3.7: MDR-Aligned Thematic Sections

As a Clinical Specialist,
I want to create MDR-aligned thematic sections for clinical and device SOA,
So that my analysis follows the regulatory structure required for CER submission (FR27).

**Acceptance Criteria:**

**Given** an SOA analysis with populated extraction grids
**When** the Clinical Specialist navigates to thematic sections
**Then** Clinical SOA sections §1-6 are available (FR27):
  §1: General context, §2: Preclinical evaluation, §3: Clinical data identification, §4: Clinical data appraisal, §5: Clinical data analysis, §6: Similar devices
**And** Device SOA sections §1-5 are available (FR27):
  §1: Device description, §2: Intended purpose, §3: Existing data, §4: Device performance, §5: Clinical performance
**And** each section can be edited independently
**And** section completion status is tracked in the sidebar (draft, in progress, finalized)

### Story 3.8: AI-Assisted Narrative Drafting

As a Clinical Specialist,
I want AI to draft narratives for each thematic section based on extraction grid data,
So that I have a solid starting point for section writing that I can refine (FR28, FR29, FR87).

**Acceptance Criteria:**

**Given** a thematic section with populated extraction grid data
**When** the Clinical Specialist clicks "Generate Narrative"
**Then** AI drafts a narrative for the section based on the extraction grid data (FR28, FR87)
**And** the narrative is displayed in a Plate rich text editor for inline editing (FR29)
**And** AI-drafted content includes inline references [1], [2] with hover popover to source article
**And** the Clinical Specialist can review, edit, and approve the narrative (FR29)
**And** the editor supports: bold, italic, headings, lists, tables, inline references
**And** auto-save every 10 seconds (R3)
**And** the system tracks human edits vs. AI-generated content for acceptance rate metrics (FR90)

### Story 3.9: Similar Device Registry & Performance Benchmarks

As a Clinical Specialist,
I want to create a Similar Device Registry and aggregate performance benchmarks,
So that I have the comparative data needed for validation study design (FR30, FR31).

**Acceptance Criteria:**

**Given** Clinical SOA Section 6 is in progress
**When** the Clinical Specialist identifies similar devices
**Then** a Similar Device Registry is created listing all identified similar devices with key attributes (FR30)
**And** performance benchmarks are aggregated across similar devices (e.g., sensitivity, specificity ranges) (FR31)
**And** the registry becomes the foundation for Device SOA (unlocks Device SOA)
**And** benchmarks are formatted for comparison and can be used as acceptance criteria in Validation
**And** the registry data is displayed in a dedicated ag-Grid with sorting and filtering

### Story 3.10: Device Comparison Tables & Claims Management

As a Clinical Specialist,
I want to create device comparison tables and manage claims linked to articles,
So that I have structured evidence for CER traceability (FR32, FR33).

**Acceptance Criteria:**

**Given** a Similar Device Registry with performance data
**When** the Clinical Specialist creates comparison tables
**Then** device comparison tables are generated from the similar device registry data (FR32)
**And** tables include: device name, manufacturer, indication, key performance metrics
**And** claims can be created and linked to specific articles and SOA sections (FR33)
**And** each claim has: statement text, linked articles (with source quotes), linked section
**And** claims are the foundation for CER traceability (used in Epic 5)

### Story 3.11: SOA Locking

As a Clinical Specialist,
I want to lock the completed SOA analysis as immutable,
So that downstream modules (Validation, CER) build on finalized evidence (FR34).

**Acceptance Criteria:**

**Given** all SOA sections are finalized and all required extractions are complete
**When** the Clinical Specialist clicks "Lock SOA"
**Then** a LockConfirmation dialog shows: section count, article count, claim count
**And** upon confirmation, the SOA status changes to "locked" (immutable) (FR34)
**And** the lock triggers domain event `soa.analysis.locked` via RabbitMQ
**And** the pipeline progress bar updates: SOA node → "completed"
**And** downstream modules (Validation, CER) are unblocked
**And** if this is the Clinical SOA, Section 6 data unlocks Device SOA creation

## Epic 4: Clinical Validation Management

RA Managers and Data Science teams can manage clinical validation studies (Standalone and MRMC), define protocols with amendment tracking, import XLS results with version management, auto-compare results to SOA benchmarks, and generate submission-ready reports (Validation Report, Clinical Benefit Report, FDA 18.CVS, and more) in DOCX format. This epic also establishes the DOCX generation engine used by all subsequent modules.

### Story 4.1: Validation Study Creation & SOA Linking

As an RA Manager,
I want to create validation studies linked to SOA benchmarks with support for mini literature searches,
So that my validation study design is grounded in the state of the art (FR35, FR35a, FR35b, FR36).

**Acceptance Criteria:**

**Given** a locked SOA Device analysis with performance benchmarks
**When** the RA Manager creates a new validation study
**Then** they can select the study type: Standalone or MRMC (FR35)
**And** the study is linked to the SOA Device analysis with auto-imported benchmarks as acceptance criteria (FR36)
**And** for MRMC studies, a mini literature search (SLS session type ad_hoc) can be launched for methodology justification (FR35a)
**And** the mini literature search is linked to the validation study for traceability (FR35b)
**And** the Prisma schema for Validation entities is created (ValidationStudy, Protocol, DataImport, ResultsMapping, etc.)
**And** the Validation module dashboard shows study status and linked SOA benchmarks

### Story 4.2: Protocol Management with Amendment Tracking

As an RA Manager,
I want to define study protocols with endpoints, sample size justification, and automatic amendment tracking,
So that protocol changes are documented for regulatory compliance (FR37, FR37a-FR37c).

**Acceptance Criteria:**

**Given** a validation study
**When** the RA Manager defines the protocol
**Then** protocol fields include: study summary, endpoints, sample size justification, statistical strategy (FR37)
**And** the system warns when the protocol is amended after initial approval (FR37a)
**And** protocol version is automatically incremented (1.0 → 1.1) when amended (FR37b)
**And** amendment history is recorded and included in the Validation Report (FR37c)
**And** the protocol form uses the UX stepper pattern for multi-section entry
**And** auto-save every 10 seconds (R3)

### Story 4.3: XLS Data Import with Multi-Version Management

As a Data Science team member,
I want to import validation results via XLS file upload with version management and diff comparison,
So that results can be updated and tracked over time (FR38, FR38a-FR38d, FR39).

**Acceptance Criteria:**

**Given** a validation study with a defined protocol
**When** the Data Science user uploads an XLS file
**Then** the system validates the XLS schema (ensures required fields present) (FR39)
**And** multiple XLS import versions can be managed per study (FR38a)
**And** the user can select the "active" import version for report generation (FR38b)
**And** diffs between import versions are displayed (FR38c)
**And** previous import versions can be rolled back to if needed (FR38d)
**And** import validation errors are shown as inline alerts with corrective actions
**And** the import runs asynchronously with progress tracking (FR44a, FR44b)

### Story 4.4: Results Mapping to SOA Benchmarks

As an RA Manager,
I want validation results auto-compared to SOA benchmarks,
So that I can see at a glance whether the device meets acceptance criteria (FR40).

**Acceptance Criteria:**

**Given** imported validation results and linked SOA benchmarks
**When** results mapping is computed
**Then** each endpoint result is compared to the corresponding SOA benchmark target (FR40)
**And** comparison is displayed visually: result vs. target, status (met/not met)
**And** benchmarks from SOA Device analysis are auto-imported as acceptance criteria
**And** the mapping is presented in a clear comparison table with color-coded status

### Story 4.5: DOCX Generation Engine

As a system,
I want a hybrid DOCX generation engine using Carbone.io templates and docx npm for programmatic content,
So that all modules can generate submission-ready regulatory documents (FR74, FR75, FR76).

**Acceptance Criteria:**

**Given** the workers workspace (apps/workers/src/shared/docx/)
**When** a document generation request is made
**Then** Carbone.io processes DOCX templates with JSON data injection for template-driven documents
**And** docx npm generates programmatic sections (dynamic tables, charts, computed content)
**And** the hybrid strategy merges Carbone base documents with docx-inserted dynamic sections
**And** MDR-compliant templates are created for: Validation Report, CER, CEP, PCCP, PMCF Report, PSUR, FDA 18.CVS (FR74)
**And** multiple document types can be generated (FR75)
**And** generation completes in <5 minutes for 100+ page documents (FR76, P4)
**And** templates are stored in apps/workers/src/shared/docx/templates/
**And** document generation runs asynchronously via BullMQ

### Story 4.6: Validation Report Generation

As an RA Manager,
I want to generate Validation Reports and Clinical Benefit Reports in DOCX format,
So that I have submission-ready validation documentation (FR41, FR42).

**Acceptance Criteria:**

**Given** a validation study with protocol, imported results, and SOA benchmark mapping
**When** the RA Manager clicks "Generate Report"
**Then** a Validation Report (DOCX) is generated with: protocol, results, SOA comparison, amendment history (FR41)
**And** for MRMC studies, a Clinical Benefit Report is generated (DOCX) (FR42)
**And** reports include protocol version, amendment history (FR37c)
**And** generation runs asynchronously with progress tracking in AsyncTaskPanel
**And** the generated DOCX is available for download
**And** the report follows MDR-compliant formatting (I2)

### Story 4.7: Additional Report Generation

As an RA Manager,
I want to generate specialized reports (Algorithmic Fairness, Labeling Validation, FDA 18.CVS, Patch Validation),
So that I have complete validation documentation for all regulatory pathways (FR42a-FR42h).

**Acceptance Criteria:**

**Given** a completed validation study
**When** the RA Manager selects additional report types
**Then** Algorithmic Fairness Report can be generated (DOCX) (FR42a)
**And** Labeling Validation Checklist can be generated (DOCX) (FR42b)
**And** Benefit Quantification Report can be generated (DOCX) (FR42c)
**And** structured output set can be exported (FR42d)
**And** Patch Validation Report with delta analysis can be generated (FR42e)
**And** delta analysis highlights changes between parent study and patch study (FR42f)
**And** FDA 18.CVS (Clinical Validation Study) standalone report can be generated (FR42g)
**And** FDA 18.CVS uses FDA-specific formatting (FR42h)
**And** all reports run asynchronously via the DOCX generation engine

### Story 4.8: GSPR Mapping & Validation Locking

As an RA Manager,
I want to map validation results to GSPR requirements and lock the validation study,
So that results are traceable to regulatory requirements and finalized for CER use (FR43, FR44).

**Acceptance Criteria:**

**Given** a validation study with generated reports
**When** the RA Manager maps results to GSPR requirements
**Then** validation results can be mapped to specific GSPR requirements (FR43)
**And** the mapping is displayed in a structured table
**When** the RA Manager clicks "Lock Validation"
**Then** a LockConfirmation dialog appears with study summary
**And** upon confirmation, the validation study status changes to "locked" (immutable) (FR44)
**And** the lock triggers domain event `validation.study.locked` via RabbitMQ
**And** the pipeline progress bar updates: Validation node → "completed"
**And** the CER module is unblocked (if SLS and SOA are also locked)

## Epic 5: Clinical Evaluation Report (CER) Assembly

RA Managers can assemble AI-drafted, submission-ready Clinical Evaluation Reports following MDR Annex XIV structure (14 sections). This includes linking all upstream locked modules, external document references, named device literature searches, full traceability drill-down from any claim to its source, GSPR compliance matrix, benefit-risk determination, cross-reference and bibliography management, evaluator records with 21 CFR Part 11 e-signatures, CER version management, and multi-format DOCX export.

### Story 5.1: CER Creation, Configuration & Upstream Module Linking

As an RA Manager,
I want to create a CER linked to all locked upstream modules with regulatory context configuration,
So that the CER assembly has access to all evidence data (FR45, FR46, FR47).

**Acceptance Criteria:**

**Given** locked SLS, SOA, and Validation modules
**When** the RA Manager creates a new CER
**Then** they can set the regulatory context: CE-MDR primary, FDA 510(k) parallel (FR45)
**And** the CER links to locked upstream modules: SLS sessions, SOA analyses, Validation studies (FR46)
**And** only locked upstream modules are available for linking
**And** external documents can be referenced with summary: Risk Management, Usability, IFU (FR47)
**And** the Prisma schema for CER entities is created (CerVersion, CerSection, ClaimTrace, GsprMatrix, BenefitRisk, CrossReference, BibliographyEntry, PccpDeviation, Evaluator)
**And** the CER dashboard shows: linked upstream modules, section completion status, traceability coverage

### Story 5.2: External Document References & Version Tracking

As an RA Manager,
I want to manage external document references with version mismatch detection,
So that CER sections stay aligned with the latest external documents (FR58c, FR58d).

**Acceptance Criteria:**

**Given** a CER with external document references (Risk Management, Usability, IFU)
**When** an external document version changes
**Then** the system detects version mismatches (FR58c)
**And** impacted CER sections are flagged with an orange warning indicator (FR58d)
**And** the RA Manager can review flagged sections and update references
**And** external document metadata is stored: title, version, date, summary

### Story 5.3: Named Device Literature Search

As an RA Manager,
I want to search competent authority databases for named device vigilance data,
So that I have comprehensive safety data for the CER (FR48, FR48a, FR48b).

**Acceptance Criteria:**

**Given** a CER in progress
**When** the RA Manager creates a Named Device Literature Search
**Then** the system can search competent authority databases: MAUDE (FDA), ANSM (France), BfArM (Germany), AFMPS (Belgium) (FR48a)
**And** vigilance findings from multiple sources are aggregated (FR48b)
**And** search results are displayed in a filterable ag-Grid table
**And** relevant findings can be linked to CER sections
**And** the search runs asynchronously with progress tracking

### Story 5.4: CER Section Assembly & AI-Drafted Narratives

As an RA Manager,
I want to assemble the CER with 14 MDR Annex XIV sections and AI-drafted narratives,
So that I have a structured CER with 80% AI-generated content to refine (FR49, FR50, FR87).

**Acceptance Criteria:**

**Given** a CER with all upstream modules linked
**When** the RA Manager clicks "Assemble CER"
**Then** 14 MDR Annex XIV sections are created (FR49)
**And** AI drafts narrative for each section based on upstream data (SOA sections, validation results, external document summaries) (FR50, FR87)
**And** the assembly progress is shown: "Sections generated: 1/14... 14/14"
**And** AI-drafted sections include inline references to source articles and SOA sections
**And** section generation runs asynchronously via BullMQ queue `cer:draft-section`
**And** the table of contents is interactive with completion status per section (draft, review, finalized)

### Story 5.5: CER Section Review & Finalization

As an RA Manager,
I want to review and finalize AI-drafted CER sections in a rich text editor,
So that I can adjust tone, verify references, and ensure regulatory language quality (FR51).

**Acceptance Criteria:**

**Given** AI-drafted CER sections
**When** the RA Manager opens a section for review
**Then** the section is displayed in a Plate rich text editor with full formatting support (FR51)
**And** inline references [1], [2] are clickable with hover popover showing the source article
**And** AI-generated content is distinguishable from human edits (for acceptance rate tracking)
**And** auto-save every 10 seconds (R3)
**And** section status can be changed: draft → reviewed → finalized
**And** the dashboard shows completion metrics: "12/14 sections finalized | Traceability: 98%"
**And** claims without linked sources are highlighted in orange

### Story 5.6: Traceability Drill-Down & Proof Packages

As an RA Manager or Auditor,
I want to click any CER claim and see the complete source chain in one click,
So that I can instantly justify any claim for audit purposes (FR52, FR77, FR82, FR83, FR84).

**Acceptance Criteria:**

**Given** a CER section with claims
**When** the user clicks on a claim
**Then** the TraceabilityDrillDown panel opens on the right showing the cascade:
  Level 1: CER Claim (statement, section number)
  Level 2: SOA Source (section, extracted data, benchmark)
  Level 3: Validation Study (endpoint, result, comparison)
  Level 4: SLS Article (title, DOI, query that found it) (FR52, FR82)
**And** each level is clickable to navigate to the source
**And** the system enforces 100% traceability — CER cannot be finalized with unlinked claims (FR84, R6)
**And** auditors can export audit trails in CSV or PDF format (FR83)
**And** a "Export Proof Package" button generates a PDF with the complete claim chain + timestamps + audit trail (FR77)
**And** proof package export completes in <30 seconds

### Story 5.7: GSPR Compliance Matrix & Compliance Statement

As an RA Manager,
I want an auto-generated GSPR Compliance Matrix with compliance statement,
So that I can demonstrate compliance with General Safety and Performance Requirements (FR53, FR58o, FR58p).

**Acceptance Criteria:**

**Given** a CER with linked upstream modules
**When** the GSPR matrix is generated
**Then** the system auto-generates a GSPR Compliance Matrix with rows from applicable GSPRs and columns for evidence mapping (FR53)
**And** each GSPR row shows: requirement, status (compliant/partial/not applicable), evidence reference
**And** a GSPR compliance statement is auto-generated from the matrix statuses (FR58o)
**And** the compliance statement is included in the CER document (FR58p)
**And** the matrix is editable for manual adjustments
**And** the matrix is rendered in an ag-Grid with status color coding

### Story 5.8: Benefit-Risk Determination

As an RA Manager,
I want to generate a structured Benefit-Risk Determination,
So that the CER includes a clear analysis of device benefits vs. risks (FR54).

**Acceptance Criteria:**

**Given** SOA benchmarks, validation results, and risk management references
**When** the RA Manager creates the Benefit-Risk Determination
**Then** the system provides a structured template with: identified benefits, identified risks, risk mitigation measures, benefit-risk balance conclusion (FR54)
**And** benefits and risks can be linked to source evidence (SOA, Validation)
**And** the determination is included as a CER section
**And** the template follows MDR Annex XIV requirements

### Story 5.9: Cross-Reference & Bibliography Management

As an RA Manager,
I want automated cross-reference numbering and bibliography compilation,
So that the CER has consistent, accurate references throughout (FR58a, FR58b, FR58e-FR58g).

**Acceptance Criteria:**

**Given** a CER with multiple sections containing references
**When** sections are edited
**Then** cross-references use differentiated numbering: [R1] for external document refs vs [1] for bibliography refs (FR58a)
**And** cross-references auto-renumber when sections are edited (FR58b)
**And** bibliography is compiled from all cited articles across CER sections (FR58e)
**And** bibliography entries are deduplicated (FR58f)
**And** multiple citation output styles are supported: Vancouver, author-year (FR58g)
**And** bibliography is auto-generated and placed at the end of the CER

### Story 5.10: PCCP Deviation Workflow

As an RA Manager,
I want to track deviations from the PCCP with significance thresholds,
So that significant deviations are justified and documented (FR58h, FR58i, FR58j).

**Acceptance Criteria:**

**Given** a CER with a linked PCCP
**When** deviations from the PCCP are identified
**Then** the RA Manager can track deviations with description and justification (FR58h)
**And** deviation significance thresholds can be configured (FR58i)
**And** the system flags significant deviations requiring justification (FR58j)
**And** deviations are included in the CER documentation

### Story 5.11: Evaluator Records & E-Signatures

As an RA Manager,
I want to assign evaluator roles, attach CVs, record COI declarations, and sign documents electronically,
So that the CER meets 21 CFR Part 11 electronic signature requirements (FR58k-FR58n, S5).

**Acceptance Criteria:**

**Given** a CER ready for finalization
**When** evaluator records are configured
**Then** evaluator roles can be assigned per CER section: written_by, verified_by, approved_by (FR58k)
**And** evaluator CVs can be attached to CER metadata (FR58l)
**And** evaluator COI (Conflict of Interest) declarations can be recorded (FR58m)
**And** evaluator metadata and signature trail are displayed (FR58n)
**When** the RA Manager finalizes the CER
**Then** the ESignatureModal requires: password re-entry → bcrypt verify → SHA-256 hash of document content → timestamp + userId logged (S5)
**And** the modal displays: document name, action, legal statement "This signature has the same legal value as a handwritten signature"
**And** successful signature shows a check animation
**And** the signature is immutable and logged in the audit trail

### Story 5.12: CER Version Management

As an RA Manager,
I want to manage CER versions (initial, annual update, patch update) with upstream snapshot locking,
So that each CER version has an immutable evidence chain (FR55, FR55a-FR55d, FR56).

**Acceptance Criteria:**

**Given** a locked CER version
**When** the RA Manager creates an update version
**Then** version types are supported: initial, annual_update, patch_update (FR55)
**And** the system duplicates the previous locked CER as starting point (FR55a)
**And** sections display "unchanged since vN" indicators where applicable (FR55b)
**And** sections requiring updates based on upstream module changes are flagged (FR55c)
**And** a delta summary shows what changed between CER versions (FR55d)
**And** upstream dependencies are locked as immutable snapshots per CER version using JSON serialization + SHA-256 checksum (FR56, R4)
**And** version snapshots are stored in the version_snapshots table

### Story 5.13: Multi-Format DOCX Export & CER Locking

As an RA Manager,
I want to export the CER in multiple DOCX formats and lock it as final,
So that I have submission-ready documents for regulatory authorities (FR57, FR58).

**Acceptance Criteria:**

**Given** a CER with all sections finalized and 100% traceability
**When** the RA Manager clicks "Export"
**Then** the following DOCX documents can be generated: 20.CER (main report), CEP, PCCP, GSPR Table (FR57)
**And** CER generation (100+ pages) completes in <2 minutes (P4)
**And** documents are generated using the hybrid Carbone.io + docx npm engine
**And** exports are available for download
**When** the RA Manager clicks "Finalize CER"
**Then** the ESignatureModal is shown for final approval
**And** upon signing, the CER status changes to "locked" (immutable) (FR58)
**And** the lock triggers domain event `cer.version.locked` via RabbitMQ
**And** the pipeline progress bar updates: CER node → "completed"
**And** the PMS module is unblocked

## Epic 6: Post-Market Surveillance (PMS)

RA Managers and Clinical Specialists can manage the complete post-market surveillance lifecycle: PMS Plan configuration, Gap Registry auto-populated from upstream modules, PMS Cycles with PMCF activities (literature updates, vigilance searches, surveys, complaints, trend analysis), PMCF Report and PSUR generation in DOCX, CER Update Decision documentation, and regulatory loop closure feeding findings back into CER updates.

### Story 6.1: PMS Plan Configuration & Management

As an RA Manager,
I want to configure PMS Plans with update frequency, data collection methods, and responsibility assignments,
So that post-market surveillance activities are planned and structured (FR59, FR59a-FR59e).

**Acceptance Criteria:**

**Given** a project with a locked CER
**When** the RA Manager creates a PMS Plan
**Then** the plan includes: update frequency, data collection methods (FR59)
**And** vigilance databases can be configured per PMS Plan (FR59a)
**And** vigilance search keywords can be defined per similar device (FR59b)
**And** survey templates can be linked to the PMS Plan (FR59c)
**And** PMS Plan statuses are managed: draft → approved → active (FR59d)
**And** a Responsibilities table can be defined per PMS activity (FR59e)
**And** the Prisma schema for PMS entities is created (PmsPlan, PmcfPlan, GapRegistry, PmsCycle, PmcfActivity, Complaint, TrendAnalysis)
**And** the PMS module dashboard shows plan status and upcoming activities

### Story 6.2: Gap Registry Auto-Population

As an RA Manager,
I want the Gap Registry automatically populated from SOA, Validation, and CER open questions,
So that all knowledge gaps are systematically tracked for PMCF planning (FR60).

**Acceptance Criteria:**

**Given** locked SOA, Validation, and CER modules
**When** the Gap Registry is initialized
**Then** gaps are auto-populated from: SOA open questions, Validation limitations, CER identified uncertainties (FR60)
**And** each gap entry includes: source module, description, severity, recommended PMCF activity
**And** gaps are displayed in a filterable ag-Grid table
**And** gaps can be manually added, edited, or resolved
**And** gap status is tracked: open, in progress, resolved

### Story 6.3: PMS Cycle Creation & Management

As an RA Manager,
I want to create PMS Cycles linked to CER versions,
So that post-market activities are organized by reporting period (FR61).

**Acceptance Criteria:**

**Given** an approved PMS Plan
**When** the RA Manager creates a PMS Cycle
**Then** the cycle is linked to a specific CER version (FR61)
**And** the cycle has a reporting period (start date, end date)
**And** PMCF activities from the PMS Plan are templated into the cycle
**And** cycle status is tracked: planned, active, completed
**And** the cycle dashboard shows activity completion progress

### Story 6.4: PMCF Activity Execution & Tracking

As a Clinical Specialist,
I want to execute and track PMCF activities within a PMS Cycle,
So that all post-market data collection is systematically performed (FR62, FR62c).

**Acceptance Criteria:**

**Given** a PMS Cycle with planned activities
**When** the Clinical Specialist executes PMCF activities
**Then** activity types include: Literature Update, Named Device Search, User Surveys, Vigilance Monitoring, Complaints, Installed Base Tracking, Trend Analysis (FR62)
**And** activity completion status is tracked per activity (FR62c)
**And** each completed activity has: summary of findings, data collected, conclusions
**And** activities can be assigned to specific team members
**And** the cycle dashboard shows progress: "5/7 activities completed"

### Story 6.5: Complaints & Incidents Data Import

As a Clinical Specialist,
I want to import complaints and incidents data from Zoho Desk,
So that post-market complaint data is integrated into PMS analysis (FR62a).

**Acceptance Criteria:**

**Given** a PMS Cycle with complaint monitoring activity
**When** the Clinical Specialist imports complaint data
**Then** complaints and incidents can be entered manually or imported from Zoho Desk API (FR62a)
**And** complaint classification follows IMDRF standards
**And** each complaint includes: date, description, device identifier, severity, resolution
**And** import can be done via manual entry or API sync

### Story 6.6: Trend Analysis Computation

As an RA Manager,
I want the system to compute trend analysis from complaints, incidents, and installed base data,
So that I can identify emerging safety signals (FR62b).

**Acceptance Criteria:**

**Given** complaint data, incident data, and installed base metrics
**When** trend analysis is computed
**Then** the system calculates trends over time for: complaint rates, incident rates, device performance metrics (FR62b)
**And** trends are visualized in charts (line charts for rates over time)
**And** statistically significant changes are highlighted
**And** trend data feeds into the PSUR and CER Update Decision

### Story 6.7: PMCF Report Generation

As an RA Manager,
I want to generate a PMCF Report aggregating all clinical PMCF activities,
So that I have a submission-ready report on post-market clinical follow-up (FR63).

**Acceptance Criteria:**

**Given** a PMS Cycle with completed PMCF activities
**When** the RA Manager clicks "Generate PMCF Report"
**Then** a PMCF Report (DOCX) is generated aggregating all clinical PMCF activities (FR63)
**And** the report includes: activity summaries, findings, conclusions, recommendations
**And** generation uses the DOCX template engine (Carbone.io)
**And** generation runs asynchronously with progress tracking

### Story 6.8: PSUR Generation

As an RA Manager,
I want to generate a PSUR as the comprehensive annual report,
So that I have a complete periodic safety update for regulatory authorities (FR64, FR64a).

**Acceptance Criteria:**

**Given** a completed PMS Cycle with all activities and trend analysis
**When** the RA Manager clicks "Generate PSUR"
**Then** a PSUR (DOCX) is generated as the comprehensive annual report (FR64)
**And** the PSUR includes: PMCF results, trend analysis, complaint summary, benefit-risk re-assessment, conclusions (FR64a)
**And** no separate "PMS Report" exists — PSUR is the comprehensive report (FR64a clarification)
**And** generation uses the DOCX template engine
**And** generation runs asynchronously with progress tracking

### Story 6.9: CER Update Decision & Regulatory Loop Closure

As an RA Manager,
I want to document CER Update Decisions based on PMS findings and close the regulatory loop,
So that the device's clinical evaluation is continuously maintained (FR65, FR66, FR67).

**Acceptance Criteria:**

**Given** a completed PSUR with trend analysis and benefit-risk re-assessment
**When** the RA Manager documents the CER Update Decision
**Then** the decision includes: benefit-risk re-assessment, conclusion (update required / not required), justification (FR65)
**And** the Gap Registry is updated based on PMS findings (new gaps identified, existing gaps resolved) (FR66)
**And** if the PSUR identifies material changes, the system can trigger a CER version update (FR67)
**And** the CER update creates a new version (annual_update or patch_update) linked to the PMS findings
**And** updated gaps feed into the next PMCF planning cycle (regulatory loop closure)
**And** the pipeline progress bar shows the full cycle: SLS ✓ → SOA ✓ → Validation ✓ → CER ✓ → PMS ✓
**And** a success notification confirms: "PMS Cycle completed. Regulatory loop closed."
