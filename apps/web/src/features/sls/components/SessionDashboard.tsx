import { useQuery } from '@apollo/client/react';
import { FileText, Search, BarChart3, ListChecks } from 'lucide-react';
import { StatusBadge, type StatusVariant } from '../../../shared/components/StatusBadge';
import { GET_SLS_SESSION } from '../graphql/queries';
import type { SlsSessionType } from './SlsSidebar';

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

function mapStatusToVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    DRAFT: 'draft',
    SCREENING: 'screening',
    COMPLETED: 'completed',
    LOCKED: 'locked',
  };
  return map[status] ?? 'draft';
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
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

interface SessionDashboardProps {
  sessionId: string;
}

export function SessionDashboard({ sessionId }: SessionDashboardProps) {
  const { data, loading, error } = useQuery<{ slsSession: SlsSession }>(
    GET_SLS_SESSION,
    { variables: { id: sessionId } },
  );

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
  const scopeEntries = session.scopeFields
    ? Object.entries(session.scopeFields).filter(([, v]) => v)
    : [];

  return (
    <div className="space-y-6" data-testid="session-dashboard">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            {session.name}
          </h1>
          <StatusBadge variant={mapStatusToVariant(session.status)} />
        </div>
        <p className="mt-1 text-sm text-[var(--cortex-text-secondary)]">
          {typeLabels[session.type] ?? session.type} — Created{' '}
          {new Date(session.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="metrics-grid">
        <MetricCard
          icon={<FileText size={20} />}
          label="Articles"
          value={0}
        />
        <MetricCard
          icon={<ListChecks size={20} />}
          label="Screening Progress"
          value="0%"
        />
        <MetricCard
          icon={<Search size={20} />}
          label="Queries"
          value={0}
        />
      </div>

      {/* Scope Fields */}
      {scopeEntries.length > 0 && (
        <div className="rounded-lg bg-white p-4 shadow-sm" data-testid="scope-fields-card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
            <BarChart3 size={16} />
            Scope Configuration
          </h2>
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
      )}
    </div>
  );
}
