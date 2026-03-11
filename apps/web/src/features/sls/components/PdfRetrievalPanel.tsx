import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Download, Loader2, FileText, FileX, AlertTriangle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export const LAUNCH_PDF_RETRIEVAL = gql`
  mutation LaunchPdfRetrieval($sessionId: String!) {
    launchPdfRetrieval(sessionId: $sessionId) {
      taskId
      articleCount
    }
  }
`;

export const GET_PDF_RETRIEVAL_STATS = gql`
  query GetPdfRetrievalStats($sessionId: String!) {
    pdfRetrievalStats(sessionId: $sessionId) {
      totalIncluded
      pdfFound
      pdfNotFound
      mismatches
      verified
      retrieving
    }
  }
`;

interface PdfRetrievalPanelProps {
  sessionId: string;
  onFilterByPdfStatus?: (pdfStatus: string | undefined) => void;
}

export function PdfRetrievalPanel({ sessionId, onFilterByPdfStatus }: PdfRetrievalPanelProps) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);

  const {
    data: statsData,
    startPolling,
    stopPolling,
  } = useQuery<any>(GET_PDF_RETRIEVAL_STATS, {
    variables: { sessionId },
    fetchPolicy: 'network-only',
  });

  const [launchRetrieval, { loading: launching }] = useMutation<any>(LAUNCH_PDF_RETRIEVAL);

  const stats = statsData?.pdfRetrievalStats;
  const retrievingCount = stats?.retrieving ?? 0;
  const isRetrieving = retrievingCount > 0 || !!taskId;

  // Poll while task is active
  useEffect(() => {
    if (isRetrieving) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [isRetrieving, startPolling, stopPolling]);

  // Clear taskId when retrieving drops to 0
  useEffect(() => {
    if (taskId && stats && retrievingCount === 0) {
      setTaskId(null);
    }
  }, [taskId, stats, retrievingCount]);

  const percentFound =
    stats?.totalIncluded > 0 ? Math.round((stats.pdfFound / stats.totalIncluded) * 100) : 0;

  const handleLaunch = async () => {
    const result = await launchRetrieval({ variables: { sessionId } });
    if (result.data?.launchPdfRetrieval?.taskId) {
      setTaskId(result.data.launchPdfRetrieval.taskId);
    }
  };

  const handleFilter = (pdfStatus: string) => {
    const newFilter = activeFilter === pdfStatus ? undefined : pdfStatus;
    setActiveFilter(newFilter);
    onFilterByPdfStatus?.(newFilter);
  };

  return (
    <div className="space-y-4" data-testid="pdf-retrieval-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">PDF Retrieval</h3>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching || isRetrieving}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="launch-retrieval-btn"
        >
          {isRetrieving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isRetrieving ? 'Retrieving...' : 'Retrieve PDFs'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="space-y-3" data-testid="pdf-stats">
          {/* Progress bar */}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            data-testid="pdf-progress-bar"
          >
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${percentFound}%` }}
            />
          </div>

          {/* Clickable stat cards */}
          <div className="grid grid-cols-5 gap-3">
            <div
              className="rounded border border-[var(--cortex-border)] p-3 text-center"
              data-testid="stat-total"
            >
              <div className="text-xl font-bold text-[var(--cortex-text-primary)]">
                {stats.totalIncluded}
              </div>
              <div className="text-xs text-[var(--cortex-text-muted)]">Total</div>
            </div>
            <button
              type="button"
              onClick={() => handleFilter('FOUND')}
              className={cn(
                'rounded border p-3 text-center transition-all hover:shadow-md',
                activeFilter === 'FOUND'
                  ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300'
                  : 'border-emerald-200 bg-emerald-50',
              )}
              data-testid="stat-found"
            >
              <div className="flex items-center justify-center gap-1">
                <FileText size={14} className="text-emerald-600" />
                <span className="text-xl font-bold text-emerald-600">{stats.pdfFound}</span>
              </div>
              <div className="text-xs text-emerald-600">Found</div>
            </button>
            <button
              type="button"
              onClick={() => handleFilter('NOT_FOUND')}
              className={cn(
                'rounded border p-3 text-center transition-all hover:shadow-md',
                activeFilter === 'NOT_FOUND'
                  ? 'border-red-500 bg-red-100 ring-2 ring-red-300'
                  : 'border-gray-200 bg-gray-50',
              )}
              data-testid="stat-not-found"
            >
              <div className="flex items-center justify-center gap-1">
                <FileX size={14} className="text-red-500" />
                <span className="text-xl font-bold text-red-500">{stats.pdfNotFound}</span>
              </div>
              <div className="text-xs text-red-500">Not Found</div>
            </button>
            <button
              type="button"
              onClick={() => handleFilter('MISMATCH')}
              className={cn(
                'rounded border p-3 text-center transition-all hover:shadow-md',
                activeFilter === 'MISMATCH'
                  ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300'
                  : 'border-orange-200 bg-orange-50',
              )}
              data-testid="stat-mismatches"
            >
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle size={14} className="text-orange-600" />
                <span className="text-xl font-bold text-orange-600">{stats.mismatches}</span>
              </div>
              <div className="text-xs text-orange-600">Mismatches</div>
            </button>
            <div
              className="rounded border border-blue-200 bg-blue-50 p-3 text-center"
              data-testid="stat-verified"
            >
              <div className="text-xl font-bold text-blue-600">{stats.verified}</div>
              <div className="text-xs text-blue-600">Verified</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--cortex-text-muted)]" data-testid="pdf-percent">
              {percentFound}% PDFs retrieved
            </span>
            {activeFilter && (
              <button
                type="button"
                onClick={() => {
                  setActiveFilter(undefined);
                  onFilterByPdfStatus?.(undefined);
                }}
                className="text-xs text-blue-600 underline"
                data-testid="clear-pdf-filter"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
