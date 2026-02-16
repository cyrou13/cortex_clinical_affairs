# Story 2.5: LLM Abstraction Layer & AI Configuration

Status: done

## Story

As an admin,
I want to configure which LLM provider is used for each AI task type with cost optimization,
So that we can control AI costs and switch providers as needed (FR19n, FR19o).

## Acceptance Criteria

**Given** supported LLM providers: Claude API, OpenAI (GPT-4), Ollama (local)
**When** an admin configures LLM backends
**Then** LLM providers can be set at 3 levels: system default, project override, per-task override (FR19n)
**And** cost-optimization strategy is applied for LLM selection (FR19o)
**And** the abstraction layer provides a unified interface for all AI tasks (scoring, extraction, drafting)
**And** LLM results are cached in Redis (same prompt + same article = cached response)
**And** rate limiting is applied per LLM provider with cost tracking
**And** fallback to manual workflows if LLM service is unavailable
**And** the implementation is in apps/workers/src/shared/llm/ following the architecture structure

## Tasks / Subtasks

### Backend Tasks (Workers)

- [ ] **T1: Create LLM abstraction interface** (`apps/workers/src/shared/llm/llm-abstraction.ts`)
  - Define `LlmProvider` interface:
    ```typescript
    interface LlmProvider {
      name: string;
      complete(prompt: string, options: LlmOptions): Promise<LlmResponse>;
      estimateCost(prompt: string, options: LlmOptions): number;
      isAvailable(): Promise<boolean>;
    }
    interface LlmOptions {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      responseFormat?: 'text' | 'json';
    }
    interface LlmResponse {
      content: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      cost: number;
      model: string;
      provider: string;
      cached: boolean;
      latencyMs: number;
    }
    ```
  - Create `LlmService` class that manages provider selection, caching, rate limiting, fallback
  - **(AC: Unified interface for all AI tasks)**

- [ ] **T2: Create Claude provider** (`apps/workers/src/shared/llm/claude-provider.ts`)
  - Implement `LlmProvider` interface using Anthropic SDK (`@anthropic-ai/sdk`)
  - Model options: `claude-sonnet-4-20250514`, `claude-haiku-4-20250414`
  - API key from environment variable `ANTHROPIC_API_KEY`
  - Rate limiting: track requests per minute per model
  - Cost calculation: per input/output token pricing
  - **(AC: Claude API supported)**

- [ ] **T3: Create OpenAI provider** (`apps/workers/src/shared/llm/openai-provider.ts`)
  - Implement `LlmProvider` interface using OpenAI SDK (`openai`)
  - Model options: `gpt-4o`, `gpt-4o-mini`
  - API key from environment variable `OPENAI_API_KEY`
  - Rate limiting: track requests per minute
  - Cost calculation: per token pricing
  - **(AC: OpenAI GPT-4 supported)**

- [ ] **T4: Create Ollama provider** (`apps/workers/src/shared/llm/ollama-provider.ts`)
  - Implement `LlmProvider` interface using Ollama REST API
  - Endpoint from environment variable `OLLAMA_URL` (default `http://localhost:11434`)
  - Model options: configurable (e.g., `llama3`, `mistral`)
  - Cost: $0 (local), no rate limiting needed
  - Availability check: ping Ollama endpoint
  - **(AC: Ollama local supported)**

- [ ] **T5: Create cost tracker** (`apps/workers/src/shared/llm/cost-tracker.ts`)
  - Track per-request cost: provider, model, tokens used, cost in USD
  - Aggregate cost per project, per task type, per time period
  - Store cost records in database (LlmCostRecord model in Prisma)
  - **(AC: Cost tracking)**

- [ ] **T6: Create Redis caching layer for LLM results**
  - Cache key: SHA-256 hash of `prompt + model + systemPrompt`
  - Cache value: `LlmResponse` serialized to JSON
  - TTL: 24 hours (configurable per task type)
  - Check cache before calling LLM provider
  - Store result in cache after successful call
  - **(AC: LLM results cached in Redis)**

