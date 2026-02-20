import { useCallback } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  PipelineProgressBar,
  type PipelineNodeStatus,
} from '../../../../shared/components/PipelineProgressBar';
import { Users, FileText, Clock } from 'lucide-react';
import { navigate } from '../../../../router';

const PROJECT_DASHBOARD_QUERY = gql`
  query ProjectDashboard($id: String!) {
    projectDashboard(id: $id) {
      id
      name
      deviceName
      deviceClass
      regulatoryContext
      status
      createdAt
      cep {
        id
        scope
        objectives
        deviceClassification
        clinicalBackground
      }
      members {
        id
        userId
        role
        user {
          id
          name
          email
          avatarUrl
        }
      }
      pipelineStatus {
        sls
        soa
        validation
        cer
        pms
      }
      recentActivity
    }
  }
`;

interface DashboardData {
  projectDashboard: {
    id: string;
    name: string;
    deviceName: string;
    deviceClass: string;
    regulatoryContext: string;
    status: string;
    createdAt: string;
    cep: {
      id: string;
      scope: string | null;
      objectives: string | null;
      deviceClassification: string | null;
      clinicalBackground: string | null;
    } | null;
    members: Array<{
      id: string;
      userId: string;
      role: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
      };
    }>;
    pipelineStatus: {
      sls: string;
      soa: string;
      validation: string;
      cer: string;
      pms: string;
    };
    recentActivity: Array<{
      id: string;
      action: string;
      userId: string;
      timestamp: string;
    }>;
  };
}

const contextLabels: Record<string, string> = {
  CE_MDR: 'CE-MDR',
  FDA_510K: 'FDA 510(k)',
  BOTH: 'CE-MDR + FDA',
};

function mapModuleStatus(status: string): PipelineNodeStatus {
  const map: Record<string, PipelineNodeStatus> = {
    NOT_STARTED: 'not_started',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    LOCKED: 'locked',
    BLOCKED: 'blocked',
  };
  return map[status] ?? 'not_started';
}

export default function ProjectDashboardPage() {
  // Extract projectId from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  const handlePipelineClick = useCallback(
    (nodeId: string) => {
      const moduleRoutes: Record<string, string> = {
        sls: `/projects/${projectId}/sls-sessions`,
        soa: `/projects/${projectId}/soa`,
        validation: `/projects/${projectId}/validation`,
        cer: `/projects/${projectId}/cer`,
        pms: `/projects/${projectId}/pms`,
      };
      const route = moduleRoutes[nodeId];
      if (route) navigate(route);
    },
    [projectId],
  );

  const { data, loading, error } = useQuery<DashboardData>(PROJECT_DASHBOARD_QUERY, {
    variables: { id: projectId },
    skip: !projectId,
  });

  const dashboard = data?.projectDashboard;
  const pipelineNodes = dashboard
    ? [
        { id: 'sls', label: 'SLS', status: mapModuleStatus(dashboard.pipelineStatus.sls) },
        { id: 'soa', label: 'SOA', status: mapModuleStatus(dashboard.pipelineStatus.soa) },
        {
          id: 'validation',
          label: 'Validation',
          status: mapModuleStatus(dashboard.pipelineStatus.validation),
        },
        { id: 'cer', label: 'CER', status: mapModuleStatus(dashboard.pipelineStatus.cer) },
        { id: 'pms', label: 'PMS', status: mapModuleStatus(dashboard.pipelineStatus.pms) },
      ]
    : [];

  return (
    <div className="space-y-6">
      {loading && (
        <div className="py-12 text-center text-sm text-[var(--cortex-text-muted)]">
          Loading project dashboard...
        </div>
      )}

      {(error || (!loading && !dashboard)) && (
        <div className="py-12 text-center text-sm text-[var(--cortex-error)]">
          Failed to load project dashboard.
        </div>
      )}

      {dashboard && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
              {dashboard.name}
            </h1>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              {dashboard.deviceName} — Class {dashboard.deviceClass} —{' '}
              {contextLabels[dashboard.regulatoryContext] ?? dashboard.regulatoryContext}
            </p>
          </div>

          {/* Pipeline */}
          <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-[var(--cortex-text-secondary)]">
              Pipeline Status
            </h2>
            <PipelineProgressBar nodes={pipelineNodes} onNodeClick={handlePipelineClick} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Device Info */}
            <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                <FileText size={16} />
                Device Information
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--cortex-text-muted)]">Device Name</dt>
                  <dd className="font-medium">{dashboard.deviceName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--cortex-text-muted)]">Class</dt>
                  <dd className="font-medium">{dashboard.deviceClass}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--cortex-text-muted)]">Regulatory Context</dt>
                  <dd className="font-medium">
                    {contextLabels[dashboard.regulatoryContext] ?? dashboard.regulatoryContext}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--cortex-text-muted)]">Status</dt>
                  <dd className="font-medium">{dashboard.status}</dd>
                </div>
              </dl>
            </div>

            {/* CEP Summary */}
            {dashboard.cep && (
              <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                  <FileText size={16} />
                  Clinical Evaluation Plan
                </h2>
                <dl className="space-y-2 text-sm">
                  {dashboard.cep.scope && (
                    <div>
                      <dt className="text-[var(--cortex-text-muted)]">Scope</dt>
                      <dd className="mt-0.5">{dashboard.cep.scope}</dd>
                    </div>
                  )}
                  {dashboard.cep.objectives && (
                    <div>
                      <dt className="text-[var(--cortex-text-muted)]">Objectives</dt>
                      <dd className="mt-0.5">{dashboard.cep.objectives}</dd>
                    </div>
                  )}
                  {!dashboard.cep.scope && !dashboard.cep.objectives && (
                    <p className="text-[var(--cortex-text-muted)]">CEP not yet configured.</p>
                  )}
                </dl>
              </div>
            )}

            {/* Team Members */}
            <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                <Users size={16} />
                Team ({dashboard.members.length})
              </h2>
              <div className="space-y-2">
                {dashboard.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 text-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cortex-blue-100)] text-xs font-medium text-[var(--cortex-blue-700)]">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">{member.user.name}</span>
                      <span className="ml-2 text-xs text-[var(--cortex-text-muted)]">
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                <Clock size={16} />
                Recent Activity
              </h2>
              {dashboard.recentActivity.length === 0 ? (
                <p className="text-sm text-[var(--cortex-text-muted)]">No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.recentActivity.map((activity: any, index: number) => (
                    <div key={activity.id ?? index} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--cortex-blue-300)]" />
                      <span>{activity.action}</span>
                      <span className="text-xs text-[var(--cortex-text-muted)]">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
