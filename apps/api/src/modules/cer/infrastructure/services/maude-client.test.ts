import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaudeClient } from './maude-client.js';

function makeMaudeResponse(events: Array<Record<string, unknown>> = []) {
  return {
    results: events,
    meta: { results: { total: events.length, skip: 0, limit: 100 } },
  };
}

function makeEvent(overrides?: Record<string, unknown>) {
  return {
    mdr_report_key: 'MDR-2024-001',
    date_of_event: '2024-01-15',
    device: [{ brand_name: 'CardioValve Pro', generic_name: 'Heart Valve' }],
    mdr_text: [{ text: 'Device malfunction during procedure', text_type_code: 'D' }],
    event_type: 'Malfunction',
    patient: [{ patient_sequence_number: '1', sequence_number_outcome: ['No harm'] }],
    ...overrides,
  };
}

describe('MaudeClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
  });

  it('returns parsed findings from MAUDE API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(makeMaudeResponse([makeEvent()])),
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('CardioValve', ['valve']);

    expect(results).toHaveLength(1);
    expect(results[0]!.sourceDatabase).toBe('MAUDE');
    expect(results[0]!.reportNumber).toBe('MDR-2024-001');
    expect(results[0]!.eventType).toBe('MALFUNCTION');
  });

  it('returns empty array for 404 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('NonExistent', ['kw']);

    expect(results).toEqual([]);
  });

  it('throws for non-404 error status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });

    await expect(client.searchDeviceEvents('Device', ['kw'])).rejects.toThrow('MAUDE API error: 500');
  });

  it('retries on 429 rate limit', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(makeMaudeResponse([makeEvent()])),
      });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('Device', ['kw']);

    expect(results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on 429 retry failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });

    await expect(client.searchDeviceEvents('Device', ['kw'])).rejects.toThrow(
      'MAUDE API error after retry',
    );
  });

  it('maps Injury event type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(
        makeMaudeResponse([makeEvent({ event_type: 'Injury' })]),
      ),
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('Device', ['kw']);
    expect(results[0]!.eventType).toBe('INJURY');
  });

  it('maps Death event type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(
        makeMaudeResponse([makeEvent({ event_type: 'Death' })]),
      ),
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('Device', ['kw']);
    expect(results[0]!.eventType).toBe('DEATH');
  });

  it('maps unknown event type to OTHER', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(
        makeMaudeResponse([makeEvent({ event_type: 'UnknownType' })]),
      ),
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('Device', ['kw']);
    expect(results[0]!.eventType).toBe('OTHER');
  });

  it('returns empty array for empty results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(makeMaudeResponse([])),
    });

    const client = new MaudeClient({ fetch: mockFetch, baseUrl: 'https://api.test.com' });
    const results = await client.searchDeviceEvents('Device', ['kw']);
    expect(results).toEqual([]);
  });
});
