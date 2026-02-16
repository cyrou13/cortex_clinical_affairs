# LLM Integration Implementation Summary

## Overview

Implemented real LLM integrations in BullMQ workers that previously had placeholder/stub LLM calls. All workers now use the centralized LLM abstraction layer created in Story 2.5.

## Files Modified

### 1. SOA Workers - LLM Integration

#### `/apps/workers/src/processors/soa/assess-quality.ts` ✅ NEW

- **Purpose**: AI-powered quality assessment of scientific articles
- **LLM Task Type**: `scoring`
- **Features**:
  - Evaluates articles against configurable quality criteria
  - Generates structured quality assessments (overall quality, scores per criterion, strengths/weaknesses)
  - Zod validation for LLM response parsing
  - Proper error handling and progress reporting
  - Supports cancellation between articles
- **Key Methods**:
  - `buildSystemPrompt()`: Creates expert quality assessment instructions
  - `buildUserPrompt()`: Includes article metadata, content, and extracted grid data
  - `parseAndValidateAssessment()`: Validates JSON response with Zod schema
  - `persistQualityAssessment()`: Stores assessment in `ArticleQualityAssessment` table
- **LLM Config**:
  - Response format: JSON
  - Temperature: 0.2 (low for consistent scoring)
  - Max tokens: 3000

#### `/apps/workers/src/processors/soa/draft-narrative.ts` ✅ UPDATED

- **Purpose**: AI-generated narrative synthesis from multiple articles
- **LLM Task Type**: `drafting`
- **Features**:
  - Synthesizes evidence from multiple research articles
  - Generates structured narrative with sections, paragraphs, and key findings
  - Converts LLM JSON response to TipTap document format
  - Includes article metadata, extracted data, and quality assessments in prompt
  - Zod validation for response parsing
  - Limits to 50 articles to prevent prompt overflow
- **Key Methods**:
  - `buildSystemPrompt()`: Medical writing expert instructions
  - `buildUserPrompt()`: Comprehensive context with articles, SOA scope, and quality assessments
  - `parseAndValidateNarrative()`: Zod schema validation
  - `convertToTipTapFormat()`: Converts structured JSON to TipTap editor format
- **LLM Config**:
  - Response format: JSON
  - Temperature: 0.7 (higher for creative synthesis)
  - Max tokens: 4096

#### `/apps/workers/src/processors/soa/extract-grid-data.ts` ✅ ALREADY IMPLEMENTED

- **Purpose**: AI extraction of structured data from scientific articles
- **LLM Task Type**: `extraction`
- **Status**: Already had full LLM integration (no changes needed)
- **Features**: Extracts grid column data with confidence scores

### 2. Test Files

#### `/apps/workers/src/processors/soa/assess-quality.test.ts` ✅ NEW

- 6 test cases covering:
  - Successful quality assessment processing
  - Skipping articles without PDF text
  - LLM error handling
  - Cancellation support
  - Zod schema validation
  - Progress reporting

#### `/apps/workers/src/processors/soa/draft-narrative.test.ts` ✅ NEW

- 8 test cases covering:
  - Successful narrative generation
  - Section/SOA analysis not found errors
  - TipTap format conversion
  - Zod schema validation
  - Article limit enforcement
  - Prompt content verification
  - Progress reporting at all stages

### 3. Worker Initialization

#### `/apps/workers/src/index.ts` ✅ UPDATED

- **LLM Provider Setup**:
  - Initializes OpenAI, Claude, and Ollama providers based on environment variables
  - Creates provider map for LLM service
- **Config Resolver**:
  - Implements 3-level config resolution (TASK > PROJECT > SYSTEM)
  - Queries `llmConfig` table in database
  - Fallback to environment-based defaults
- **LLM Service**:
  - Single shared instance for all workers
  - Includes caching, rate limiting, and cost tracking
- **Processor Initialization**:
  - `ExtractGridDataProcessor`: Now gets `prisma` and `llmService` dependencies
  - `AssessQualityProcessor`: New processor with full dependencies
  - `DraftNarrativeProcessor`: Updated with `prisma` and `llmService` dependencies

## LLM Abstraction Layer Architecture

### Core Components Used

1. **LlmService** (`apps/workers/src/shared/llm/llm-abstraction.ts`)
   - Main service class with `complete()` method
   - Handles provider selection, caching, rate limiting, cost tracking
   - Config resolution via database queries

2. **Providers**
   - `OpenAIProvider`: GPT-4o, GPT-4o-mini
   - `ClaudeProvider`: Claude Sonnet 4, Claude Haiku 4
   - `OllamaProvider`: Self-hosted local models

3. **Supporting Services**
   - `LlmCache`: Redis-based caching (24h TTL)
   - `RateLimiter`: Per-provider rate limits (50-60 req/min)
   - `CostTracker`: Tracks usage and costs per project/task

