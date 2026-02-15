import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { SlsSidebar } from '../../../../../features/sls/components/SlsSidebar';
import { SessionDashboard } from '../../../../../features/sls/components/SessionDashboard';
import { SessionCreateForm } from '../../../../../features/sls/components/SessionCreateForm';
import { GET_SLS_SESSIONS } from '../../../../../features/sls/graphql/queries';

export default function SlsSessionDetailPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Extract projectId and sessionId from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';
  const sessionId = pathParts[pathParts.indexOf('sls-sessions') + 1] ?? '';

  // Pre-warm the sessions query for the sidebar
  useQuery(GET_SLS_SESSIONS, { variables: { projectId } });

  function handleNewSession() {
    setShowCreateForm(true);
  }

  function handleSelectSession(id: string) {
    window.location.href = `/projects/${projectId}/sls-sessions/${id}`;
  }

  function handleSessionCreated(id: string) {
    setShowCreateForm(false);
    window.location.href = `/projects/${projectId}/sls-sessions/${id}`;
  }

  return (
    <div className="flex h-full" data-testid="sls-session-detail-page">
      <SlsSidebar
        projectId={projectId}
        activeSessionId={sessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-[var(--cortex-bg-secondary)] p-6">
        <SessionDashboard sessionId={sessionId} />
      </div>

      {/* Create form modal */}
      {showCreateForm && (
        <SessionCreateForm
          projectId={projectId}
          onCreated={handleSessionCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
