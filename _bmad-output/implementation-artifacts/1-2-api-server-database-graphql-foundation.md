# Story 1.2: API Server, Database & GraphQL Foundation

Status: done

## Story

As a developer,
I want a running Fastify API server with Pothos GraphQL schema and Prisma database connection,
So that we have the backend foundation for all modules.

## Acceptance Criteria

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

## Tasks / Subtasks

### Phase 1: Install Dependencies in apps/api

- [ ] **T1.1** Install Fastify and core plugins
  - `fastify` 5.7.x, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cookie`
  - AC: Fastify 5.7 installed
- [ ] **T1.2** Install Apollo Server and GraphQL tooling
  - `@apollo/server` 4.x, `@as-integrations/fastify` 3.1.x, `graphql` 16.x, `graphql-ws`
  - AC: Apollo Server 4 with @as-integrations/fastify
- [ ] **T1.3** Install Pothos and plugins
  - `@pothos/core` v4, `@pothos/plugin-prisma`, `@pothos/plugin-validation` (Zod), `@pothos/plugin-relay`
  - AC: Pothos schema builder with Prisma plugin
- [ ] **T1.4** Install validation and utility libraries
  - `zod` 3.x, `pino` (structured logging), `pino-pretty` (dev only)
  - AC: Zod and structured logger

### Phase 2: Prisma Schema Setup in packages/prisma

- [ ] **T2.1** Install Prisma 7.2.x in `packages/prisma`
  - `prisma` (dev), `@prisma/client`
  - Configure `prismaSchemaFolder` in `package.json` generator block
  - AC: Prisma 7.2 with multi-file schema support
- [ ] **T2.2** Create `packages/prisma/schema/shared.prisma` — shared models

  ```prisma
  // Generator and datasource configuration
  generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["prismaSchemaFolder"]
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  model AuditLog {
    id          String   @id @default(uuid())
    userId      String
    action      String
    targetType  String
    targetId    String
    before      Json?
    after       Json?
    metadata    Json?
    timestamp   DateTime @default(now())

    @@index([targetType, targetId])
    @@index([userId])
    @@index([timestamp])
  }

  model AsyncTask {
    id          String   @id @default(uuid())
    type        String
    status      String   @default("PENDING") // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    progress    Float    @default(0)
    total       Float?
    result      Json?
    error       String?
    metadata    Json?
    createdBy   String
    startedAt   DateTime?
    completedAt DateTime?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@index([status])
    @@index([createdBy])
  }

  model VersionSnapshot {
    id            String   @id @default(uuid())
    entityType    String
    entityId      String
    version       Int
    data          Json
    checksum      String   // SHA-256
    createdBy     String
    createdAt     DateTime @default(now())

    @@unique([entityType, entityId, version])
    @@index([entityType, entityId])
  }
  ```

  - AC: shared.prisma with AuditLog, AsyncTask, VersionSnapshot

- [ ] **T2.3** Create `packages/prisma/schema/auth.prisma` — auth models

  ```prisma
  model User {
    id              String    @id @default(uuid())
    email           String    @unique
    name            String
    avatarUrl       String?
    googleId        String?   @unique
    passwordHash    String?
    role            UserRole  @default(CLINICAL_SPECIALIST)
    isActive        Boolean   @default(true)
    mfaEnabled      Boolean   @default(false)
    lastLoginAt     DateTime?
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    sessions        Session[]
    mfaDevices      MfaDevice[]
    projectMembers  ProjectMember[]
  }

  model Session {
    id              String    @id @default(uuid())
    userId          String
    refreshToken    String    @unique
    expiresAt       DateTime
    lastActivityAt  DateTime  @default(now())
    ipAddress       String?
    userAgent       String?
    createdAt       DateTime  @default(now())

    user            User      @relation(fields: [userId], references: [id])

    @@index([userId])
    @@index([expiresAt])
  }

  model MfaDevice {
    id          String   @id @default(uuid())
    userId      String
    type        MfaType  // TOTP, WEBAUTHN
    name        String
    secret      String?  // Encrypted TOTP secret
    credentialId String? // WebAuthn credential ID
    publicKey   String?  // WebAuthn public key
    counter     Int?     // WebAuthn counter
    isActive    Boolean  @default(true)
    createdAt   DateTime @default(now())

    user        User     @relation(fields: [userId], references: [id])

    @@index([userId])
  }

  enum UserRole {
    ADMIN
    RA_MANAGER
    CLINICAL_SPECIALIST
    DATA_SCIENCE
    EXECUTIVE
    AUDITOR
  }

  enum MfaType {
    TOTP
    WEBAUTHN
  }
  ```

  - AC: auth.prisma with User, Session, MfaDevice

- [ ] **T2.4** Create `packages/prisma/schema/project.prisma` — project models

  ```prisma
  model Project {
    id               String        @id @default(uuid())
    name             String
    deviceName       String
    deviceClass      String
    regulatoryContext String       // CE_MDR, FDA_510K, BOTH
    status           ProjectStatus @default(ACTIVE)
    createdBy        String
    createdAt        DateTime      @default(now())
    updatedAt        DateTime      @updatedAt

    cep              Cep?
    members          ProjectMember[]
  }

  model Cep {
    id               String   @id @default(uuid())
    projectId        String   @unique
    scope            String?
    objectives       String?
    deviceClassification String?
    clinicalBackground   String?
    searchStrategy       String?
    createdAt        DateTime @default(now())
    updatedAt        DateTime @updatedAt

    project          Project  @relation(fields: [projectId], references: [id])
  }

  model ProjectMember {
    id        String   @id @default(uuid())
    projectId String
    userId    String
    role      String   // Overridden role for this project
    createdAt DateTime @default(now())

    project   Project  @relation(fields: [projectId], references: [id])
    user      User     @relation(fields: [userId], references: [id])

    @@unique([projectId, userId])
    @@index([projectId])
    @@index([userId])
  }

  enum ProjectStatus {
    ACTIVE
    ARCHIVED
    COMPLETED
  }
  ```

  - AC: project.prisma with Project, Cep

- [ ] **T2.5** Create `packages/prisma/schema/audit.prisma` — placeholder for audit-specific extensions (can remain minimal, AuditLog is in shared)
- [ ] **T2.6** Create empty placeholder schema files for future modules
  - `sls.prisma`, `soa.prisma`, `validation.prisma`, `cer.prisma`, `pms.prisma` — each with a comment header only
- [ ] **T2.7** Run `prisma generate` and `prisma migrate dev` successfully
  - AC: Prisma migrations run successfully
- [ ] **T2.8** Create `packages/prisma/seed.ts` with seed data
  - Create admin user, sample project, sample CEP
  - AC: seed data can be loaded

### Phase 3: Domain Error Classes

- [ ] **T3.1** Create `apps/api/src/shared/errors/domain-error.ts`
  ```typescript
  export class DomainError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly extensions?: Record<string, unknown>,
    ) {
      super(message);
      this.name = this.constructor.name;
    }
  }
  ```
- [ ] **T3.2** Create specific error subclasses in `apps/api/src/shared/errors/`
  - `not-found.ts` — `NotFoundError` with code `NOT_FOUND`
  - `permission-denied.ts` — `PermissionDeniedError` with code `PERMISSION_DENIED`
  - `lock-conflict.ts` — `LockConflictError` with code `LOCK_CONFLICT`
  - `validation-error.ts` — `ValidationError` with code `VALIDATION_ERROR`
  - `upstream-not-locked.ts` — `UpstreamNotLockedError` with code `UPSTREAM_NOT_LOCKED`
  - `traceability-violation.ts` — `TraceabilityViolationError` with code `TRACEABILITY_VIOLATION`
  - AC: Domain error classes implemented
- [ ] **T3.3** Create barrel export `apps/api/src/shared/errors/index.ts`

### Phase 4: Structured Logger

- [ ] **T4.1** Create `apps/api/src/shared/utils/logger.ts`
  - Configure Pino logger with JSON output in production, pino-pretty in development
  - Log levels: trace, debug, info, warn, error, fatal
  - Include request context (requestId, userId) when available
  - AC: Structured logger configured (no console.log in production)

### Phase 5: GraphQL Schema Setup

- [ ] **T5.1** Create `apps/api/src/graphql/context.ts` — GraphQL context type
  ```typescript
  export interface GraphQLContext {
    prisma: PrismaClient;
    user: { id: string; role: UserRole } | null;
    requestId: string;
  }
  ```
- [ ] **T5.2** Create `apps/api/src/graphql/scalars.ts` — Custom scalars
  - DateTime (ISO 8601 string), UUID, JSON
  - AC: Custom GraphQL scalars registered
- [ ] **T5.3** Create `apps/api/src/graphql/schema.ts` — Pothos schema builder
  - Configure Pothos with PrismaPlugin, ValidationPlugin (Zod)
  - Wire up custom scalars
  - Create initial `Query.health` field returning server status
  - AC: Pothos schema builder configured with Prisma plugin
- [ ] **T5.4** Configure GraphQL error handling
  - Map DomainError subclasses to GraphQL errors with proper error codes
  - Ensure error codes are passed in `extensions.code`

### Phase 6: Fastify Server Bootstrap

- [ ] **T6.1** Create `apps/api/src/server.ts` — Fastify bootstrap
  - Register CORS, Helmet, rate-limit plugins
  - Register `/health` REST endpoint returning `{ status: 'ok', timestamp: ISO8601 }`
  - AC: `/health` REST endpoint returns server status
- [ ] **T6.2** Integrate Apollo Server with Fastify
  - Use `@as-integrations/fastify` to mount GraphQL at `/graphql`
  - Pass Prisma client and user context to GraphQL resolvers
  - Enable GraphQL Playground in development
  - AC: Fastify 5.7 serves GraphQL endpoint at `/graphql`
- [ ] **T6.3** Create `apps/api/src/config/env.ts` — Environment config with Zod
  - Validate all required environment variables at startup
  - Export typed config object
- [ ] **T6.4** Create `apps/api/src/config/redis.ts` — Redis connection config (placeholder for Story 1.10)
- [ ] **T6.5** Create `apps/api/src/config/rabbitmq.ts` — RabbitMQ connection config (placeholder for Story 1.10)

### Phase 7: Initial DDD Module Structure (Project Module)

- [ ] **T7.1** Create the project module DDD skeleton in `apps/api/src/modules/project/`
  - `domain/entities/project.ts` — Project entity type
  - `domain/entities/cep.ts` — CEP entity type
  - `domain/events/` — placeholder directory
  - `application/use-cases/` — placeholder directory
  - `application/dtos/` — placeholder directory
  - `infrastructure/repositories/project-repository.ts` — basic Prisma repository
  - `graphql/types.ts` — Pothos types for Project, Cep
  - `graphql/queries.ts` — basic query to fetch projects
  - `graphql/mutations.ts` — placeholder
  - AC: DDD structure established for reference
- [ ] **T7.2** Create the auth module DDD skeleton in `apps/api/src/modules/auth/`
  - `domain/entities/user.ts`
  - `infrastructure/repositories/` — placeholder
  - `graphql/types.ts` — Pothos User type
  - `graphql/queries.ts` — `me` query returning current user (stub)

### Phase 8: Shared Package Types

- [ ] **T8.1** Create `packages/shared/src/types/domain-event.ts`
  ```typescript
  export interface DomainEvent<T = unknown> {
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    data: T;
    metadata: {
      userId: string;
      timestamp: string;
      correlationId: string;
      version: number;
    };
  }
  ```
- [ ] **T8.2** Create `packages/shared/src/types/pagination.ts` — Relay-style and offset pagination types
- [ ] **T8.3** Create `packages/shared/src/types/async-task.ts` — AsyncTask status enum and types
- [ ] **T8.4** Create `packages/shared/src/constants/roles.ts` — UserRole enum and permission constants
- [ ] **T8.5** Create `packages/shared/src/utils/uuid.ts` — UUID v7 generation utility

### Phase 9: Testing & Validation

- [ ] **T9.1** Write unit tests for domain error classes
- [ ] **T9.2** Write integration test: API server starts, `/health` returns 200
- [ ] **T9.3** Write integration test: `/graphql` endpoint responds to introspection query
- [ ] **T9.4** Verify `prisma migrate dev` and `prisma db seed` run successfully against Docker PostgreSQL
- [ ] **T9.5** Configure Vitest in `apps/api/vitest.config.ts`

## Dev Notes

### Tech Stack & Versions

| Technology               | Version | Package                    |
| ------------------------ | ------- | -------------------------- |
| Fastify                  | 5.7.x   | `fastify`                  |
| Apollo Server            | 4.x     | `@apollo/server`           |
| @as-integrations/fastify | 3.1.x   | `@as-integrations/fastify` |
| Pothos                   | v4      | `@pothos/core`             |
| @pothos/plugin-prisma    | latest  | `@pothos/plugin-prisma`    |
| Prisma                   | 7.2.x   | `prisma`, `@prisma/client` |
| Zod                      | 3.x     | `zod`                      |
| Pino                     | latest  | `pino`, `pino-pretty`      |
| graphql                  | 16.x    | `graphql`                  |
| graphql-ws               | latest  | `graphql-ws`               |

### Naming Conventions

- **Prisma models**: PascalCase — `model AuditLog`, `model SlsSession`
- **Prisma fields**: camelCase — `createdAt`, `projectId`, `relevanceScore`
- **Prisma enums**: PascalCase name, UPPER_SNAKE_CASE values — `enum UserRole { ADMIN, RA_MANAGER }`
- **GraphQL types**: PascalCase — `type Project`, `type User`
- **GraphQL fields**: camelCase — `relevanceScore`, `screeningDecision`
- **GraphQL queries**: camelCase — `projects(filter)`, `project(id)`
- **GraphQL mutations**: camelCase, action + entity — `createProject`, `updateCep`
- **Error codes**: UPPER_SNAKE_CASE — `NOT_FOUND`, `PERMISSION_DENIED`
- **Files**: kebab-case.ts — `domain-error.ts`, `project-repository.ts`

### DDD Structure Pattern

Every backend module MUST follow this structure:

```
modules/{module}/
├── domain/
│   ├── entities/     # Domain entities, value objects
│   ├── value-objects/
│   └── events/       # Domain event definitions
├── application/
│   ├── use-cases/    # Business logic orchestration
│   └── dtos/         # Data transfer objects
├── infrastructure/
│   ├── repositories/ # Prisma repository implementations
│   └── services/     # External service integrations
└── graphql/
    ├── types.ts      # Pothos type definitions
    ├── queries.ts    # GraphQL queries
    └── mutations.ts  # GraphQL mutations