4. **Task Types**
   - `scoring`: Quality assessment, article scoring
   - `extraction`: Data extraction from documents
   - `drafting`: Narrative generation, document drafting
   - `metadata_extraction`: Metadata extraction

## Key Implementation Patterns

### 1. Zod Validation

All LLM JSON responses are validated with Zod schemas:

```typescript
const QualityAssessmentSchema = z.object({
  overallQuality: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  overallScore: z.number().min(0).max(100),
  criteria: z.record(
    z.string(),
    z.object({
      score: z.number().min(0).max(100),
      rating: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
      justification: z.string(),
      concerns: z.array(z.string()).optional(),
    }),
  ),
  // ...
});
```

### 2. Proper Import Extensions

All TypeScript imports use `.js` extension (NodeNext module resolution):

```typescript
import { LlmService } from '../../shared/llm/llm-abstraction.js';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';
```

### 3. Progress Reporting

All processors report progress at key stages:

```typescript
await this.reportProgress(job, 40, {
  message: 'Generating AI narrative draft...',
});
```

### 4. Error Handling

Graceful error handling with detailed error messages:

```typescript
try {
  const response = await this.llmService.complete(taskType, prompt, options, projectId);
  // Process response...
} catch (error: any) {
  throw new Error(`Failed to generate narrative: ${error.message}`);
}
```

### 5. Cancellation Support

Check for cancellation between processing articles:

```typescript
const cancelled = await this.checkCancellation(job);
if (cancelled) {
  await this.reportProgress(job, processed / total, {
    message: `Processing cancelled. Processed ${processed}/${total} items.`,
  });
  break;
}
```

## Test Results

All tests passing:

```
 Test Files  29 passed (29)
      Tests  351 passed (351)
   Duration  2.42s
```

TypeScript compilation: ✅ Success (no errors)

## Database Schema Requirements

The workers expect these Prisma models (ungenerated):

1. **LlmConfig**: Configuration for LLM providers per task/project/system
   - Fields: `level`, `taskType`, `projectId`, `provider`, `model`, `isActive`

2. **GridCell**: Extracted data storage
   - Fields: `extractionGridId`, `articleId`, `gridColumnId`, `value`, `aiExtractedValue`, `confidenceLevel`, `confidenceScore`, etc.

3. **ArticleQualityAssessment**: Quality assessment results
   - Fields: `extractionGridId`, `articleId`, `overallQuality`, `overallScore`, `criteriaScores`, `strengths`, `weaknesses`, `recommendation`

4. **ThematicSection**: Narrative storage
   - Fields: `id`, `title`, `sectionKey`, `description`, `narrativeAiDraft`

## Environment Variables Required

```bash
# At least one provider must be configured:
OPENAI_API_KEY=sk-...                    # For OpenAI GPT-4o
ANTHROPIC_API_KEY=sk-ant-...            # For Claude
OLLAMA_URL=http://localhost:11434      # For local Ollama

# Redis (required for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# Database (required for config resolution)
DATABASE_URL=postgresql://...
```

## Next Steps / Recommendations

1. **Configuration Setup**: Ensure `llmConfig` table has at least one SYSTEM-level config
2. **Monitoring**: Set up monitoring for LLM costs via `CostTracker`
3. **Rate Limits**: Adjust rate limits in production based on API tier
4. **Model Selection**: Configure optimal models per task type (e.g., GPT-4o-mini for extraction, GPT-4o for drafting)
5. **Prompt Tuning**: Fine-tune system prompts based on real-world results
6. **Caching**: Monitor cache hit rates to optimize costs

## Files Changed Summary

| File                                                      | Status     | Purpose                      |
| --------------------------------------------------------- | ---------- | ---------------------------- |
| `apps/workers/src/processors/soa/assess-quality.ts`       | ✅ NEW     | Quality assessment with LLM  |
| `apps/workers/src/processors/soa/assess-quality.test.ts`  | ✅ NEW     | Tests for quality assessment |
| `apps/workers/src/processors/soa/draft-narrative.ts`      | ✅ UPDATED | Narrative drafting with LLM  |
| `apps/workers/src/processors/soa/draft-narrative.test.ts` | ✅ NEW     | Tests for narrative drafting |
| `apps/workers/src/index.ts`                               | ✅ UPDATED | LLM service initialization   |

## Validation Workers Review

Checked validation workers - no LLM integration needed:

- `fairness-analysis.ts`: Pure algorithmic computation (disparate impact, equalized odds)
- `delta-analysis.ts`: Statistical analysis
- `prepare-report-data.ts`: Data aggregation
- `generate-reports.ts`: Report generation from templates
- `import-xls-data.ts`: Data import

These are all data processing/statistical tasks that don't require LLM capabilities.
