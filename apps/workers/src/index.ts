import { Worker, Queue, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { APP_NAME, APP_VERSION } from '@cortex/shared';
import { getRedis, getRedisUrl, getBullMQConnection, disconnectRedis } from './config/redis.js';
import type { TaskJobData } from './shared/base-processor.js';
import {
  LlmService,
  OpenAIProvider,
  ClaudeProvider,
  OllamaProvider,
  type LlmProvider,
  type ConfigResolver,
  type LlmConfig,
  type TaskType,
} from './shared/llm/index.js';
import { EchoProcessor } from './processors/sample/echo-task.js';
import { ExecuteQueryProcessor } from './processors/sls/execute-query.js';
import { ScoreArticlesProcessor } from './processors/sls/score-articles.js';
import { RetrievePdfsProcessor } from './processors/sls/retrieve-pdfs.js';
import { MineReferencesProcessor } from './processors/sls/mine-references.js';
import { ExtractGridDataProcessor } from './processors/soa/extract-grid-data.js';
import { AssessQualityProcessor } from './processors/soa/assess-quality.js';
import { DraftNarrativeProcessor } from './processors/soa/draft-narrative.js';
import { DraftSectionProcessor } from './processors/cer/draft-section.js';
import { GenerateDocxProcessor } from './processors/cer/generate-docx.js';
import { GenerateReportsProcessor } from './processors/validation/generate-reports.js';
import { ImportXlsDataProcessor } from './processors/validation/import-xls-data.js';
import { GeneratePmcfReportProcessor } from './processors/pms/generate-pmcf-report.js';
import { GeneratePsurProcessor } from './processors/pms/generate-psur.js';
import { CustomFilterScoreProcessor } from './processors/sls/custom-filter-score.js';
import { EnrichAbstractsProcessor } from './processors/sls/enrich-abstracts.js';
import { ImportSoaDocumentProcessor } from './processors/soa/import-soa-document.js';
import { GenerateClaimsProcessor } from './processors/soa/generate-claims.js';

const log = {
  info: (msg: string) => process.stdout.write(`[INFO] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
};

const redis = getRedis();
const bullmqConnection = getBullMQConnection();

// Initialize Prisma
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// LLM providers — API keys are read from the AppSetting table (Settings UI)
// so there is a single source of truth for configuration.
// ---------------------------------------------------------------------------

async function loadApiKeysFromDb(): Promise<{
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  ollamaBaseUrl: string | null;
}> {
  try {
    const settings = await (prisma as any).appSetting.findMany({
      where: { category: 'api_keys' },
    });
    const map = new Map<string, string>(
      settings.map((s: { key: string; value: string }) => [s.key, s.value]),
    );
    return {
      anthropicApiKey: map.get('anthropicApiKey') ?? null,
      openaiApiKey: map.get('openaiApiKey') ?? null,
      ollamaBaseUrl: map.get('ollamaBaseUrl') ?? null,
    };
  } catch {
    log.error('Could not load API keys from DB — falling back to env vars');
    return {
      anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? null,
      openaiApiKey: process.env['OPENAI_API_KEY'] ?? null,
      ollamaBaseUrl: process.env['OLLAMA_BASE_URL'] ?? null,
    };
  }
}

async function initProviders(): Promise<Map<string, LlmProvider>> {
  const keys = await loadApiKeysFromDb();
  const providers = new Map<string, LlmProvider>();

  if (keys.anthropicApiKey) {
    providers.set('claude', new ClaudeProvider(keys.anthropicApiKey));
    log.info('Claude provider initialized (key from DB)');
  }
  if (keys.openaiApiKey) {
    providers.set('openai', new OpenAIProvider(keys.openaiApiKey));
    log.info('OpenAI provider initialized (key from DB)');
  }
  if (keys.ollamaBaseUrl) {
    providers.set('ollama', new OllamaProvider(keys.ollamaBaseUrl));
    log.info(`Ollama provider initialized (${keys.ollamaBaseUrl})`);
  }

  if (providers.size === 0) {
    log.error('WARNING: No LLM provider configured. Go to Settings > API Keys to add one.');
  }

  return providers;
}

// Config resolver that queries database for LLM config
const configResolver: ConfigResolver = async (
  taskType: TaskType,
  projectId?: string,
): Promise<LlmConfig> => {
  try {
    // Try to resolve config from database (TASK > PROJECT > SYSTEM)
    const taskConfig = await prisma.llmConfig.findFirst({
      where: {
        level: 'TASK',
        taskType,
        isActive: true,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (taskConfig) {
      return { provider: taskConfig.provider, model: taskConfig.model };
    }

    if (projectId) {
      const projectConfig = await prisma.llmConfig.findFirst({
        where: {
          level: 'PROJECT',
          projectId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (projectConfig) {
        return { provider: projectConfig.provider, model: projectConfig.model };
      }
    }

    const systemConfig = await prisma.llmConfig.findFirst({
      where: {
        level: 'SYSTEM',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (systemConfig) {
      return { provider: systemConfig.provider, model: systemConfig.model };
    }

    // No DB config — pick the first available provider
    const keys = await loadApiKeysFromDb();
    if (keys.anthropicApiKey) {
      return { provider: 'claude', model: 'claude-sonnet-4-20250514' };
    }
    if (keys.openaiApiKey) {
      return { provider: 'openai', model: 'gpt-4o' };
    }

    throw new Error('No LLM provider configured — add an API key in Settings > API Keys');
  } catch (error) {
    log.error(
      `Error resolving LLM config: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Deferred initialization — providers must be loaded from DB before workers start
// ---------------------------------------------------------------------------

let llmService: LlmService;

async function initLlmService(): Promise<void> {
  const providers = await initProviders();
  llmService = new LlmService(providers, redis, configResolver);
}

function buildProcessors(): Record<
  string,
  { process: (job: Job<TaskJobData>) => Promise<unknown> }
> {
  return {
    'sample.echo': new EchoProcessor(redis),
    'sls.execute-query': new ExecuteQueryProcessor(redis, prisma),
    'sls.score-articles': new ScoreArticlesProcessor(redis, llmService, prisma),
    'sls.retrieve-pdfs': new RetrievePdfsProcessor(redis, prisma),
    'sls.mine-references': new MineReferencesProcessor(redis),
    'soa.extract-grid-data': new ExtractGridDataProcessor(redis, prisma, llmService),
    'soa.assess-quality': new AssessQualityProcessor(redis, prisma, llmService),
    'soa.draft-narrative': new DraftNarrativeProcessor(redis, prisma, llmService),
    'cer.draft-section': new DraftSectionProcessor(redis, undefined as never),
    'cer.generate-docx': new GenerateDocxProcessor(redis),
    'validation.generate-report': new GenerateReportsProcessor(redis) as unknown as {
      process: (job: Job<TaskJobData>) => Promise<unknown>;
    },
    'validation.import-xls': new ImportXlsDataProcessor(redis) as unknown as {
      process: (job: Job<TaskJobData>) => Promise<unknown>;
    },
    'pms.generate-pmcf-report': new GeneratePmcfReportProcessor(redis),
    'pms.generate-psur': new GeneratePsurProcessor(redis),
    'sls.custom-filter-score': (() => {
      const p = new CustomFilterScoreProcessor(redis);
      p.setLlmService(llmService);
      p.setPrisma(prisma);
      return p;
    })(),
    'sls.enrich-abstracts': new EnrichAbstractsProcessor(redis, prisma),
    'soa.import-document': new ImportSoaDocumentProcessor(redis, prisma, llmService),
    'soa.generate-claims': new GenerateClaimsProcessor(redis, prisma, llmService),
  };
}

const workers: Worker[] = [];
const registeredQueues = new Set<string>();

// BullMQ queues for dispatching jobs (lazy-initialized per queue name)
const queues = new Map<string, Queue<TaskJobData>>();

function getQueue(queueName: string): Queue<TaskJobData> {
  let queue = queues.get(queueName);
  if (!queue) {
    queue = new Queue<TaskJobData>(queueName, { connection: bullmqConnection });
    queues.set(queueName, queue);
  }
  return queue;
}

// Subscriber Redis connection (separate from command connection — required by Redis pub/sub)
let subscriberRedis: Redis | null = null;

function startTaskDispatcher(): void {
  subscriberRedis = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  subscriberRedis.subscribe('task:enqueued', (err) => {
    if (err) {
      log.error(`Failed to subscribe to task:enqueued: ${err.message}`);
      return;
    }
    log.info('Subscribed to task:enqueued channel');
  });

  subscriberRedis.on('message', (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as {
        taskId: string;
        type: string;
        status: string;
        metadata: Record<string, unknown>;
        createdBy: string;
      };

      const queueName = event.type;

      if (!registeredQueues.has(queueName)) {
        log.error(`No processor registered for queue: ${queueName}`);
        return;
      }

      const jobData: TaskJobData = {
        taskId: event.taskId,
        type: event.type,
        metadata: event.metadata ?? {},
        createdBy: event.createdBy,
      };

      const queue = getQueue(queueName);
      void queue
        .add(queueName, jobData, {
          jobId: event.taskId,
          removeOnComplete: 100,
          removeOnFail: 100,
        })
        .then(() => {
          log.info(`Dispatched job ${event.taskId} to queue ${queueName}`);
        })
        .catch((err: Error) => {
          log.error(`Failed to dispatch job ${event.taskId}: ${err.message}`);
        });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse task:enqueued event: ${message}`);
    }
  });
}

function startWorkers(): void {
  log.info(`${APP_NAME} Workers v${APP_VERSION} starting...`);

  const processors = buildProcessors();
  for (const name of Object.keys(processors)) {
    registeredQueues.add(name);
  }

  for (const [queueName, processor] of Object.entries(processors)) {
    const worker = new Worker<TaskJobData>(
      queueName,
      async (job: Job<TaskJobData>) => {
        const { taskId, createdBy } = job.data;
        log.info(`Processing job ${job.id} (task ${taskId}) on queue ${queueName}`);

        // Mark task as RUNNING in DB
        try {
          await prisma.asyncTask.update({
            where: { id: taskId },
            data: { status: 'RUNNING', startedAt: new Date() },
          });
        } catch {
          // Task may not exist if created externally; continue anyway
        }

        try {
          const result = await processor.process(job);

          // Mark task as COMPLETED in DB
          await prisma.asyncTask.update({
            where: { id: taskId },
            data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
          });

          // Publish completion event
          await redis.publish(
            `task:progress:${createdBy}`,
            JSON.stringify({
              taskId,
              type: queueName,
              status: 'COMPLETED',
              progress: 100,
              message: 'Task completed',
            }),
          );

          log.info(`Job ${job.id} (task ${taskId}) on queue ${queueName} completed`);
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);

          // Mark task as FAILED in DB
          try {
            await prisma.asyncTask.update({
              where: { id: taskId },
              data: {
                status: 'FAILED',
                completedAt: new Date(),
                error: message,
              },
            });

            // Publish failure event
            await redis.publish(
              `task:progress:${createdBy}`,
              JSON.stringify({
                taskId,
                type: queueName,
                status: 'FAILED',
                progress: 0,
                message,
              }),
            );
          } catch {
            // Best effort DB update
          }

          log.error(`Job ${job.id} (task ${taskId}) on queue ${queueName} failed: ${message}`);
          throw err;
        }
      },
      {
        connection: bullmqConnection,
        concurrency: 1,
      },
    );

    worker.on('error', (err) => {
      log.error(`Worker error on queue ${queueName}: ${err.message}`);
    });

    workers.push(worker);
    log.info(`Worker registered for queue: ${queueName}`);
  }

  log.info(`${workers.length} workers started`);
}

async function shutdown(): Promise<void> {
  log.info('Shutting down workers...');

  // Close subscriber connection
  if (subscriberRedis) {
    try {
      await subscriberRedis.quit();
    } catch {
      // Ignore close errors during shutdown
    }
  }

  // Close BullMQ queues
  await Promise.all(
    [...queues.values()].map(async (queue) => {
      try {
        await queue.close();
      } catch {
        // Ignore close errors during shutdown
      }
    }),
  );

  // Close BullMQ workers
  await Promise.all(
    workers.map(async (worker) => {
      try {
        await worker.close();
      } catch {
        // Ignore close errors during shutdown
      }
    }),
  );

  await disconnectRedis();
  log.info('All workers stopped');
  process.exit(0);
}

// Graceful shutdown handlers
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

async function main(): Promise<void> {
  await initLlmService();
  startTaskDispatcher();
  startWorkers();
}

main().catch((err) => {
  log.error(`Fatal startup error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
