import type { VigilanceFindingData } from '../../domain/entities/vigilance-finding.js';
import { createVigilanceFinding } from '../../domain/entities/vigilance-finding.js';

export interface MaudeSearchOptions {
  deviceName: string;
  keywords: string[];
  limit?: number;
  offset?: number;
}

export interface MaudeApiResponse {
  results: MaudeEvent[];
  meta: {
    results: { total: number; skip: number; limit: number };
  };
}

export interface MaudeEvent {
  mdr_report_key: string;
  date_of_event: string;
  device: Array<{
    brand_name: string;
    generic_name: string;
  }>;
  mdr_text: Array<{
    text: string;
    text_type_code: string;
  }>;
  event_type: string;
  patient?: Array<{
    patient_sequence_number: string;
    sequence_number_outcome: string[];
  }>;
}

export interface MaudeClientDeps {
  fetch: typeof globalThis.fetch;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.fda.gov/device/event.json';
const DEFAULT_LIMIT = 100;
const RATE_LIMIT_DELAY_MS = 1000;

export class MaudeClient {
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly baseUrl: string;
  private lastRequestTime = 0;

  constructor(deps: MaudeClientDeps) {
    this.fetchFn = deps.fetch;
    this.baseUrl = deps.baseUrl ?? DEFAULT_BASE_URL;
  }

  async searchDeviceEvents(
    deviceName: string,
    keywords: string[],
  ): Promise<VigilanceFindingData[]> {
    await this.enforceRateLimit();

    const searchTerms = [deviceName, ...keywords].map((t) => `"${t}"`).join('+AND+');
    const url = `${this.baseUrl}?search=device.brand_name:${encodeURIComponent(searchTerms)}&limit=${DEFAULT_LIMIT}`;

    const response = await this.fetchFn(url);

    if (response.status === 429) {
      // Rate limited - wait and retry once
      await this.delay(RATE_LIMIT_DELAY_MS * 2);
      const retryResponse = await this.fetchFn(url);
      if (!retryResponse.ok) {
        throw new Error(`MAUDE API error after retry: ${retryResponse.status}`);
      }
      return this.parseResponse(await retryResponse.json(), deviceName);
    }

    if (!response.ok) {
      if (response.status === 404) {
        // No results found - valid empty result
        return [];
      }
      throw new Error(`MAUDE API error: ${response.status}`);
    }

    const data = (await response.json()) as MaudeApiResponse;
    return this.parseResponse(data, deviceName);
  }

  private parseResponse(data: MaudeApiResponse, searchDeviceName: string): VigilanceFindingData[] {
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((event) => {
      const deviceInfo = event.device?.[0];
      const deviceName = deviceInfo?.brand_name || deviceInfo?.generic_name || searchDeviceName;
      const description = event.mdr_text
        ?.map((t) => t.text)
        .join(' ')
        .slice(0, 2000) ?? 'No description available';

      const outcome = this.extractOutcome(event);
      const eventType = this.mapEventType(event.event_type);

      return createVigilanceFinding(
        '', // searchId will be set when persisting
        'MAUDE',
        event.mdr_report_key || crypto.randomUUID(),
        event.date_of_event || '',
        deviceName,
        eventType,
        description || 'No description available',
        outcome,
      );
    });
  }

  private extractOutcome(event: MaudeEvent): string {
    const outcomes = event.patient
      ?.flatMap((p) => p.sequence_number_outcome ?? [])
      .filter(Boolean);
    return outcomes && outcomes.length > 0 ? outcomes.join(', ') : 'Unknown';
  }

  private mapEventType(fdaEventType: string): string {
    const typeMap: Record<string, string> = {
      Malfunction: 'MALFUNCTION',
      Injury: 'INJURY',
      Death: 'DEATH',
    };
    return typeMap[fdaEventType] ?? 'OTHER';
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await this.delay(RATE_LIMIT_DELAY_MS - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