- [ ] **T7: Create cost-optimization strategy** (`apps/workers/src/shared/llm/cost-optimizer.ts`)
  - Task type -> recommended model mapping:
    - `scoring`: cheap model (GPT-4o-mini, Claude Haiku) — high volume, simple task
    - `extraction`: medium model (GPT-4o, Claude Sonnet) — needs accuracy
    - `drafting`: capable model (GPT-4o, Claude Sonnet) — needs quality
    - `metadata_extraction`: cheap model — structured data extraction
  - Select provider based on: availability, cost, configured override
  - Fallback chain: primary provider -> secondary provider -> manual workflow
  - **(AC: Cost-optimization strategy applied)**

- [ ] **T8: Create rate limiter per LLM provider** (`apps/workers/src/shared/llm/rate-limiter.ts`)
  - Token bucket rate limiter per provider
  - Claude: 50 requests/minute (configurable)
  - OpenAI: 60 requests/minute (configurable)
  - Ollama: no limit (local)
  - Queue requests when rate limit hit (with BullMQ job delay)
  - **(AC: Rate limiting per provider)**

### Backend Tasks (API)

- [ ] **T9: Create LLM configuration Prisma models**
  - Add to `shared.prisma` or create `llm.prisma`:
    - `LlmConfig` model: id, level (SYSTEM/PROJECT/TASK), projectId?, taskType?, provider, model, isActive, createdAt, updatedAt
    - `LlmCostRecord` model: id, projectId, taskType, provider, model, promptTokens, completionTokens, costUsd, createdAt
  - Run migration
  - **(AC: Configuration at 3 levels)**

- [ ] **T10: Create LLM configuration use cases** (`apps/api/src/modules/sls/application/use-cases/` or shared)
  - `configure-llm.ts`: Set LLM config at system/project/task level
  - Resolution order: task override -> project override -> system default
  - Validate provider name and model name
  - **(AC: 3-level configuration)**

- [ ] **T11: Create GraphQL types and resolvers for LLM config**
  - `queries.ts`: `llmConfig(projectId?, taskType?)` — resolved config for a given context
  - `mutations.ts`: `updateLlmConfig(input)` — Admin only
  - Apply RBAC: Admin only for configuration
  - **(AC: Admin configures LLM backends)**

- [ ] **T12: Create LLM config API endpoint** (`apps/api/src/config/llm.ts`)
  - Environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_URL`
  - Default config loaded from env, overridable via database
  - **(AC: Configuration management)**

### Frontend Tasks

- [ ] **T13: Create LLM configuration admin page** (`apps/web/src/features/auth/components/LlmConfigPanel.tsx` or admin route)
  - System-level config: default provider, default model per task type
  - Project-level overrides
  - Per-task overrides
  - Provider status indicator (available/unavailable)
  - Cost dashboard: total spend per project, per task type
  - **(AC: Admin configuration UI)**

- [ ] **T14: Create provider health indicator component**
  - Show green/red dot per provider
  - Auto-check availability on page load
  - **(AC: Fallback awareness)**

### Testing Tasks

- [ ] **T15: Write unit tests for LLM abstraction layer**
  - Test provider selection based on config levels
  - Test cost optimization strategy
  - Test fallback chain (primary fails -> secondary)
  - Test cache hit/miss behavior

- [ ] **T16: Write unit tests for each provider**
  - Mock API calls
  - Test response parsing
  - Test error handling (API timeout, rate limit, auth failure)
  - Test cost calculation

- [ ] **T17: Write unit tests for rate limiter**
  - Test token bucket algorithm
  - Test rate limit enforcement
  - Test queue behavior when limit hit

## Dev Notes

### Tech Stack (Exact Versions)

- **LLM SDKs**: `@anthropic-ai/sdk` (latest), `openai` (latest), HTTP client for Ollama
- **Caching**: Redis 7.x (shared instance with BullMQ)
- **Workers**: BullMQ 5.69 for rate-limited job processing
- **Hashing**: Node.js built-in `crypto` for SHA-256 cache keys
- **Backend**: Fastify 5.7, Prisma 7.2

### LLM Provider Configuration

Environment variables:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_URL=http://localhost:11434
LLM_DEFAULT_PROVIDER=claude
LLM_DEFAULT_SCORING_MODEL=claude-haiku-4-20250414
LLM_DEFAULT_EXTRACTION_MODEL=claude-sonnet-4-20250514
LLM_DEFAULT_DRAFTING_MODEL=claude-sonnet-4-20250514
LLM_CACHE_TTL_SECONDS=86400
```

