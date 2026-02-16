# Story 1.1: Initialize Turborepo Monorepo & Development Environment

Status: done

## Story

As a developer,
I want to initialize the project from a custom Turborepo monorepo with the complete workspace structure,
So that the team has a consistent, well-structured codebase to build upon.

## Acceptance Criteria

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

## Tasks / Subtasks

### Phase 1: Turborepo Scaffold & Workspace Structure

- [ ] **T1.1** Initialize Turborepo monorepo: `npx create-turbo@latest cortex-clinical-affairs --package-manager pnpm`
  - AC: project initialized with pnpm
- [ ] **T1.2** Restructure into target layout — create all directories under `apps/` and `packages/`
  - Create `apps/api/`, `apps/web/`, `apps/workers/`
  - Create `packages/prisma/`, `packages/shared/`, `packages/ui/`, `packages/config-eslint/`, `packages/config-typescript/`, `packages/config-tailwind/`
  - AC: target structure matches architecture
- [ ] **T1.3** Configure `pnpm-workspace.yaml` with workspace globs
  - AC: pnpm workspaces configured

### Phase 2: TypeScript Configuration

- [ ] **T2.1** Create shared TypeScript configs in `packages/config-typescript/`
  - `base.json` — strict mode, target ESNext, moduleResolution bundler, skipLibCheck, noUncheckedIndexedAccess
  - `react.json` — extends base, jsx preserve, React 19 types
  - `node.json` — extends base, module NodeNext, target ES2022
  - AC: TypeScript 5.7+ strict mode across all workspaces
- [ ] **T2.2** Create per-workspace `tsconfig.json` files extending shared configs
  - `apps/api/tsconfig.json` extends node.json
  - `apps/web/tsconfig.json` extends react.json
  - `apps/workers/tsconfig.json` extends node.json
  - Each package gets its own tsconfig extending the appropriate base

### Phase 3: Linting & Formatting

- [ ] **T3.1** Configure shared ESLint config in `packages/config-eslint/`
  - Include TypeScript rules (`@typescript-eslint/recommended`)
  - Include no-console rule for production code
  - React-specific rules for apps/web
  - AC: ESLint configured with shared configs
- [ ] **T3.2** Configure Prettier with `.prettierrc` at root
  - Semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100, tabWidth: 2
  - AC: Prettier configured
- [ ] **T3.3** Configure commitlint with `commitlint.config.js`
  - Conventional commits format (feat, fix, chore, docs, refactor, test, ci)
  - AC: commitlint configured

### Phase 4: Git Hooks

- [ ] **T4.1** Install and configure Husky
  - `pre-commit` hook runs lint-staged
  - `commit-msg` hook runs commitlint
  - AC: Husky pre-commit hooks run lint-staged
- [ ] **T4.2** Configure lint-staged in root package.json
  - `*.{ts,tsx}` — eslint --fix, prettier --write
  - `*.{json,md,yaml}` — prettier --write

### Phase 5: Workspace Package Setup

- [ ] **T5.1** Set up `apps/api/package.json` with initial dependencies placeholder
  - Name: `@cortex/api`
  - Include a minimal `src/server.ts` placeholder
- [ ] **T5.2** Set up `apps/web/package.json` with initial dependencies placeholder
  - Name: `@cortex/web`
  - Include a minimal `src/main.tsx` placeholder
- [ ] **T5.3** Set up `apps/workers/package.json` with initial dependencies placeholder
  - Name: `@cortex/workers`
  - Include a minimal `src/index.ts` placeholder
- [ ] **T5.4** Set up `packages/prisma/package.json`
  - Name: `@cortex/prisma`
  - Create `schema/` directory structure (empty schema files for now)
- [ ] **T5.5** Set up `packages/shared/package.json`
  - Name: `@cortex/shared`
  - Create `src/` directory with `types/`, `schemas/`, `constants/`, `utils/` directories
  - Include minimal `src/index.ts` barrel export
- [ ] **T5.6** Set up `packages/ui/package.json`
  - Name: `@cortex/ui`
  - Create `src/index.ts` placeholder
- [ ] **T5.7** Set up `packages/config-tailwind/package.json`
  - Name: `@cortex/config-tailwind`
  - Create `tailwind.config.ts` placeholder

### Phase 6: Turborepo Pipeline Configuration

- [ ] **T6.1** Configure `turbo.json` with build pipeline
  - `build` — depends on `^build` (workspace dependencies)
  - `lint` — no dependencies
  - `test` — depends on `^build`
  - `dev` — persistent, no cache
  - AC: `pnpm build` completes successfully across all workspaces
- [ ] **T6.2** Add root `package.json` scripts
  - `dev` — turbo dev
  - `build` — turbo build
  - `lint` — turbo lint
  - `test` — turbo test
  - `clean` — turbo clean

### Phase 7: Docker Compose & Environment

- [ ] **T7.1** Create `docker/docker-compose.yml` for local development
  - PostgreSQL 16 (port 5432, db: cortex_dev, user/password from env)
  - Redis 7 (port 6379)
  - RabbitMQ 3 with management plugin (ports 5672, 15672)
  - MinIO (ports 9000, 9001) for S3-compatible object storage
  - Volume mounts for data persistence
  - AC: Docker Compose file created for local development
