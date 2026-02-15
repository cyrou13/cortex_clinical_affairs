import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VigilanceAggregator } from './vigilance-aggregator.js';
import type { VigilanceFindingData } from '../../domain/entities/vigilance-finding.js';

function makeFinding(overrides?: Partial<VigilanceFindingData>): VigilanceFindingData {
  return {
    id: crypto.randomUUID(),
    searchId: '',
    sourceDatabase: 'MAUDE',
    reportNumber: 'MDR-001',
    eventDate: '2024-01-15',
    deviceName: 'CardioValve Pro',
    eventType: 'MALFUNCTION',
    description: 'Device malfunction',
    outcome: 'No harm',
    linkedSectionIds: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('VigilanceAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates findings from multiple sources', async () => {
    const aggregator = new VigilanceAggregator();

    // Register test sources with data
    aggregator.registerSource({
      name: 'MAUDE',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-001' }),
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-002' }),
      ]),
    });

    aggregator.registerSource({
      name: 'ANSM',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'ANSM', reportNumber: 'ANSM-001' }),
      ]),
    });

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE', 'ANSM']);

    expect(result.findings).toHaveLength(3);
    expect(result.totalDeduped).toBe(3);
    expect(result.stats).toHaveLength(2);
  });

  it('deduplicates findings by sourceDatabase and reportNumber', async () => {
    const aggregator = new VigilanceAggregator();

    aggregator.registerSource({
      name: 'MAUDE',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-001' }),
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-001' }),
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-002' }),
      ]),
    });

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE']);

    expect(result.findings).toHaveLength(2);
    expect(result.totalDeduped).toBe(2);
  });

  it('does not deduplicate findings from different sources with same report number', async () => {
    const aggregator = new VigilanceAggregator();

    aggregator.registerSource({
      name: 'MAUDE',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'RPT-001' }),
      ]),
    });

    aggregator.registerSource({
      name: 'ANSM',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'ANSM', reportNumber: 'RPT-001' }),
      ]),
    });

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE', 'ANSM']);
    expect(result.findings).toHaveLength(2);
  });

  it('tracks stats per source', async () => {
    const aggregator = new VigilanceAggregator();

    aggregator.registerSource({
      name: 'MAUDE',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-001' }),
      ]),
    });

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE']);

    expect(result.stats).toHaveLength(1);
    expect(result.stats[0]!.source).toBe('MAUDE');
    expect(result.stats[0]!.count).toBe(1);
    expect(result.stats[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles source errors gracefully', async () => {
    const aggregator = new VigilanceAggregator();

    aggregator.registerSource({
      name: 'MAUDE',
      search: vi.fn().mockRejectedValue(new Error('API timeout')),
    });

    aggregator.registerSource({
      name: 'ANSM',
      search: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'ANSM', reportNumber: 'ANSM-001' }),
      ]),
    });

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE', 'ANSM']);

    expect(result.findings).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.source).toBe('MAUDE');
    expect(result.errors[0]!.error).toBe('API timeout');
  });

  it('skips databases not registered as sources', async () => {
    const aggregator = new VigilanceAggregator();

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['UNKNOWN_DB']);

    expect(result.findings).toEqual([]);
    expect(result.stats).toEqual([]);
  });

  it('returns empty result when no databases specified', async () => {
    const aggregator = new VigilanceAggregator();

    const result = await aggregator.aggregateSearch('Device', ['kw'], []);

    expect(result.findings).toEqual([]);
    expect(result.stats).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('searches only specified databases', async () => {
    const maudeSearch = vi.fn().mockResolvedValue([]);
    const ansmSearch = vi.fn().mockResolvedValue([]);

    const aggregator = new VigilanceAggregator();
    aggregator.registerSource({ name: 'MAUDE', search: maudeSearch });
    aggregator.registerSource({ name: 'ANSM', search: ansmSearch });

    await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE']);

    expect(maudeSearch).toHaveBeenCalled();
    expect(ansmSearch).not.toHaveBeenCalled();
  });

  it('handles all sources failing', async () => {
    const aggregator = new VigilanceAggregator();

    aggregator.registerSource({
      name: 'MAUDE',
      search: vi.fn().mockRejectedValue(new Error('Fail 1')),
    });

    aggregator.registerSource({
      name: 'ANSM',
      search: vi.fn().mockRejectedValue(new Error('Fail 2')),
    });

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE', 'ANSM']);

    expect(result.findings).toEqual([]);
    expect(result.errors).toHaveLength(2);
  });

  it('registers MAUDE client when provided in constructor', async () => {
    const mockMaudeClient = {
      searchDeviceEvents: vi.fn().mockResolvedValue([
        makeFinding({ sourceDatabase: 'MAUDE', reportNumber: 'MDR-099' }),
      ]),
    } as any;

    const aggregator = new VigilanceAggregator(mockMaudeClient);

    const result = await aggregator.aggregateSearch('Device', ['kw'], ['MAUDE']);
    expect(result.findings).toHaveLength(1);
    expect(mockMaudeClient.searchDeviceEvents).toHaveBeenCalledWith('Device', ['kw']);
  });
});
