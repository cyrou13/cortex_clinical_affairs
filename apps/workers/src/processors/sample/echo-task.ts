import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';

export class EchoProcessor extends BaseProcessor {
  async process(job: Job<TaskJobData>): Promise<{ echo: unknown }> {
    const steps = 5;

    for (let i = 1; i <= steps; i++) {
      if (await this.checkCancellation(job)) {
        throw new Error('Task was cancelled');
      }

      await this.reportProgress(job, (i / steps) * 100, {
        total: steps,
        current: i,
        message: `Echo step ${i} of ${steps}`,
      });

      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { echo: job.data.metadata };
  }
}
