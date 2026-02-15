import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Lock, FileText, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export const GET_CER_DETAILS = gql`
  query GetCerDetails($cerId: String!) {
    cerReport(id: $cerId) {
      id
      version
      status
      regulatoryContext
      upstreamModules {
        id
        name
        type
        status
        lockedAt
      }
      sections {
        id
        sectionNumber
        title
        status
        wordCount
      }
      externalDocuments {
        id
        title
        type
        version
        currentVersion
      }
      traceabilityCoverage
    }
  }
`;

interface UpstreamModule {
  id: string;
  name: string;
  type: string;
  status: string;
  lockedAt: string | null;
}

interface CerSection {
  id: string;
  sectionNumber: number;
  title: string;
  status: 'DRAFT' | 'REVIEWED' | 'FINALIZED';
  wordCount: number;
}

interface ExternalDoc {
  id: string;
  title: string;
  type: string;
  version: string;
  currentVersion: string;
}

interface CerDashboardProps {
  cerId: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700' },
    REVIEWED: { bg: 'bg-orange-100', text: 'text-orange-700' },
    FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    LOCKED: { bg: 'bg-gray-800', text: 'text-white' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`} data-testid="status-badge">
      {status}
    </span>
  );
}

export function CerDashboard({ cerId }: CerDashboardProps) {
  const { data, loading, error } = useQuery(GET_CER_DETAILS, { variables: { cerId } });

  if (loading) {
    return <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="cer-loading">Loading CER...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-sm text-[var(--cortex-error)]" data-testid="cer-error">Failed to load CER.</div>;
  }

  const cer = data?.cerReport;
  if (!cer) {
    return <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="cer-not-found">CER not found.</div>;
  }

  const sections: CerSection[] = cer.sections ?? [];
  const modules: UpstreamModule[] = cer.upstreamModules ?? [];
  const docs: ExternalDoc[] = cer.externalDocuments ?? [];
  const traceability: number = cer.traceabilityCoverage ?? 0;
  const mismatchCount = docs.filter((d) => d.version !== d.currentVersion).length;

  return (
    <div className="space-y-6" data-testid="cer-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cortex-text-primary)]">CER v{cer.version}</h2>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={cer.status} />
            <span className="text-xs text-[var(--cortex-text-muted)]">{cer.regulatoryContext?.replace('_', ' ')}</span>
          </div>
        </div>
        {mismatchCount > 0 && (
          <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm text-orange-700" data-testid="mismatch-warning">
            <AlertTriangle size={14} />
            {mismatchCount} version mismatch{mismatchCount > 1 ? 'es' : ''}
          </div>
        )}
      </div>

      {/* Upstream Modules */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="upstream-modules-section">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <Lock size={14} /> Linked Upstream Modules
        </h3>
        <div className="space-y-2">
          {modules.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between rounded border border-[var(--cortex-border)] p-2 text-sm" data-testid={`module-${mod.id}`}>
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-emerald-500" />
                <span className="text-[var(--cortex-text-primary)]">{mod.name}</span>
              </div>
              <StatusBadge status={mod.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Section Completion Grid */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="section-completion-grid">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <FileText size={14} /> CER Sections ({sections.filter((s) => s.status === 'FINALIZED').length}/{sections.length} finalized)
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`flex flex-col items-center rounded border p-2 text-center text-xs ${
                section.status === 'FINALIZED'
                  ? 'border-emerald-200 bg-emerald-50'
                  : section.status === 'REVIEWED'
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-200 bg-gray-50'
              }`}
              data-testid={`section-cell-${section.sectionNumber}`}
            >
              <span className="font-semibold">{section.sectionNumber}</span>
              <StatusBadge status={section.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Traceability Coverage */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="traceability-coverage">
        <h3 className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">Traceability Coverage</h3>
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${traceability >= 95 ? 'bg-emerald-500' : traceability >= 80 ? 'bg-orange-500' : 'bg-red-500'}`}
              style={{ width: `${traceability}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-[var(--cortex-text-primary)]">{traceability}%</span>
        </div>
      </div>

      {/* External Documents */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="external-docs-section">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <ExternalLink size={14} /> External Documents
        </h3>
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded border border-[var(--cortex-border)] p-2 text-sm"
              data-testid={`ext-doc-${doc.id}`}
            >
              <div>
                <span className="text-[var(--cortex-text-primary)]">{doc.title}</span>
                <span className="ml-2 text-xs text-[var(--cortex-text-muted)]">v{doc.version}</span>
              </div>
              {doc.version !== doc.currentVersion && (
                <span className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertTriangle size={12} /> Update available (v{doc.currentVersion})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
