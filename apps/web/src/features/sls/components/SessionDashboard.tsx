import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  FileText,
  Search,
  BarChart3,
  ListChecks,
  Brain,
  Lock,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { StatusBadge, type StatusVariant } from '../../../shared/components/StatusBadge';
import {
  GET_SLS_SESSION,
  GET_SLS_QUERIES,
  GET_ARTICLE_COUNT_BY_STATUS,
  GET_AI_SCORING_STATS,
} from '../graphql/queries';
import { CREATE_QUERY, UPDATE_QUERY } from '../graphql/mutations';
import type { SlsSessionType } from './SlsSidebar';

// Query tab components
import { QueryBuilder, type QueryData } from './QueryBuilder';
import { QueryList } from './QueryList';
import { ExecuteQueryButton } from './ExecuteQueryButton';
import { QueryExecutionProgress } from './QueryExecutionProgress';
import { QueryExecutionHistory } from './QueryExecutionHistory';

// Article tab components
import { ArticlePoolDashboard } from './ArticlePoolDashboard';
import { ArticleTable, type ArticleFilter } from './ArticleTable';
import { ArticleDetailPanel } from './ArticleDetailPanel';

// AI Scoring tab components
import { LaunchAiScreeningButton } from './LaunchAiScreeningButton';
import { RelevanceThresholdConfig } from './RelevanceThresholdConfig';
import { CustomAiFilterEditor } from './CustomAiFilterEditor';
import { AiAcceptanceRate } from './AiAcceptanceRate';

// Screening tab components
import { ScreeningPanel } from './ScreeningPanel';
import { ExclusionCodeManager } from './ExclusionCodeManager';

// Review & Lock tab components
import { SpotCheckView } from './SpotCheckView';
import { ReviewGateStatus } from './ReviewGateStatus';
import { LockDatasetButton } from './LockDatasetButton';

// PDFs & References tab components
import { PdfRetrievalPanel } from './PdfRetrievalPanel';
import { PdfMismatchReview } from './PdfMismatchReview';
import { MinedReferenceReview } from './MinedReferenceReview';
import { ManualArticleAddForm } from './ManualArticleAddForm';
import { SoaTransitionBanner } from './SoaTransitionBanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlsSession {
  id: string;
  name: string;
  type: SlsSessionType;
  status: string;
  scopeFields: Record<string, string> | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusCount {
  status: string;
  count: number;
}

interface AiScoringStats {
  likelyRelevantCount: number;
  uncertainCount: number;
  likelyIrrelevantCount: number;
  totalScored: number;
  acceptanceRate: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const typeLabels: Record<SlsSessionType, string> = {
  SOA_CLINICAL: 'SOA Clinical',
  SOA_DEVICE: 'SOA Device',
  SIMILAR_DEVICE: 'Similar Device',
  PMS_UPDATE: 'PMS Update',
  AD_HOC: 'Ad Hoc',
};

const scopeFieldLabels: Record<string, string> = {
  indication: 'Indication',
  population: 'Population',
  intervention: 'Intervention',
  comparator: 'Comparator',
  outcomes: 'Outcomes',
  deviceName: 'Device Name',
  deviceClass: 'Device Class',
  intendedPurpose: 'Intended Purpose',
  keyPerformanceEndpoints: 'Key Performance Endpoints',
  deviceCategory: 'Device Category',
  equivalenceCriteria: 'Equivalence Criteria',
  searchDatabases: 'Search Databases',
  dateRange: 'Date Range',
  updateScope: 'Update Scope',
  previousSlsReference: 'Previous SLS Reference',
  description: 'Description',
  searchObjective: 'Search Objective',
};

type TabKey = 'queries' | 'articles' | 'ai-scoring' | 'screening' | 'review-lock' | 'pdfs-refs';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabDef[] = [
  { key: 'queries', label: 'Queries', icon: <Search size={16} /> },
  { key: 'articles', label: 'Articles', icon: <FileText size={16} /> },
  { key: 'ai-scoring', label: 'AI Scoring', icon: <Brain size={16} /> },
  { key: 'screening', label: 'Screening', icon: <ListChecks size={16} /> },
  { key: 'pdfs-refs', label: 'PDFs & References', icon: <Download size={16} /> },
  { key: 'review-lock', label: 'Review & Lock', icon: <Lock size={16} /> },
];

function mapStatusToVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    DRAFT: 'draft',
    SCREENING: 'screening',
    COMPLETED: 'completed',
    LOCKED: 'locked',
  };
  return map[status] ?? 'draft';
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div
      className="rounded-lg bg-white p-4 shadow-sm"
      data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--cortex-blue-50)] text-[var(--cortex-blue-500)]">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--cortex-text-primary)]">{value}</p>
          <p className="text-xs text-[var(--cortex-text-muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Queries
