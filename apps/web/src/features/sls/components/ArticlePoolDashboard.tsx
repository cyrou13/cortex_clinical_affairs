import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  FileText,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import {
  GET_ARTICLE_COUNT_BY_STATUS,
  GET_ARTICLES,
  GET_ABSTRACT_ENRICHMENT_STATS,
} from '../graphql/queries';
import { LAUNCH_ABSTRACT_ENRICHMENT } from '../graphql/mutations';
import { ArticleTable, type ArticleFilter } from './ArticleTable';
import { ArticleDetailPanel } from './ArticleDetailPanel';

interface StatusCount {
  status: string;
  count: number;
}

interface ArticleCountByStatusResponse {
  articleCountByStatus: StatusCount[];
}

interface ArticlePoolDashboardProps {
  sessionId: string;
}

type FilterTab = 'ALL' | 'PENDING' | 'SCORED' | 'INCLUDED' | 'EXCLUDED';

const filterTabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL', label: 'All', icon: <FileText size={14} /> },
  { key: 'PENDING', label: 'Pending', icon: <Clock size={14} /> },
  { key: 'SCORED', label: 'Scored', icon: <BarChart3 size={14} /> },
  { key: 'INCLUDED', label: 'Included', icon: <CheckCircle size={14} /> },
  { key: 'EXCLUDED', label: 'Excluded', icon: <XCircle size={14} /> },
];

function getCountForStatus(statusCounts: StatusCount[], status: string): number {
  return statusCounts.find((s) => s.status === status)?.count ?? 0;
}

function getTotalArticles(statusCounts: StatusCount[]): number {
  return statusCounts.reduce((sum, s) => sum + s.count, 0);
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  testId: string;
}

function MetricCard({ icon, label, value, testId }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--cortex-blue-50)] text-[var(--cortex-blue-500)]">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            {value.toLocaleString()}
          </p>
          <p className="text-sm text-[var(--cortex-text-muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface ArticleItem {
  id: string;
}

interface ArticlesResponse {
  articles: {
    items: ArticleItem[];
    total: number;
  };
}

