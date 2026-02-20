import { cn } from '../../../shared/utils/cn';

interface ScreeningFilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    likelyRelevant: number;
    uncertain: number;
    likelyIrrelevant: number;
  };
}

const tabs = [
  { key: 'all', label: 'All', countKey: 'all' as const },
  { key: 'likely_relevant', label: 'Likely Relevant', countKey: 'likelyRelevant' as const },
  { key: 'uncertain', label: 'Uncertain', countKey: 'uncertain' as const },
  { key: 'likely_irrelevant', label: 'Likely Irrelevant', countKey: 'likelyIrrelevant' as const },
];

export function ScreeningFilterTabs({ activeTab, onTabChange, counts }: ScreeningFilterTabsProps) {
  return (
    <div
      className="flex gap-1 border-b border-[var(--cortex-border)]"
      data-testid="screening-filter-tabs"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === tab.key
              ? 'border-b-2 border-[var(--cortex-blue-500)] text-[var(--cortex-blue-600)]'
              : 'text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]',
          )}
          data-testid={`filter-tab-${tab.key}`}
        >
          {tab.label}{' '}
          <span className="text-xs opacity-70" data-testid={`tab-count-${tab.key}`}>
            ({counts[tab.countKey].toLocaleString()})
          </span>
        </button>
      ))}
    </div>
  );
}