// ---------------------------------------------------------------------------

function QueriesTab({ sessionId, sessionStatus }: { sessionId: string; sessionStatus: string }) {
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const [editingQuery, setEditingQuery] = useState<QueryData | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  const { data: queriesData } = useQuery<{
    slsQueries: Array<{ id: string; name: string; queryString: string; version: number }>;
  }>(GET_SLS_QUERIES, { variables: { sessionId } });

  const [createQuery] = useMutation(CREATE_QUERY, {
    refetchQueries: [{ query: GET_SLS_QUERIES, variables: { sessionId } }],
  });

  const [updateQuery] = useMutation(UPDATE_QUERY, {
    refetchQueries: [{ query: GET_SLS_QUERIES, variables: { sessionId } }],
  });

  const queries = queriesData?.slsQueries ?? [];

  const handleSaveQuery = useCallback(
    async (data: { name: string; queryString: string; dateFrom?: string; dateTo?: string }) => {
      if (editingQuery) {
        await updateQuery({
          variables: {
            id: editingQuery.id,
            queryString: data.queryString,
            dateFrom: data.dateFrom ?? null,
            dateTo: data.dateTo ?? null,
          },
        });
      } else {
        await createQuery({
          variables: {
            sessionId,
            name: data.name,
            queryString: data.queryString,
            dateFrom: data.dateFrom ?? null,
            dateTo: data.dateTo ?? null,
          },
        });
      }
      setShowBuilder(false);
      setEditingQuery(null);
    },
    [editingQuery, sessionId, createQuery, updateQuery],
  );

  const handleCancel = useCallback(() => {
    setShowBuilder(false);
    setEditingQuery(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    setEditingQuery(null);
    setShowBuilder(true);
  }, []);

  const handleSelectQuery = useCallback(
    (id: string) => {
      setActiveQueryId(id);
      const q = queries.find((query) => query.id === id);
      if (q) {
        setEditingQuery(q);
        setShowBuilder(true);
      }
    },
    [queries],
  );

  const handleExecutionStarted = useCallback((executionId: string) => {
    setActiveExecutionId(executionId);
  }, []);

  const handleExecutionComplete = useCallback(() => {
    setActiveExecutionId(null);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" data-testid="queries-tab">
      {/* Left: Query list */}
      <div className="lg:col-span-1">
        <QueryList
          sessionId={sessionId}
          activeQueryId={activeQueryId ?? undefined}
          onSelect={handleSelectQuery}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Right: Query editor + execution */}
      <div className="space-y-4 lg:col-span-2">
        {showBuilder && (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <QueryBuilder
              sessionId={sessionId}
              query={editingQuery ?? undefined}
              onSave={handleSaveQuery}
              onCancel={handleCancel}
            />
          </div>
        )}

        {activeQueryId && (
          <div className="flex items-center justify-end">
            <ExecuteQueryButton
              queryId={activeQueryId}
              sessionId={sessionId}
              sessionStatus={sessionStatus}
              hasValidationErrors={false}
              onExecutionStarted={handleExecutionStarted}
            />
          </div>
        )}

        {activeExecutionId && (
          <QueryExecutionProgress
            executionId={activeExecutionId}
            onComplete={handleExecutionComplete}
          />
        )}

        {activeQueryId && <QueryExecutionHistory queryId={activeQueryId} />}

        {!showBuilder && !activeQueryId && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] py-16">
            <p className="text-sm text-[var(--cortex-text-muted)]">
              Select a query from the list or create a new one to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Articles
// ---------------------------------------------------------------------------

function ArticlesTab({ sessionId }: { sessionId: string }) {
  return (
    <div data-testid="articles-tab">
      <ArticlePoolDashboard sessionId={sessionId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: AI Scoring
// ---------------------------------------------------------------------------

function AiScoringTab({ sessionId, isLocked }: { sessionId: string; isLocked: boolean }) {
  const { data: countData } = useQuery<{ articleCountByStatus: StatusCount[] }>(
    GET_ARTICLE_COUNT_BY_STATUS,
    { variables: { sessionId } },
  );

  const { data: statsData } = useQuery<{ aiScoringStats: AiScoringStats }>(GET_AI_SCORING_STATS, {
    variables: { sessionId },
  });

  const statusCounts = countData?.articleCountByStatus ?? [];
  const pendingCount = statusCounts.find((s) => s.status === 'PENDING')?.count ?? 0;
  const scoringStats = statsData?.aiScoringStats ?? {
    likelyRelevantCount: 0,
    uncertainCount: 0,
    likelyIrrelevantCount: 0,
    totalScored: 0,
    acceptanceRate: 0,
  };

  return (
    <div className="space-y-6" data-testid="ai-scoring-tab">
      {/* Launch button and stats */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <AiAcceptanceRate stats={scoringStats} />
        </div>
        <div className="ml-4">
          <LaunchAiScreeningButton
            sessionId={sessionId}
            pendingCount={pendingCount}
            isLocked={isLocked}
          />
        </div>
      </div>

      {/* Configuration: thresholds + custom filters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RelevanceThresholdConfig sessionId={sessionId} />
        <CustomAiFilterEditor sessionId={sessionId} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Screening
// ---------------------------------------------------------------------------

function ScreeningTab({ sessionId }: { sessionId: string }) {
  return (
    <div className="space-y-6" data-testid="screening-tab">
      <div className="rounded-lg bg-white shadow-sm" style={{ minHeight: 500 }}>
        <ScreeningPanel sessionId={sessionId} />
      </div>
      <ExclusionCodeManager sessionId={sessionId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Review & Lock
// ---------------------------------------------------------------------------

function ReviewLockTab({ sessionId }: { sessionId: string }) {
  const [spotCheckCategory, setSpotCheckCategory] = useState('likely_relevant');

  return (
    <div className="space-y-6" data-testid="review-lock-tab">
      {/* Review gates */}
      <ReviewGateStatus sessionId={sessionId} />

      {/* Spot check */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">Spot Check</h3>
        <div className="mb-4 flex gap-2">
          {['likely_relevant', 'likely_irrelevant'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSpotCheckCategory(cat)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                spotCheckCategory === cat
                  ? 'bg-[var(--cortex-blue-500)] text-white'
                  : 'border border-[var(--cortex-border)] text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]',
              )}
              data-testid={`spot-check-cat-${cat}`}
            >
              {cat === 'likely_relevant' ? 'Likely Relevant' : 'Likely Irrelevant'}
            </button>
          ))}
        </div>
        <SpotCheckView sessionId={sessionId} category={spotCheckCategory} sampleSize={10} />
      </div>

      {/* Lock */}
      <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">Lock Dataset</h3>
          <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
            Once locked, no further changes can be made to the article pool.
          </p>
        </div>
        <LockDatasetButton sessionId={sessionId} />
      </div>

      {/* PRISMA Flow Chart placeholder (shown once PRISMA data available) */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: PDFs & References
// ---------------------------------------------------------------------------

function PdfsRefsTab({ sessionId }: { sessionId: string }) {
  const [pdfFilter, setPdfFilter] = useState<string | undefined>(undefined);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleFilter, setArticleFilter] = useState<ArticleFilter>({ status: 'INCLUDED' });

  // Keep pdfStatus in sync with panel filter
  const handlePdfFilterChange = (pdfStatus: string | undefined) => {
    setPdfFilter(pdfStatus);
    setArticleFilter((prev) => ({ ...prev, pdfStatus }));
  };

  return (
    <div className="space-y-6" data-testid="pdfs-refs-tab">
      <PdfRetrievalPanel sessionId={sessionId} onFilterByPdfStatus={handlePdfFilterChange} />
      {pdfFilter && (
        <div data-testid="pdf-filtered-articles">
          <h4 className="mb-2 text-sm font-medium text-[var(--cortex-text-primary)]">
            Articles with PDF status: <span className="font-semibold">{pdfFilter}</span>
          </h4>
          <ArticleTable
            sessionId={sessionId}
            onArticleSelect={setSelectedArticleId}
            filter={articleFilter}
            onFilterChange={setArticleFilter}
          />
        </div>
      )}
      <PdfMismatchReview sessionId={sessionId} />
      <MinedReferenceReview sessionId={sessionId} />
      <ManualArticleAddForm sessionId={sessionId} />

      {selectedArticleId && (
        <ArticleDetailPanel
          articleId={selectedArticleId}
          onClose={() => setSelectedArticleId(null)}
          articleIds={[]}
          onNavigate={setSelectedArticleId}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component: SessionDashboard
// ---------------------------------------------------------------------------

interface SessionDashboardProps {
  sessionId: string;
  projectId: string;
}

export function SessionDashboard({ sessionId, projectId }: SessionDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('queries');

  const { data, loading, error } = useQuery<{ slsSession: SlsSession }>(GET_SLS_SESSION, {
    variables: { id: sessionId },
  });

  const { data: countData } = useQuery<{ articleCountByStatus: StatusCount[] }>(
    GET_ARTICLE_COUNT_BY_STATUS,
    { variables: { sessionId } },
  );

  const { data: queriesData } = useQuery<{ slsQueries: Array<{ id: string }> }>(GET_SLS_QUERIES, {
    variables: { sessionId },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading session...</p>
      </div>
    );
  }

  if (error || !data?.slsSession) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-error)]">Failed to load session.</p>
      </div>
    );
  }

  const session = data.slsSession;
  const isLocked = session.status === 'LOCKED';
  const scopeEntries = session.scopeFields
    ? Object.entries(session.scopeFields).filter(([, v]) => v)
    : [];

  // Compute real metrics
  const statusCounts = countData?.articleCountByStatus ?? [];
  const totalArticles = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const includedCount = statusCounts.find((s) => s.status === 'INCLUDED')?.count ?? 0;
  const excludedCount = statusCounts.find((s) => s.status === 'EXCLUDED')?.count ?? 0;
  const screenedCount = includedCount + excludedCount;
  const screeningProgress =
    totalArticles > 0 ? Math.round((screenedCount / totalArticles) * 100) : 0;
  const queryCount = queriesData?.slsQueries?.length ?? 0;

  return (
    <div className="space-y-6" data-testid="session-dashboard">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href = `/projects/${projectId}/sls`;
              }}
              className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-gray-50 hover:text-[var(--cortex-text-primary)]"
              data-testid="back-btn"
              aria-label="Back to SLS list"
            >
              <ArrowLeft size={18} />
            </button>
            <Search size={20} className="text-[var(--cortex-blue-500)]" />
            <div>
              <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
                {session.name}
              </h1>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                {typeLabels[session.type] ?? session.type}
              </p>
            </div>
            <StatusBadge variant={mapStatusToVariant(session.status)} />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="metrics-grid">
        <MetricCard icon={<FileText size={20} />} label="Articles" value={totalArticles} />
        <MetricCard
          icon={<ListChecks size={20} />}
          label="Screening Progress"
          value={`${screeningProgress}%`}
        />
        <MetricCard icon={<Search size={20} />} label="Queries" value={queryCount} />
      </div>

      {/* SOA Transition Banner */}
      <SoaTransitionBanner sessionId={sessionId} projectId={projectId} isLocked={isLocked} />

      {/* Scope Fields (collapsible) */}
      {scopeEntries.length > 0 && (
        <details className="rounded-lg bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--cortex-text-secondary)]">
            <BarChart3 size={16} />
            Scope Configuration ({scopeEntries.length} fields)
          </summary>
          <div
            className="border-t border-[var(--cortex-border)] px-4 pb-4 pt-3"
            data-testid="scope-fields-card"
          >
            <dl className="space-y-3 text-sm">
              {scopeEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[var(--cortex-text-muted)]">
                    {scopeFieldLabels[key] ?? key}
                  </dt>
                  <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      )}

      {/* Workflow Tabs */}
      <div
        className="flex gap-1 overflow-x-auto border-b border-gray-200"
        role="tablist"
        data-testid="workflow-tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-[var(--cortex-blue-500)] text-[var(--cortex-blue-600)]'
                  : 'border-transparent text-[var(--cortex-text-muted)] hover:border-gray-300 hover:text-[var(--cortex-text-secondary)]',
              )}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div data-testid="tab-content">
        {activeTab === 'queries' && (
          <QueriesTab sessionId={sessionId} sessionStatus={session.status} />
        )}
        {activeTab === 'articles' && <ArticlesTab sessionId={sessionId} />}
        {activeTab === 'ai-scoring' && <AiScoringTab sessionId={sessionId} isLocked={isLocked} />}
        {activeTab === 'screening' && <ScreeningTab sessionId={sessionId} />}
        {activeTab === 'pdfs-refs' && <PdfsRefsTab sessionId={sessionId} />}
        {activeTab === 'review-lock' && <ReviewLockTab sessionId={sessionId} />}
      </div>
    </div>
  );
}