export function ArticlePoolDashboard({ sessionId }: ArticlePoolDashboardProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ArticleFilter>({});

  const { data, loading } = useQuery<ArticleCountByStatusResponse>(GET_ARTICLE_COUNT_BY_STATUS, {
    variables: { sessionId },
  });

  const { data: articlesData } = useQuery<ArticlesResponse>(GET_ARTICLES, {
    variables: {
      sessionId,
      filter: {
        searchText: filter.search,
        status: filter.status,
        pdfStatus: filter.pdfStatus,
        customFilterPassed: filter.customFilterPassed,
      },
      offset: 0,
      limit: 500,
    },
  });

  const articleIds = articlesData?.articles?.items?.map((a) => a.id) ?? [];

  const {
    data: enrichStats,
    startPolling: startEnrichPolling,
    stopPolling: stopEnrichPolling,
  } = useQuery<{
    abstractEnrichmentStats: {
      totalArticles: number;
      withFullAbstract: number;
      withShortAbstract: number;
      withoutAbstract: number;
      needsEnrichment: number;
    };
  }>(GET_ABSTRACT_ENRICHMENT_STATS, {
    variables: { sessionId },
    fetchPolicy: 'network-only',
  });

  const [launchEnrichment, { loading: launching }] = useMutation(LAUNCH_ABSTRACT_ENRICHMENT);
  const [enrichTaskId, setEnrichTaskId] = useState<string | null>(null);

  const enrichmentStats = enrichStats?.abstractEnrichmentStats;
  const isEnriching = !!enrichTaskId;

  useEffect(() => {
    if (isEnriching) {
      startEnrichPolling(5000);
    } else {
      stopEnrichPolling();
    }
  }, [isEnriching, startEnrichPolling, stopEnrichPolling]);

  // Clear enrichTaskId when enrichment completes (needsEnrichment drops)
  useEffect(() => {
    if (enrichTaskId && enrichmentStats && enrichmentStats.needsEnrichment === 0) {
      setEnrichTaskId(null);
    }
  }, [enrichTaskId, enrichmentStats]);

  const handleLaunchEnrichment = async () => {
    try {
      const result = await launchEnrichment({ variables: { sessionId } });
      if (result.data?.launchAbstractEnrichment?.taskId) {
        setEnrichTaskId(result.data.launchAbstractEnrichment.taskId);
      }
    } catch {
      // Error handled by Apollo
    }
  };

  const statusCounts = data?.articleCountByStatus ?? [];
  const total = getTotalArticles(statusCounts);
  const pendingCount = getCountForStatus(statusCounts, 'PENDING');
  const scoredCount = getCountForStatus(statusCounts, 'SCORED');
  const includedCount = getCountForStatus(statusCounts, 'INCLUDED');
  const excludedCount = getCountForStatus(statusCounts, 'EXCLUDED');
  const duplicateCount = getCountForStatus(statusCounts, 'DUPLICATE');

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setFilter((prev) => ({
      ...prev,
      status: tab === 'ALL' ? undefined : tab,
    }));
  }

  function getTabCount(tab: FilterTab): number {
    if (tab === 'ALL') return total;
    return getCountForStatus(statusCounts, tab);
  }

  function handleArticleSelect(articleId: string) {
    setSelectedArticleId(articleId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="article-pool-loading">
        <p className="text-[var(--cortex-text-muted)]">Loading article pool...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="article-pool-dashboard">
      {/* Metrics row */}
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        data-testid="metrics-row"
      >
        <MetricCard
          icon={<FileText size={20} />}
          label="Total Articles"
          value={total}
          testId="metric-total"
        />
        <MetricCard
          icon={<Copy size={20} />}
          label="Duplicates Removed"
          value={duplicateCount}
          testId="metric-duplicates"
        />
        <MetricCard
          icon={<Clock size={20} />}
          label="Pending"
          value={pendingCount}
          testId="metric-pending"
        />
        <MetricCard
          icon={<BarChart3 size={20} />}
          label="Scored"
          value={scoredCount}
          testId="metric-scored"
        />
        <MetricCard
          icon={<CheckCircle size={20} />}
          label="Included"
          value={includedCount}
          testId="metric-included"
        />
        <MetricCard
          icon={<XCircle size={20} />}
          label="Excluded"
          value={excludedCount}
          testId="metric-excluded"
        />
      </div>

      {/* Abstract enrichment banner */}
      {enrichmentStats && enrichmentStats.needsEnrichment > 0 && (
        <div
          className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
          data-testid="abstract-enrichment-banner"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-orange-600" />
            <div>
              <span className="text-sm font-medium text-orange-800">
                {enrichmentStats.needsEnrichment} article
                {enrichmentStats.needsEnrichment > 1 ? 's' : ''} with missing or truncated abstracts
              </span>
              <span className="ml-2 text-xs text-orange-600">
                ({enrichmentStats.withoutAbstract} missing, {enrichmentStats.withShortAbstract}{' '}
                truncated)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLaunchEnrichment}
            disabled={launching || isEnriching}
            className="inline-flex items-center gap-2 rounded bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="launch-enrichment-btn"
          >
            {isEnriching ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
            {isEnriching ? 'Enriching...' : 'Enrich All Abstracts'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200" role="tablist" data-testid="filter-tabs">
        {filterTabs.map((tab) => {
          const count = getTabCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-[var(--cortex-blue-500)] text-[var(--cortex-blue-600)]'
                  : 'border-transparent text-[var(--cortex-text-muted)] hover:border-gray-300 hover:text-[var(--cortex-text-secondary)]',
              )}
              data-testid={`tab-${tab.key.toLowerCase()}`}
            >
              {tab.icon}
              {tab.label}
              <span
                className={cn(
                  'ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  isActive
                    ? 'bg-[var(--cortex-blue-100)] text-[var(--cortex-blue-700)]'
                    : 'bg-gray-100 text-gray-600',
                )}
                data-testid={`tab-count-${tab.key.toLowerCase()}`}
              >
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Article table */}
      <ArticleTable
        sessionId={sessionId}
        onArticleSelect={handleArticleSelect}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Article detail modal */}
      {selectedArticleId && (
        <ArticleDetailPanel
          articleId={selectedArticleId}
          onClose={() => setSelectedArticleId(null)}
          articleIds={articleIds}
          onNavigate={setSelectedArticleId}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
