import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';

const GET_COMPARISON_TABLE = gql`
  query GetComparisonTable($soaAnalysisId: String!) {
    comparisonTable(soaAnalysisId: $soaAnalysisId) {
      headers
      rows {
        metricName
        values
      }
      metricNames
    }
  }
`;

interface ComparisonRow {
  metricName: string;
  values: string[];
}

interface ComparisonTableProps {
  soaAnalysisId: string;
}

export function ComparisonTable({ soaAnalysisId }: ComparisonTableProps) {
  const { data, loading, error } = useQuery<any>(GET_COMPARISON_TABLE, {
    variables: { soaAnalysisId },
  });

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="comparison-loading"
      >
        Loading device comparison...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="comparison-error"
      >
        Failed to load device comparison.
      </div>
    );
  }

  const comparison = data?.comparisonTable;
  if (!comparison) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="comparison-empty"
      >
        No comparison data available.
      </div>
    );
  }

  const headers: string[] = comparison.headers ?? [];
  const rows: ComparisonRow[] = comparison.rows ?? [];

  return (
    <div className="overflow-x-auto" data-testid="comparison-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--cortex-border)]">
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-[var(--cortex-text-muted)]">
              Metric
            </th>
            {headers.map((header, idx) => (
              <th
                key={header}
                className={`px-3 py-3 text-left text-sm font-medium ${idx === 0 ? 'bg-blue-50 text-[var(--cortex-blue-500)]' : 'text-[var(--cortex-text-primary)]'}`}
                data-testid={idx === 0 ? 'target-device-header' : `similar-device-header-${idx}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={row.metricName}
              className="border-b border-[var(--cortex-border)] hover:bg-gray-50"
              data-testid={`metric-row-${rowIdx}`}
            >
              <td className="px-3 py-2 text-sm font-medium text-[var(--cortex-text-primary)]">
                {row.metricName}
              </td>
              {row.values.map((val, colIdx) => (
                <td
                  key={colIdx}
                  className={`border-l border-[var(--cortex-border)] px-3 py-2 text-sm ${colIdx === 0 ? 'bg-blue-50 font-medium' : ''}`}
                  data-testid="cell-value"
                >
                  {val || 'N/A'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
