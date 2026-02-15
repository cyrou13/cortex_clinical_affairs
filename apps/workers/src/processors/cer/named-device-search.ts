import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';

export interface NamedDeviceSearchMetadata {
  searchId: string;
  cerVersionId: string;
  deviceName: string;
  keywords: string[];
  databases: string[];
}

export interface VigilanceSearchResult {
  findings: Array<{
    sourceDatabase: string;
    reportNumber: string;
    eventDate: string;
    deviceName: string;
    eventType: string;
    description: string;
    outcome: string;
  }>;
  stats: Array<{ source: string; count: number; durationMs: number }>;
  errors: Array<{ source: string; error: string }>;
}

export interface SearchDeps {
  aggregateSearch(
    deviceName: string,
    keywords: string[],
    databases: string[],
  ): Promise<VigilanceSearchResult>;
  storeFinding(searchId: string, finding: VigilanceSearchResult['findings'][number]): Promise<void>;
  updateSearchStatus(
    searchId: string,
    status: string,
    options?: { totalFindings?: number; errorMessage?: string },
  ): Promise<void>;
}

export class NamedDeviceSearchProcessor extends BaseProcessor {
  constructor(
    redis: ConstructorParameters<typeof BaseProcessor>[0],
    private readonly deps: SearchDeps,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<{
    searchId: string;
    totalFindings: number;
    errors: Array<{ source: string; error: string }>;
  }> {
    const metadata = job.data.metadata as unknown as NamedDeviceSearchMetadata;
    const { searchId, deviceName, keywords, databases } = metadata;

    // Mark search as running
    await this.deps.updateSearchStatus(searchId, 'RUNNING');

    await this.reportProgress(job, 10, { message: 'Starting vigilance database search' });

    let searchResult: VigilanceSearchResult;

    try {
      searchResult = await this.deps.aggregateSearch(deviceName, keywords, databases);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.deps.updateSearchStatus(searchId, 'FAILED', { errorMessage });
      throw err;
    }

    await this.reportProgress(job, 50, {
      message: `Found ${searchResult.findings.length} results, storing...`,
      total: searchResult.findings.length,
      current: 0,
    });

    // Store findings
    let stored = 0;
    for (const finding of searchResult.findings) {
      if (await this.checkCancellation(job)) {
        await this.deps.updateSearchStatus(searchId, 'PARTIAL', {
          totalFindings: stored,
        });
        return { searchId, totalFindings: stored, errors: searchResult.errors };
      }

      try {
        await this.deps.storeFinding(searchId, finding);
        stored++;
      } catch {
        // Continue on individual storage failures
      }

      const progress = 50 + Math.floor((stored / searchResult.findings.length) * 40);
      await this.reportProgress(job, progress, {
        message: `Stored ${stored}/${searchResult.findings.length} findings`,
        total: searchResult.findings.length,
        current: stored,
      });
    }

    // Determine final status
    const finalStatus = searchResult.errors.length > 0 ? 'PARTIAL' : 'COMPLETED';

    await this.deps.updateSearchStatus(searchId, finalStatus, {
      totalFindings: stored,
      errorMessage:
        searchResult.errors.length > 0
          ? searchResult.errors.map((e) => `${e.source}: ${e.error}`).join('; ')
          : undefined,
    });

    await this.reportProgress(job, 100, {
      message: `Search complete: ${stored} findings from ${databases.length} databases`,
    });

    return {
      searchId,
      totalFindings: stored,
      errors: searchResult.errors,
    };
  }
}
