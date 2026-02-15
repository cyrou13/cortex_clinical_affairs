import type { VigilanceFindingData } from '../../domain/entities/vigilance-finding.js';
import type { MaudeClient } from './maude-client.js';

export interface VigilanceSource {
  name: string;
  search(deviceName: string, keywords: string[]): Promise<VigilanceFindingData[]>;
}

export interface AggregateSearchResult {
  findings: VigilanceFindingData[];
  stats: SourceStats[];
  totalDeduped: number;
  errors: SourceError[];
}

export interface SourceStats {
  source: string;
  count: number;
  durationMs: number;
}

export interface SourceError {
  source: string;
  error: string;
}

export class VigilanceAggregator {
  private readonly sources: Map<string, VigilanceSource> = new Map();

  constructor(maudeClient?: MaudeClient) {
    if (maudeClient) {
      this.registerSource({
        name: 'MAUDE',
        search: (deviceName, keywords) =>
          maudeClient.searchDeviceEvents(deviceName, keywords),
      });
    }

    // Register stubs for other databases
    this.registerSource({
      name: 'ANSM',
      search: async () => [],
    });

    this.registerSource({
      name: 'BfArM',
      search: async () => [],
    });

    this.registerSource({
      name: 'AFMPS',
      search: async () => [],
    });
  }

  registerSource(source: VigilanceSource): void {
    this.sources.set(source.name, source);
  }

  async aggregateSearch(
    deviceName: string,
    keywords: string[],
    databases: string[],
  ): Promise<AggregateSearchResult> {
    const allFindings: VigilanceFindingData[] = [];
    const stats: SourceStats[] = [];
    const errors: SourceError[] = [];

    const searchPromises = databases
      .filter((db) => this.sources.has(db))
      .map(async (db) => {
        const source = this.sources.get(db)!;
        const start = Date.now();
        try {
          const findings = await source.search(deviceName, keywords);
          const durationMs = Date.now() - start;
          return { db, findings, durationMs, error: null };
        } catch (err) {
          const durationMs = Date.now() - start;
          const errorMessage = err instanceof Error ? err.message : String(err);
          return { db, findings: [] as VigilanceFindingData[], durationMs, error: errorMessage };
        }
      });

    const results = await Promise.all(searchPromises);

    for (const result of results) {
      stats.push({
        source: result.db,
        count: result.findings.length,
        durationMs: result.durationMs,
      });

      if (result.error) {
        errors.push({ source: result.db, error: result.error });
      }

      allFindings.push(...result.findings);
    }

    // Deduplicate by reportNumber
    const deduped = this.deduplicateFindings(allFindings);

    return {
      findings: deduped,
      stats,
      totalDeduped: deduped.length,
      errors,
    };
  }

  private deduplicateFindings(findings: VigilanceFindingData[]): VigilanceFindingData[] {
    const seen = new Map<string, VigilanceFindingData>();

    for (const finding of findings) {
      const key = `${finding.sourceDatabase}:${finding.reportNumber}`;
      if (!seen.has(key)) {
        seen.set(key, finding);
      }
    }

    return Array.from(seen.values());
  }
}
