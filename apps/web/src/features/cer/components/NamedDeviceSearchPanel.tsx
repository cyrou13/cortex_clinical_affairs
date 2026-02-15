import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Search, Clock } from 'lucide-react';

export const SEARCH_VIGILANCE = gql`
  mutation SearchVigilance($input: VigilanceSearchInput!) {
    searchVigilance(input: $input) {
      searchId
      status
    }
  }
`;

interface SearchHistoryEntry {
  id: string;
  deviceName: string;
  date: string;
  resultCount: number;
}

interface NamedDeviceSearchPanelProps {
  cerId: string;
  searchHistory?: SearchHistoryEntry[];
  onSearchStarted?: (searchId: string) => void;
}

const DATABASES = ['MAUDE', 'ANSM', 'BfArM', 'AFMPS'] as const;

export function NamedDeviceSearchPanel({
  cerId,
  searchHistory = [],
  onSearchStarted,
}: NamedDeviceSearchPanelProps) {
  const [deviceName, setDeviceName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [selectedDbs, setSelectedDbs] = useState<string[]>(['MAUDE']);

  const [searchVigilance, { loading: searching }] = useMutation<any>(SEARCH_VIGILANCE);

  const toggleDb = (db: string) => {
    setSelectedDbs((prev) => (prev.includes(db) ? prev.filter((d) => d !== db) : [...prev, db]));
  };

  const handleSearch = async () => {
    const result = await searchVigilance({
      variables: {
        input: {
          cerId,
          deviceName: deviceName.trim(),
          keywords: keywords.trim(),
          databases: selectedDbs,
        },
      },
    });
    if (result.data?.searchVigilance) {
      onSearchStarted?.(result.data.searchVigilance.searchId);
    }
  };

  const canSearch = deviceName.trim() && selectedDbs.length > 0 && !searching;

  return (
    <div className="space-y-4" data-testid="search-panel">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
        <Search size={14} /> Named Device Vigilance Search
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Device Name
          </label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Enter device name..."
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
            data-testid="device-name-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Keywords
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Optional keywords..."
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
            data-testid="keywords-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Databases
          </label>
          <div className="flex flex-wrap gap-2">
            {DATABASES.map((db) => (
              <label key={db} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDbs.includes(db)}
                  onChange={() => toggleDb(db)}
                  className="accent-[var(--cortex-primary)]"
                  data-testid={`db-checkbox-${db.toLowerCase()}`}
                />
                {db}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          data-testid="search-btn"
        >
          <Search size={14} /> {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchHistory.length > 0 && (
        <div className="space-y-2" data-testid="search-history">
          <h4 className="flex items-center gap-1 text-xs font-medium text-[var(--cortex-text-muted)]">
            <Clock size={10} /> Search History
          </h4>
          {searchHistory.map((entry) => (
            <div
              key={entry.id}
              className="rounded border border-[var(--cortex-border)] p-2 text-xs"
            >
              <span className="font-medium text-[var(--cortex-text-primary)]">
                {entry.deviceName}
              </span>
              <span className="ml-2 text-[var(--cortex-text-muted)]">
                {entry.date} &middot; {entry.resultCount} results
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
