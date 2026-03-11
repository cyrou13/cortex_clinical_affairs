import { SessionDashboard } from '../../../../../features/sls/components/SessionDashboard';

export default function SlsSessionDetailPage() {
  // Extract projectId and sessionId from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';
  const sessionId = pathParts[pathParts.indexOf('sls-sessions') + 1] ?? '';

  return (
    <div className="flex h-full flex-col" data-testid="sls-session-detail-page">
      <div className="flex-1 overflow-auto bg-[var(--cortex-bg-secondary)] p-6">
        <SessionDashboard sessionId={sessionId} projectId={projectId} />
      </div>
    </div>
  );
}
