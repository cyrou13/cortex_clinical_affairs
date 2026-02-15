import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Target, RefreshCw } from 'lucide-react';

export const GET_RESULTS_MAPPING = gql`
  query GetResultsMapping($studyId: String!) {
    resultsMapping(studyId: $studyId) {
      endpoints {
        name
        protocolTarget
        soaBenchmark
        resultValue
        ci95Lower
        ci95Upper
        status
      }
      summary {
        metCount
        totalCount
      }
    }
  }
`;

export const RECOMPUTE_RESULTS = gql`
  mutation RecomputeResults($studyId: String!) {
    recomputeResults(studyId: $studyId) {
      studyId
      status
    }
  }
`;

interface EndpointResult {
  name: string;
  protocolTarget: string;
  soaBenchmark: string;
  resultValue: string | null;
  ci95Lower: string | null;
  ci95Upper: string | null;
  status: 'MET' | 'NOT_MET' | 'PENDING';
}

interface ResultsMappingTableProps {
  studyId: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    MET: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    NOT_MET: { bg: 'bg-red-100', text: 'text-red-700' },
    PENDING: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
      data-testid={`status-${status}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function ResultsMappingTable({ studyId }: ResultsMappingTableProps) {
  const { data, loading } = useQuery(GET_RESULTS_MAPPING, {
    variables: { studyId },
  });

  const [recompute, { loading: recomputing }] = useMutation(RECOMPUTE_RESULTS);

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="results-loading">
        Loading results...
      </div>
    );
  }

  const endpoints: EndpointResult[] = data?.resultsMapping?.endpoints ?? [];
  const summary = data?.resultsMapping?.summary ?? { metCount: 0, totalCount: 0 };

  const handleRecompute = async () => {
    await recompute({ variables: { studyId } });
  };

  return (
    <div className="space-y-4" data-testid="results-mapping">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[var(--cortex-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
            Results Mapping
          </h3>
        </div>
        <button
          type="button"
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs hover:bg-[var(--cortex-bg-muted)] disabled:opacity-50"
          data-testid="recompute-btn"
        >
          <RefreshCw size={12} className={recomputing ? 'animate-spin' : ''} />
          {recomputing ? 'Recomputing...' : 'Recompute'}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-[var(--cortex-border)] p-3" data-testid="summary-bar">
        <span className="text-sm text-[var(--cortex-text-primary)]">
          <span className="font-semibold text-emerald-600" data-testid="met-count">{summary.metCount}</span>
          <span className="text-[var(--cortex-text-muted)]">/</span>
          <span className="font-semibold" data-testid="total-count">{summary.totalCount}</span>
          <span className="ml-1 text-[var(--cortex-text-muted)]">endpoints met</span>
        </span>
      </div>

      {endpoints.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-results">
          No results available. Import data and recompute.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="results-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="px-3 py-2 text-left text-xs font-medium">Endpoint</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Protocol Target</th>
                <th className="px-3 py-2 text-left text-xs font-medium">SOA Benchmark</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Result</th>
                <th className="px-3 py-2 text-left text-xs font-medium">95% CI</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep, idx) => (
                <tr
                  key={ep.name}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}
                  data-testid={`endpoint-row-${ep.name}`}
                >
                  <td className="border-r border-[#ECF0F1] px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                    {ep.name}
                  </td>
                  <td className="border-r border-[#ECF0F1] px-3 py-2 text-[var(--cortex-text-primary)]">
                    {ep.protocolTarget}
                  </td>
                  <td className="border-r border-[#ECF0F1] px-3 py-2 text-[var(--cortex-text-primary)]">
                    {ep.soaBenchmark}
                  </td>
                  <td className="border-r border-[#ECF0F1] px-3 py-2 text-[var(--cortex-text-primary)]">
                    {ep.resultValue ?? '—'}
                  </td>
                  <td className="border-r border-[#ECF0F1] px-3 py-2 text-[var(--cortex-text-muted)]">
                    {ep.ci95Lower != null && ep.ci95Upper != null
                      ? `[${ep.ci95Lower}, ${ep.ci95Upper}]`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={ep.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
