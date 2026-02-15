import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Download, Loader2 } from 'lucide-react';

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
      total
      found
      notFound
      mismatches
      retrieving
    }
  }
`;

interface PdfRetrievalPanelProps {
  sessionId: string;
}

export function PdfRetrievalPanel({ sessionId }: PdfRetrievalPanelProps) {
  const [taskId, setTaskId] = useState<string | null>(null);

  const { data: statsData } = useQuery(GET_PDF_RETRIEVAL_STATS, {
    variables: { sessionId },
  });

  const [launchRetrieval, { loading: launching }] = useMutation(LAUNCH_PDF_RETRIEVAL);

  const stats = statsData?.pdfRetrievalStats;
  const isRetrieving = stats?.retrieving > 0 || !!taskId;
  const percentFound = stats?.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0;

  const handleLaunch = async () => {
    const result = await launchRetrieval({ variables: { sessionId } });
    if (result.data?.launchPdfRetrieval?.taskId) {
      setTaskId(result.data.launchPdfRetrieval.taskId);
    }
  };

  return (
    <div className="space-y-4" data-testid="pdf-retrieval-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          PDF Retrieval
        </h3>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching || isRetrieving}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="launch-retrieval-btn"
        >
          {isRetrieving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {isRetrieving ? 'Retrieving...' : 'Retrieve PDFs'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="space-y-3" data-testid="pdf-stats">
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" data-testid="pdf-progress-bar">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${percentFound}%` }}
            />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded border border-[var(--cortex-border)] p-3 text-center" data-testid="stat-total">
              <div className="text-xl font-bold text-[var(--cortex-text-primary)]">{stats.total}</div>
              <div className="text-xs text-[var(--cortex-text-muted)]">Total</div>
            </div>
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-center" data-testid="stat-found">
              <div className="text-xl font-bold text-emerald-600">{stats.found}</div>
              <div className="text-xs text-emerald-600">Found</div>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-center" data-testid="stat-not-found">
              <div className="text-xl font-bold text-gray-500">{stats.notFound}</div>
              <div className="text-xs text-gray-500">Not Found</div>
            </div>
            <div className="rounded border border-orange-200 bg-orange-50 p-3 text-center" data-testid="stat-mismatches">
              <div className="text-xl font-bold text-orange-600">{stats.mismatches}</div>
              <div className="text-xs text-orange-600">Mismatches</div>
            </div>
          </div>

          <div className="text-sm text-[var(--cortex-text-muted)]" data-testid="pdf-percent">
            {percentFound}% PDFs retrieved
          </div>
        </div>
      )}
    </div>
  );
}