```

### Anti-Patterns to Avoid

- Do NOT put business logic in GraphQL resolvers — delegate to use cases
- Do NOT call Prisma directly in resolvers — go through repository layer
- Do NOT use `console.log` — use the structured Pino logger
- Do NOT throw raw `new Error()` — always use domain error classes
- Do NOT use `any` in TypeScript — use `unknown` + type guards
- Do NOT create circular imports between modules — use events or shared/
- Do NOT use inline SQL — use Prisma query builder only

### Data Formats

- **Dates**: ISO 8601 strings everywhere — `2026-02-13T14:30:00.000Z`
- **IDs**: UUID v7 (sortable, timestamp-based)
- **JSON fields**: camelCase
- **Booleans**: `true`/`false` (never 1/0)
- **Nulls**: explicit `null` (never `undefined` in API responses)

### Project Structure Notes

Files created/modified by this story:

```
apps/api/
├── package.json                    # New dependencies
├── tsconfig.json                   # Updated
├── vitest.config.ts                # NEW
└── src/
    ├── server.ts                   # NEW — Fastify bootstrap
    ├── graphql/
    │   ├── schema.ts               # NEW — Pothos builder
    │   ├── context.ts              # NEW — GraphQL context type
    │   └── scalars.ts              # NEW — Custom scalars
    ├── modules/
    │   ├── project/
    │   │   ├── domain/entities/project.ts
    │   │   ├── domain/entities/cep.ts
    │   │   ├── infrastructure/repositories/project-repository.ts
    │   │   └── graphql/{types,queries,mutations}.ts
    │   └── auth/
    │       ├── domain/entities/user.ts
    │       └── graphql/{types,queries}.ts
    ├── shared/
    │   ├── errors/
    │   │   ├── domain-error.ts
    │   │   ├── not-found.ts
    │   │   ├── permission-denied.ts
    │   │   ├── lock-conflict.ts
    │   │   ├── validation-error.ts
    │   │   ├── upstream-not-locked.ts
    │   │   ├── traceability-violation.ts
    │   │   └── index.ts
    │   └── utils/
    │       └── logger.ts
    └── config/
        ├── env.ts
        ├── redis.ts
        └── rabbitmq.ts

packages/prisma/
├── package.json                    # NEW dependencies
├── schema/
│   ├── shared.prisma               # NEW
│   ├── auth.prisma                 # NEW
│   ├── project.prisma              # NEW
│   ├── audit.prisma                # NEW (placeholder)
│   ├── sls.prisma                  # NEW (placeholder)
│   ├── soa.prisma                  # NEW (placeholder)
│   ├── validation.prisma           # NEW (placeholder)
│   ├── cer.prisma                  # NEW (placeholder)
│   └── pms.prisma                  # NEW (placeholder)
├── migrations/                     # Generated
└── seed.ts                         # NEW

packages/shared/src/
├── types/
│   ├── domain-event.ts             # NEW
│   ├── pagination.ts               # NEW
│   └── async-task.ts               # NEW
├── constants/
│   └── roles.ts                    # NEW
└── utils/
    └── uuid.ts                     # NEW
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Data Architecture, API & Communication Patterns, Implementation Patterns, Project Structure)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.2)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
