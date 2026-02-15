import { useState } from 'react';
import { SlsSidebar } from '../../../../../features/sls/components/SlsSidebar';
import { SessionCreateForm } from '../../../../../features/sls/components/SessionCreateForm';
import { Search } from 'lucide-react';

export default function SlsSessionsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Extract projectId from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  function handleNewSession() {
    setShowCreateForm(true);
  }

  function handleSelectSession(sessionId: string) {
    window.location.href = `/projects/${projectId}/sls-sessions/${sessionId}`;
  }

  function handleSessionCreated(sessionId: string) {
    setShowCreateForm(false);
    window.location.href = `/projects/${projectId}/sls-sessions/${sessionId}`;
  }

  return (
    <div className="flex h-full" data-testid="sls-sessions-page">
      <SlsSidebar
        projectId={projectId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center bg-[var(--cortex-bg-secondary)] p-6">
        <div className="text-center">
          <Search
            size={48}
            className="mx-auto mb-3 text-[var(--cortex-text-muted)]"
          />
          <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
            SLS Sessions
          </h2>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            Select a session from the sidebar or create a new one to begin.
          </p>
        </div>
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
