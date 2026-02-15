import { describe, it, expect } from 'vitest';
import {
  createNamedDeviceSearch,
  updateSearchStatus,
  addFinding,
  SEARCH_STATUSES,
  VIGILANCE_DATABASES,
} from './named-device-search.js';
import type { NamedDeviceSearchData } from './named-device-search.js';

function makeSearch(overrides?: Partial<NamedDeviceSearchData>): NamedDeviceSearchData {
  return {
    id: 'search-1',
    cerVersionId: 'cer-1',
    deviceName: 'CardioValve Pro',
    keywords: ['heart valve', 'prosthetic'],
    databases: ['MAUDE'],
    status: 'PENDING',
    totalFindings: 0,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('NamedDeviceSearch entity', () => {
  it('exports SEARCH_STATUSES with 5 values', () => {
    expect(SEARCH_STATUSES).toHaveLength(5);
  });

  it('exports VIGILANCE_DATABASES with 4 values', () => {
    expect(VIGILANCE_DATABASES).toHaveLength(4);
    expect(VIGILANCE_DATABASES).toContain('MAUDE');
    expect(VIGILANCE_DATABASES).toContain('ANSM');
    expect(VIGILANCE_DATABASES).toContain('BfArM');
    expect(VIGILANCE_DATABASES).toContain('AFMPS');
  });

  describe('createNamedDeviceSearch', () => {
    it('creates a search with valid data', () => {
      const search = createNamedDeviceSearch('cer-1', 'CardioValve', ['valve', 'cardiac'], ['MAUDE']);
      expect(search.cerVersionId).toBe('cer-1');
      expect(search.deviceName).toBe('CardioValve');
      expect(search.keywords).toEqual(['valve', 'cardiac']);
      expect(search.databases).toEqual(['MAUDE']);
      expect(search.status).toBe('PENDING');
      expect(search.totalFindings).toBe(0);
      expect(search.id).toBeTruthy();
    });

    it('accepts multiple databases', () => {
      const search = createNamedDeviceSearch('cer-1', 'Device', ['kw'], ['MAUDE', 'ANSM', 'BfArM']);
      expect(search.databases).toHaveLength(3);
    });

    it('trims device name and keywords', () => {
      const search = createNamedDeviceSearch('cer-1', '  Device  ', ['  kw1  ', '  kw2  '], ['MAUDE']);
      expect(search.deviceName).toBe('Device');
      expect(search.keywords).toEqual(['kw1', 'kw2']);
    });

    it('throws for empty device name', () => {
      expect(() => createNamedDeviceSearch('cer-1', '', ['kw'], ['MAUDE'])).toThrow(
        'Device name is required',
      );
    });

    it('throws for empty keywords array', () => {
      expect(() => createNamedDeviceSearch('cer-1', 'Device', [], ['MAUDE'])).toThrow(
        'At least one keyword',
      );
    });

    it('throws for empty databases array', () => {
      expect(() => createNamedDeviceSearch('cer-1', 'Device', ['kw'], [])).toThrow(
        'At least one database',
      );
    });

    it('throws for invalid database', () => {
      expect(() =>
        createNamedDeviceSearch('cer-1', 'Device', ['kw'], ['INVALID']),
      ).toThrow('Invalid vigilance database');
    });

    it('filters out empty keywords after trimming', () => {
      const search = createNamedDeviceSearch('cer-1', 'Device', ['kw1', '  ', 'kw2'], ['MAUDE']);
      expect(search.keywords).toEqual(['kw1', 'kw2']);
    });
  });

  describe('updateSearchStatus', () => {
    it('sets startedAt when transitioning to RUNNING', () => {
      const search = makeSearch({ status: 'PENDING' });
      const result = updateSearchStatus(search, 'RUNNING');
      expect(result.status).toBe('RUNNING');
      expect(result.startedAt).toBeTruthy();
    });

    it('sets completedAt when transitioning to COMPLETED', () => {
      const search = makeSearch({ status: 'RUNNING', startedAt: '2024-01-01T00:00:00Z' });
      const result = updateSearchStatus(search, 'COMPLETED', { totalFindings: 42 });
      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeTruthy();
      expect(result.totalFindings).toBe(42);
    });

    it('stores error message on FAILED', () => {
      const search = makeSearch({ status: 'RUNNING' });
      const result = updateSearchStatus(search, 'FAILED', {
        errorMessage: 'API timeout',
      });
      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('API timeout');
    });

    it('sets completedAt when PARTIAL', () => {
      const search = makeSearch({ status: 'RUNNING' });
      const result = updateSearchStatus(search, 'PARTIAL', { totalFindings: 10 });
      expect(result.completedAt).toBeTruthy();
      expect(result.totalFindings).toBe(10);
    });
  });

  describe('addFinding', () => {
    it('increments totalFindings by 1 by default', () => {
      const search = makeSearch({ totalFindings: 5 });
      const result = addFinding(search);
      expect(result.totalFindings).toBe(6);
    });

    it('increments totalFindings by specified count', () => {
      const search = makeSearch({ totalFindings: 5 });
      const result = addFinding(search, 10);
      expect(result.totalFindings).toBe(15);
    });

    it('updates updatedAt', () => {
      const search = makeSearch();
      const result = addFinding(search);
      expect(result.updatedAt).not.toBe(search.updatedAt);
    });
  });
});