### Cost Optimization Strategy

| Task Type             | Recommended Model          | Est. Cost per Article | Rationale                             |
| --------------------- | -------------------------- | --------------------- | ------------------------------------- |
| `scoring`             | Claude Haiku / GPT-4o-mini | ~$0.001               | Simple relevance scoring, high volume |
| `extraction`          | Claude Sonnet / GPT-4o     | ~$0.01                | Structured data extraction from PDFs  |
| `drafting`            | Claude Sonnet / GPT-4o     | ~$0.05                | Quality narrative generation          |
| `metadata_extraction` | Claude Haiku / GPT-4o-mini | ~$0.0005              | Title/author extraction from PDFs     |

### Redis Cache Design

Cache key format: `llm:cache:{sha256(prompt + model + systemPrompt)}`
Cache value: JSON-serialized `LlmResponse`
TTL: 24h default, configurable per task type

Redis connection: shared instance with BullMQ (same `REDIS_URL`), different key prefix `llm:cache:` vs `bull:` prefix.

### Architecture Patterns

- LLM abstraction lives in `apps/workers/src/shared/llm/` — shared by all worker processors
- The API server does NOT call LLM directly — it enqueues jobs, workers call LLM
- Configuration stored in database, resolved at runtime with 3-level override
- Domain event `llm.config.updated` emitted when config changes
- Cost records written to database for reporting

### Fallback Strategy

```
1. Try primary provider (configured for task type)
2. If unavailable/error -> try secondary provider
3. If all providers fail -> mark task as "manual_required"
4. Emit domain event "llm.fallback.triggered" for monitoring
```

The frontend shows a warning when manual fallback is needed: "AI service temporarily unavailable. Please review this article manually."

### Anti-Patterns to Avoid

- Do NOT call LLM providers from GraphQL resolvers — always through workers
- Do NOT hardcode model names — always use configuration
- Do NOT ignore cost tracking — every LLM call must be tracked
- Do NOT skip cache check — always check Redis before calling LLM
- Do NOT expose API keys in GraphQL responses or frontend code
- No `console.log` — structured logger with provider/model/cost metadata

### Project Structure Notes

**Worker files to create:**

- `apps/workers/src/shared/llm/llm-abstraction.ts` (NEW)
- `apps/workers/src/shared/llm/claude-provider.ts` (NEW)
- `apps/workers/src/shared/llm/openai-provider.ts` (NEW)
- `apps/workers/src/shared/llm/ollama-provider.ts` (NEW)
- `apps/workers/src/shared/llm/cost-tracker.ts` (NEW)
- `apps/workers/src/shared/llm/cost-optimizer.ts` (NEW)
- `apps/workers/src/shared/llm/rate-limiter.ts` (NEW)

**Backend files to create/modify:**

- `packages/prisma/schema/shared.prisma` (MODIFY — add LlmConfig, LlmCostRecord models)
- `apps/api/src/config/llm.ts` (NEW)
- `apps/api/src/modules/sls/graphql/types.ts` (MODIFY — add LlmConfig types if shared)

**Frontend files to create:**

- `apps/web/src/routes/_authenticated/admin/llm-config.tsx` (NEW) or integrated in admin settings
- Component for LLM config management

**Shared files:**

- `packages/shared/src/types/llm.ts` (NEW — shared LLM type definitions)

### References

- Epic definition: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 2.5)
- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (LLM Abstraction Layer section)
- UX Design: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
