import { Worker, type Job } from 'bullmq';
import { APP_NAME, APP_VERSION } from '@cortex/shared';
import { getRedis, getBullMQConnection, disconnectRedis } from './config/redis.js';
import type { TaskJobData } from './shared/base-processor.js';
import { EchoProcessor } from './processors/sample/echo-task.js';
import { ExecuteQueryProcessor } from './processors/sls/execute-query.js';
import { ScoreArticlesProcessor } from './processors/sls/score-articles.js';
import { RetrievePdfsProcessor } from './processors/sls/retrieve-pdfs.js';
import { MineReferencesProcessor } from './processors/sls/mine-references.js';
import { ExtractGridDataProcessor } from './processors/soa/extract-grid-data.js';
import { DraftNarrativeProcessor } from './processors/soa/draft-narrative.js';
import { DraftSectionProcessor } from './processors/cer/draft-section.js';
import { GenerateDocxProcessor } from './processors/cer/generate-docx.js';
import { GenerateReportsProcessor } from './processors/validation/generate-reports.js';
import { GeneratePmcfReportProcessor } from './processors/pms/generate-pmcf-report.js';
import { GeneratePsurProcessor } from './processors/pms/generate-psur.js';
import { CustomFilterScoreProcessor } from './processors/sls/custom-filter-score.js';

const log = {
  info: (msg: string) => process.stdout.write(`[INFO] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
};

const redis = getRedis();
const bullmqConnection = getBullMQConnection();

// Map queue names to processor instances
const processors: Record<string, { process: (job: Job<TaskJobData>) => Promise<unknown> }> = {
  'sample:echo': new EchoProcessor(redis),
  'sls:execute-query': new ExecuteQueryProcessor(redis),
  'sls:score-articles': new ScoreArticlesProcessor(redis),
  'sls:retrieve-pdfs': new RetrievePdfsProcessor(redis),
  'sls:mine-references': new MineReferencesProcessor(redis),
  'soa:extract-grid-data': new ExtractGridDataProcessor(redis),
  'soa:draft-narrative': new DraftNarrativeProcessor(redis),
  'cer:draft-section': new DraftSectionProcessor(redis),
  'cer:generate-docx': new GenerateDocxProcessor(redis),
  'validation:generate-report': new GenerateReportsProcessor(redis),
  'pms:generate-pmcf-report': new GeneratePmcfReportProcessor(redis),
  'pms:generate-psur': new GeneratePsurProcessor(redis),
  'sls:custom-filter-score': new CustomFilterScoreProcessor(redis),
};

const workers: Worker[] = [];

function startWorkers(): void {
  log.info(`${APP_NAME} Workers v${APP_VERSION} starting...`);

  for (const [queueName, processor] of Object.entries(processors)) {
    const worker = new Worker<TaskJobData>(
      queueName,
      async (job: Job<TaskJobData>) => {
        log.info(`Processing job ${job.id} on queue ${queueName}`);
        try {
          const result = await processor.process(job);
          log.info(`Job ${job.id} on queue ${queueName} completed`);
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.error(`Job ${job.id} on queue ${queueName} failed: ${message}`);
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

startWorkers();
