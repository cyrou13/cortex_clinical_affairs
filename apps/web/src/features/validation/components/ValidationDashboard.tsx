import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { BarChart3, FileText, Link, CheckCircle } from 'lucide-react';

export const GET_VALIDATION_STUDY = gql`
  query GetValidationStudy($studyId: String!) {
    validationStudy(id: $studyId) {
      id
      name
      status
      type
      soaAnalysis {
        id
        name
      }
      protocol {
        version
        status
      }
      importCount
      results {
        metCount
        totalCount
      }
      reports {
        id
        type
        generatedAt
      }
    }
  }
`;

interface Report {
  id: string;
  type: string;
  generatedAt: string;
}

interface ValidationDashboardProps {
  studyId: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700' },
    IN_PROGRESS: { bg: 'bg-blue-500', text: 'text-white' },
    LOCKED: { bg: 'bg-blue-800', text: 'text-white' },
    COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
      data-testid="study-status"
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
      data-testid="study-type-badge"
    >
      {type}
    </span>
  );
}

export function ValidationDashboard({ studyId }: ValidationDashboardProps) {
  const { data, loading, error } = useQuery<any>(GET_VALIDATION_STUDY, {
    variables: { studyId },
  });

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="validation-loading"
      >
        Loading validation study...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="validation-error"
      >
        Failed to load validation study.
      </div>
    );
  }

  const study = data?.validationStudy;
  if (!study) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="validation-not-found"
      >
        Validation study not found.
      </div>
    );
  }

  const reports: Report[] = study.reports ?? [];

  return (
    <div className="space-y-6" data-testid="validation-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cortex-text-primary)]">{study.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={study.status} />
            <TypeBadge type={study.type} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--cortex-primary)]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--cortex-border)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--cortex-text-muted)]">
            <Link size={12} /> SOA Reference
          </div>
          <div
            className="mt-1 text-sm font-medium text-[var(--cortex-text-primary)]"
            data-testid="soa-link"
          >
            {study.soaAnalysis?.name ?? 'Not linked'}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--cortex-border)] p-4">
          <div className="text-xs text-[var(--cortex-text-muted)]">Protocol Version</div>
          <div
            className="mt-1 text-sm font-medium text-[var(--cortex-text-primary)]"
            data-testid="protocol-version"
          >
            {study.protocol?.version ? `v${study.protocol.version}` : 'No protocol'}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--cortex-border)] p-4">
          <div className="text-xs text-[var(--cortex-text-muted)]">Data Imports</div>
          <div
            className="mt-1 text-sm font-medium text-[var(--cortex-text-primary)]"
            data-testid="import-count"
          >
            {study.importCount ?? 0}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--cortex-border)] p-4">
          <div className="text-xs text-[var(--cortex-text-muted)]">Results</div>
          <div
            className="mt-1 text-sm font-medium text-[var(--cortex-text-primary)]"
            data-testid="results-summary"
          >
            {study.results
              ? `${study.results.metCount}/${study.results.totalCount} met`
              : 'No results'}
          </div>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="rounded-lg border border-[var(--cortex-border)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
            <FileText size={14} /> Reports
          </h3>
          <div className="space-y-2" data-testid="reports-list">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded border border-[var(--cortex-border)] p-2 text-sm"
                data-testid={`report-${report.id}`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-emerald-500" />
                  <span className="text-[var(--cortex-text-primary)]">
                    {report.type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-[var(--cortex-text-muted)]">
                  {report.generatedAt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
