import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { FlaskConical, ArrowRight, Plus } from 'lucide-react';
import { GET_SOA_ANALYSES_BY_SLS_SESSION } from '../../soa/graphql/queries';
import { CreateSoaDialog } from '../../soa/components/CreateSoaDialog';
import { navigate } from '../../../router';

interface SoaTransitionBannerProps {
  sessionId: string;
  projectId: string;
  isLocked: boolean;
}

interface SoaAnalysisSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export function SoaTransitionBanner({ sessionId, projectId, isLocked }: SoaTransitionBannerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data } = useQuery<{ soaAnalysesBySlsSession: SoaAnalysisSummary[] }>(
    GET_SOA_ANALYSES_BY_SLS_SESSION,
    {
      variables: { slsSessionId: sessionId },
      skip: !isLocked,
    },
  );

  if (!isLocked) return null;

  const linkedAnalyses = data?.soaAnalysesBySlsSession ?? [];

  const handleCreated = (soaId: string) => {
    setShowCreateDialog(false);
    navigate(`/projects/${projectId}/soa/${soaId}`);
  };

  return (
    <>
      <div
        className="rounded-lg border border-green-200 bg-green-50 p-4"
        data-testid="soa-transition-banner"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <FlaskConical size={18} />
          </div>

          <div className="flex-1">
            {linkedAnalyses.length === 0 ? (
              <>
                <h3 className="text-sm font-semibold text-green-800">
                  Dataset verrouillé — Prêt pour l'analyse SOA
                </h3>
                <p className="mt-1 text-xs text-green-700">
                  La session SLS est verrouillée. Vous pouvez maintenant créer une analyse State of
                  the Art à partir de ces données.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  data-testid="create-soa-from-sls-btn"
                >
                  <FlaskConical size={16} />
                  Créer une analyse SOA
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-green-800">Analyses SOA liées</h3>
                <ul className="mt-2 space-y-1">
                  {linkedAnalyses.map((soa) => (
                    <li key={soa.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/soa/${soa.id}`)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900 hover:underline"
                        data-testid={`soa-link-${soa.id}`}
                      >
                        <ArrowRight size={14} />
                        {soa.name}
                        <span className="text-xs font-normal text-green-600">
                          ({soa.type} — {soa.status})
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 hover:underline"
                  data-testid="create-another-soa-btn"
                >
                  <Plus size={14} />
                  Créer une autre analyse SOA
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <CreateSoaDialog
        projectId={projectId}
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleCreated}
        preselectedSessionIds={[sessionId]}
      />
    </>
  );
}
