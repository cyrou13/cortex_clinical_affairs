import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { PmsDashboard } from '../../../../../features/pms/components/PmsDashboard';
import { PmsPlanForm } from '../../../../../features/pms/components/PmsPlanForm';
import { GET_PMS_PLANS } from '../../../../../features/pms/graphql/queries';
import { DELETE_PMS_PLAN } from '../../../../../features/pms/graphql/mutations';
import { Activity, Plus } from 'lucide-react';
import { navigate } from '../../../../../router';

export default function PmsIndexPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Extract projectId from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  const [deletePlan] = useMutation(DELETE_PMS_PLAN, {
    refetchQueries: [{ query: GET_PMS_PLANS, variables: { projectId } }],
  });

  function handlePlanCreated(planId: string) {
    setShowCreateForm(false);
    navigate(`/projects/${projectId}/pms/${planId}`);
  }

  async function handleDeletePlan(planId: string) {
    await deletePlan({ variables: { pmsPlanId: planId } });
  }

  /**
   * PmsDashboard renders plan cards as <article data-testid="plan-card-{id}">.
   * We capture clicks via event delegation on the wrapper div.
   */
  function handleDashboardClick(e: React.MouseEvent) {
    const article = (e.target as HTMLElement).closest<HTMLElement>('[data-testid^="plan-card-"]');
    if (article) {
      const testId = article.getAttribute('data-testid') ?? '';
      const planId = testId.replace('plan-card-', '');
      if (planId) {
        navigate(`/projects/${projectId}/pms/${planId}`);
      }
    }
  }

  return (
    <div className="space-y-6" data-testid="pms-index-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-[var(--cortex-blue-500)]" />
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            Post-Market Surveillance
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          data-testid="create-plan-btn"
        >
          <Plus size={16} />
          New PMS Plan
        </button>
      </div>

      {/* Dashboard with click delegation for plan cards */}
      <div onClick={handleDashboardClick}>
        <PmsDashboard projectId={projectId} onDeletePlan={handleDeletePlan} />
      </div>

      {/* Create form dialog */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateForm(false)}
            data-testid="dialog-backdrop"
          />
          <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[var(--cortex-text-primary)]">
              Create PMS Plan
            </h2>
            <PmsPlanForm
              projectId={projectId}
              onSuccess={handlePlanCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
