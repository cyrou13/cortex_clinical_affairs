import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';

export class DraftNarrativeProcessor extends BaseProcessor {
  async process(_job: Job<TaskJobData>): Promise<never> {
    throw new Error('Not yet implemented: soa:draft-narrative');
  }
}
