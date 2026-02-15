import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Lock, FileText, CheckCircle, Clock, Edit3 } from 'lucide-react';

export const GET_SOA_DETAILS = gql`
  query GetSoaDetails($soaId: String!) {
    soaAnalysis(id: $soaId) {
      id
      name
      type
      status
      description
      linkedSessions {
        id
        name
        lockedAt
      }
      sections {
        id
        sectionKey
        title
        status
        orderIndex
      }
    }
  }
`;

interface ThematicSection {
  id: string;
  sectionKey: string;
  title: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED';
  orderIndex: number;
}

interface SoaDashboardProps {
  soaId: string;
}

function SectionStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'FINALIZED':
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'IN_PROGRESS':
      return <Edit3 size={14} className="text-blue-500" />;
    default:
      return <Clock size={14} className="text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700' },
    IN_PROGRESS: { bg: 'bg-blue-500', text: 'text-white' },
    LOCKED: { bg: 'bg-blue-800', text: 'text-white' },
    FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`} data-testid="status-badge">
      {status.replace('_', ' ')}
    </span>
  );
}

export function SoaDashboard({ soaId }: SoaDashboardProps) {
  const { data, loading, error } = useQuery(GET_SOA_DETAILS, {
    variables: { soaId },
  });

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="soa-loading">
        Loading SOA analysis...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-error)]" data-testid="soa-error">
        Failed to load SOA analysis.
      </div>
    );
  }

  const soa = data?.soaAnalysis;
  if (!soa) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="soa-not-found">
        SOA analysis not found.
      </div>
    );
  }

  const sections: ThematicSection[] = [...(soa.sections ?? [])].sort(
    (a: ThematicSection, b: ThematicSection) => a.orderIndex - b.orderIndex,
  );
  const finalizedCount = sections.filter((s) => s.status === 'FINALIZED').length;

  return (
    <div className="space-y-6" data-testid="soa-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cortex-text-primary)]" data-testid="soa-name">
            {soa.name}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={soa.status} />
            <span className="text-xs text-[var(--cortex-text-muted)]">
              {soa.type.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="text-right text-sm text-[var(--cortex-text-muted)]" data-testid="progress-summary">
          {finalizedCount}/{sections.length} sections finalized
        </div>
      </div>

      <div className="rounded-lg border border-[var(--cortex-border)] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <Lock size={14} /> Linked SLS Sessions
        </h3>
        <div className="space-y-1" data-testid="linked-sessions">
          {(soa.linkedSessions ?? []).map((s: { id: string; name: string }) => (
            <div key={s.id} className="flex items-center gap-2 text-sm text-[var(--cortex-text-primary)]" data-testid={`linked-session-${s.id}`}>
              <Lock size={12} className="text-blue-500" />
              {s.name}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--cortex-border)]">
        <div className="border-b border-[var(--cortex-border)] px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
            <FileText size={14} /> Thematic Sections
          </h3>
        </div>
        <div className="divide-y divide-[var(--cortex-border)]" data-testid="section-list">
          {sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between px-4 py-3"
              data-testid={`section-${section.sectionKey}`}
            >
              <div className="flex items-center gap-3">
                <SectionStatusIcon status={section.status} />
                <div>
                  <div className="text-sm font-medium text-[var(--cortex-text-primary)]">
                    {section.sectionKey.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-[var(--cortex-text-muted)]">{section.title}</div>
                </div>
              </div>
              <StatusBadge status={section.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" data-testid="progress-bar">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${sections.length > 0 ? (finalizedCount / sections.length) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