- [ ] **T7.2** Create `docker/docker-compose.test.yml` for CI test environment
  - Same services as dev but with ephemeral volumes
- [ ] **T7.3** Create `.env.example` documenting all required environment variables
  - DATABASE_URL, REDIS_URL, RABBITMQ_URL
  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  - JWT_SECRET, JWT_REFRESH_SECRET
  - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
  - LLM_PROVIDER, OPENAI_API_KEY, ANTHROPIC_API_KEY
  - NODE_ENV, PORT, LOG_LEVEL
  - AC: .env.example documents all required environment variables
- [ ] **T7.4** Create `.gitignore` with proper exclusions
  - node_modules, dist, .env, .turbo, prisma generated client, coverage

### Phase 8: GitHub Configuration

- [ ] **T8.1** Create `.github/workflows/ci.yml` — basic CI pipeline
  - pnpm install, lint, build, test across all workspaces
  - Matrix strategy per workspace
  - Turborepo remote caching
  - AC: CI pipeline skeleton
- [ ] **T8.2** Create `.github/CODEOWNERS` and `pull_request_template.md`

### Phase 9: Validation

- [ ] **T9.1** Verify `pnpm install` succeeds with no errors
  - AC: `pnpm install` completes successfully
- [ ] **T9.2** Verify `pnpm build` succeeds across all workspaces
  - AC: `pnpm build` completes successfully
- [ ] **T9.3** Verify `pnpm lint` runs across all workspaces
- [ ] **T9.4** Verify Docker Compose services start successfully
  - `docker compose -f docker/docker-compose.yml up -d`
  - Verify PostgreSQL, Redis, RabbitMQ, MinIO are healthy

## Dev Notes

### Tech Stack & Versions

| Technology  | Version | Package                                                                   |
| ----------- | ------- | ------------------------------------------------------------------------- |
| Turborepo   | 2.6.x   | `turbo`                                                                   |
| TypeScript  | 5.7.x   | `typescript`                                                              |
| pnpm        | 9.x     | N/A (global)                                                              |
| Node.js     | 20 LTS+ | N/A (runtime)                                                             |
| ESLint      | latest  | `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` |
| Prettier    | latest  | `prettier`                                                                |
| Husky       | latest  | `husky`                                                                   |
| lint-staged | latest  | `lint-staged`                                                             |
| commitlint  | latest  | `@commitlint/cli`, `@commitlint/config-conventional`                      |
| PostgreSQL  | 16.x    | Docker image `postgres:16`                                                |
| Redis       | 7.x     | Docker image `redis:7`                                                    |
| RabbitMQ    | 3.x     | Docker image `rabbitmq:3-management`                                      |
| MinIO       | latest  | Docker image `minio/minio`                                                |

### Naming Conventions

- **Workspace names**: `@cortex/api`, `@cortex/web`, `@cortex/workers`, `@cortex/prisma`, `@cortex/shared`, `@cortex/ui`, `@cortex/config-eslint`, `@cortex/config-typescript`, `@cortex/config-tailwind`
- **Directories**: kebab-case (`config-eslint/`, `config-typescript/`)
- **Files**: kebab-case.ts for non-component files
- **Commits**: conventional commits format (`feat:`, `fix:`, `chore:`, etc.)

### Project Structure Notes

The complete target monorepo structure from architecture:

```
cortex-clinical-affairs/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .husky/
│   ├── pre-commit
│   └── commit-msg
├── apps/
│   ├── api/                    # Fastify 5 + Apollo Server 4 + Prisma 7
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── server.ts       # Placeholder
│   ├── web/                    # React 19 + Vite + Tailwind
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── main.tsx        # Placeholder
│   └── workers/                # BullMQ 5 processors
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts        # Placeholder
├── packages/
│   ├── prisma/
│   │   ├── package.json
│   │   └── schema/             # Multi-file Prisma schema directory
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       ├── schemas/
│   │       ├── constants/
│   │       └── utils/
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
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
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.test.yml
├── e2e/                        # Placeholder for Playwright E2E tests
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc.js
└── commitlint.config.js
```

### Anti-Patterns to Avoid

- Do NOT use `npm` or `yarn` — the project requires `pnpm 9.x` exclusively
- Do NOT use `any` in TypeScript — configure strict mode with `noImplicitAny: true`
- Do NOT use `console.log` — even in placeholder files, use structured logger patterns
- Do NOT add runtime dependencies to config packages — they are configuration-only
- Do NOT create deep nested workspace structures — keep it flat as shown above
- Do NOT skip the `.env.example` — every environment variable must be documented

### Important Implementation Notes

1. **Initialization order**: Run `npx create-turbo@latest` first, then restructure. Do not try to create the structure manually from scratch.
2. **pnpm-workspace.yaml** must include: `packages: ['apps/*', 'packages/*']`
3. **TypeScript strict mode** flags to enable: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`
4. **Placeholder files** in each app should be minimal — just enough for `tsc` to compile successfully. They will be replaced in subsequent stories.
5. **Docker Compose** should use named volumes for data persistence and health checks for service readiness.
6. **CI workflow** should use Turborepo's remote caching (`--filter` and `--cache-dir`) for build optimization.

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Starter Template Evaluation, Complete Project Directory Structure)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.1)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
