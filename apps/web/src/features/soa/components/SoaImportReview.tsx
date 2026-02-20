import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  FileText,
  BookOpen,
  Grid3X3,
  MessageSquare,
  Cpu,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { GET_SOA_IMPORT } from '../graphql/queries';
import { CONFIRM_SOA_IMPORT, CANCEL_SOA_IMPORT } from '../graphql/mutations';
import { navigate } from '../../../router';

interface SoaImportReviewProps {
  importId: string;
  projectId: string;
}

type TabKey = 'sessions' | 'articles' | 'sections' | 'grid' | 'claims' | 'devices' | 'gaps';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'sessions', label: 'Sessions SLS', icon: <Search size={14} /> },
  { key: 'articles', label: 'Articles', icon: <FileText size={14} /> },
  { key: 'sections', label: 'Sections', icon: <BookOpen size={14} /> },
  { key: 'grid', label: "Grille d'extraction", icon: <Grid3X3 size={14} /> },
  { key: 'claims', label: 'Claims', icon: <MessageSquare size={14} /> },
  { key: 'devices', label: 'Devices & Benchmarks', icon: <Cpu size={14} /> },
  { key: 'gaps', label: "Rapport d'écarts", icon: <AlertTriangle size={14} /> },
];

export function SoaImportReview({ importId, projectId }: SoaImportReviewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('sessions');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_SOA_IMPORT, {
    variables: { importId },
    pollInterval: 3000,
  });

  const [confirmImport, { loading: confirming }] = useMutation(CONFIRM_SOA_IMPORT, {
    onCompleted: (result) => {
      const soaId = result.confirmSoaImport.soaAnalysisId;
      navigate(`/projects/${projectId}/soa/${soaId}`);
    },
    onError: (err) => {
      setMutationError(err.message);
    },
  });

  const [cancelImport, { loading: cancelling }] = useMutation(CANCEL_SOA_IMPORT, {
    onCompleted: () => {
      navigate(`/projects/${projectId}/soa`);
    },
    onError: (err) => {
      setMutationError(err.message);
    },
  });

  const soaImport = data?.soaImport;
  const extractedData = useMemo(() => soaImport?.extractedData ?? null, [soaImport]);
  const gapReport = useMemo(() => soaImport?.gapReport ?? null, [soaImport]);

  if (loading && !soaImport) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="loading">
        <Loader2 className="animate-spin text-[var(--cortex-blue-500)]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500" data-testid="error">
        Erreur : {error.message}
      </div>
    );
  }

  if (!soaImport) {
    return (
      <div className="p-6 text-[var(--cortex-text-secondary)]" data-testid="not-found">
        Import non trouvé.
      </div>
    );
  }

  // Show processing state
  if (soaImport.status === 'PROCESSING') {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 space-y-4"
        data-testid="processing"
      >
        <Loader2 className="animate-spin text-[var(--cortex-blue-500)]" size={48} />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Extraction en cours...
        </h2>
        <p className="text-sm text-[var(--cortex-text-secondary)]">
          L&apos;IA analyse votre document SOA. Cela peut prendre quelques minutes.
        </p>
        <p className="text-xs text-[var(--cortex-text-tertiary)]">
          Fichier : {soaImport.sourceFileName}
        </p>
      </div>
    );
  }

  if (soaImport.status === 'FAILED') {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 space-y-4"
        data-testid="failed"
      >
        <XCircle className="text-red-500" size={48} />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          L&apos;extraction a échoué
        </h2>
        <p className="text-sm text-[var(--cortex-text-secondary)]">
          Vérifiez le format du fichier et réessayez.
        </p>
        <button
          onClick={() => navigate(`/projects/${projectId}/soa`)}
          className="rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm text-white"
        >
          Retour
        </button>
      </div>
    );
  }

  if (soaImport.status === 'CONFIRMED') {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 space-y-4"
        data-testid="confirmed"
      >
        <CheckCircle className="text-emerald-500" size={48} />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">Import confirmé</h2>
        <button
          onClick={() => navigate(`/projects/${projectId}/soa/${soaImport.soaAnalysisId}`)}
          className="rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm text-white"
        >
          Voir l&apos;analyse SOA
        </button>
      </div>
    );
  }

  // REVIEW status — show tabs
  return (
    <div className="space-y-4" data-testid="soa-import-review">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--cortex-text-primary)]">
            Review de l&apos;import SOA
          </h1>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            {soaImport.sourceFileName} — Type : {extractedData?.soaType ?? 'N/A'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => cancelImport({ variables: { importId } })}
            disabled={cancelling}
            className="rounded-md px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            data-testid="cancel-import"
          >
            {cancelling ? 'Annulation...' : "Annuler l'import"}
          </button>
          <button
            onClick={() => confirmImport({ variables: { importId } })}
            disabled={confirming}
            className="flex items-center gap-2 rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            data-testid="confirm-import"
          >
            {confirming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            Confirmer l&apos;import
          </button>
        </div>
      </div>

      {/* Mutation error banner */}
      {mutationError && (
        <div
          className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
          data-testid="mutation-error"
        >
          <XCircle size={16} />
          <span>{mutationError}</span>
          <button
            onClick={() => setMutationError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats bar */}
      {extractedData && (
        <div className="flex gap-4 text-sm" data-testid="stats-bar">
          <span className="rounded bg-[var(--cortex-bg-secondary)] px-3 py-1">
            {extractedData.slsSessions?.length ?? 0} sessions
          </span>
          <span className="rounded bg-[var(--cortex-bg-secondary)] px-3 py-1">
            {extractedData.articles?.length ?? 0} articles
          </span>
          <span className="rounded bg-[var(--cortex-bg-secondary)] px-3 py-1">
            {extractedData.sections?.length ?? 0} sections
          </span>
          <span className="rounded bg-[var(--cortex-bg-secondary)] px-3 py-1">
            {extractedData.claims?.length ?? 0} claims
          </span>
          <span className="rounded bg-[var(--cortex-bg-secondary)] px-3 py-1">
            {extractedData.similarDevices?.length ?? 0} devices
          </span>
          {gapReport && (
            <span className="rounded bg-amber-50 px-3 py-1 text-amber-700">
              {gapReport.summary?.totalGaps ?? 0} écarts
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--cortex-border)]">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-[var(--cortex-blue-500)] text-[var(--cortex-blue-500)] font-medium'
                  : 'text-[var(--cortex-text-secondary)] hover:text-[var(--cortex-text-primary)]'
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'sessions' && extractedData && (
          <SessionsTab sessions={extractedData.slsSessions ?? []} />
        )}
        {activeTab === 'articles' && extractedData && (
          <ArticlesTab articles={extractedData.articles ?? []} />
        )}
        {activeTab === 'sections' && extractedData && (
          <SectionsTab sections={extractedData.sections ?? []} />
        )}
        {activeTab === 'grid' && extractedData && (
          <GridTab
            columns={extractedData.gridColumns ?? []}
            cells={extractedData.gridCells ?? []}
            articles={extractedData.articles ?? []}
          />
        )}
        {activeTab === 'claims' && extractedData && (
          <ClaimsTab claims={extractedData.claims ?? []} />
        )}
        {activeTab === 'devices' && extractedData && (
          <DevicesTab devices={extractedData.similarDevices ?? []} />
        )}
        {activeTab === 'gaps' && gapReport && <GapsTab gapReport={gapReport} />}
      </div>
    </div>
  );
}

// --- Tab components ---

function SessionsTab({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) {
    return (
      <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">
        Aucune session SLS extraite du document.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="sessions-tab">
      {sessions.map((session: any, index: number) => (
        <div key={index} className="rounded-lg border border-[var(--cortex-border)] p-4">
          {/* Session header */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                session.type === 'SOA_CLINICAL'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-purple-50 text-purple-700'
              }`}
              data-testid={`session-badge-${index}`}
            >
              {session.type === 'SOA_CLINICAL' ? 'Clinical' : 'Device'}
            </span>
            <h3 className="font-medium text-[var(--cortex-text-primary)]">{session.name}</h3>
            <span className="text-xs text-[var(--cortex-text-tertiary)]">
              {session.articleTempIds?.length ?? 0} articles
            </span>
          </div>

          {/* Scope fields */}
          {session.scopeFields && Object.keys(session.scopeFields).length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-[var(--cortex-text-tertiary)] mb-2">
                Scope fields
              </h4>
              <div className="grid grid-cols-2 gap-2" data-testid={`session-scope-${index}`}>
                {Object.entries(session.scopeFields).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded bg-[var(--cortex-bg-secondary)] px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[var(--cortex-text-tertiary)]">{key}: </span>
                    <span className="text-[var(--cortex-text-primary)]">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queries */}
          {session.queries?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-[var(--cortex-text-tertiary)] mb-2">
                Requêtes ({session.queries.length})
              </h4>
              <div className="space-y-2" data-testid={`session-queries-${index}`}>
                {session.queries.map((query: any, qi: number) => (
                  <div key={qi} className="rounded border border-[var(--cortex-border)] p-3">
                    <p className="text-sm font-medium mb-1">{query.name}</p>
                    <pre className="text-xs bg-[var(--cortex-bg-secondary)] rounded p-2 mb-2 whitespace-pre-wrap font-mono">
                      {query.queryString}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      {query.databases?.map((db: string) => (
                        <span
                          key={db}
                          className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {db}
                        </span>
                      ))}
                      {(query.dateFrom || query.dateTo) && (
                        <span className="text-xs text-[var(--cortex-text-tertiary)]">
                          {query.dateFrom ?? '...'} — {query.dateTo ?? '...'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exclusion codes */}
          {session.exclusionCodes?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--cortex-text-tertiary)] mb-2">
                Codes d&apos;exclusion ({session.exclusionCodes.length})
              </h4>
              <div className="flex flex-wrap gap-2" data-testid={`session-exclusions-${index}`}>
                {session.exclusionCodes.map((code: any) => (
                  <span
                    key={code.code}
                    className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                    title={code.description}
                  >
                    {code.shortCode}: {code.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArticlesTab({ articles }: { articles: any[] }) {
  if (articles.length === 0) {
    return (
      <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">Aucun article extrait.</p>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="articles-tab">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--cortex-border)] text-left text-xs text-[var(--cortex-text-tertiary)]">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Titre</th>
            <th className="px-3 py-2">Auteurs</th>
            <th className="px-3 py-2">Année</th>
            <th className="px-3 py-2">DOI</th>
            <th className="px-3 py-2">PMID</th>
            <th className="px-3 py-2">Journal</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article: any, index: number) => (
            <tr
              key={article.tempId}
              className="border-b border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]"
            >
              <td className="px-3 py-2 text-[var(--cortex-text-tertiary)]">{index + 1}</td>
              <td className="max-w-xs truncate px-3 py-2 font-medium">{article.title}</td>
              <td className="max-w-[200px] truncate px-3 py-2">{article.authors ?? '—'}</td>
              <td className="px-3 py-2">{article.publicationYear ?? '—'}</td>
              <td className="px-3 py-2 text-xs">{article.doi ?? '—'}</td>
              <td className="px-3 py-2 text-xs">{article.pmid ?? '—'}</td>
              <td className="max-w-[150px] truncate px-3 py-2">{article.journal ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionsTab({ sections }: { sections: any[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (sections.length === 0) {
    return (
      <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">Aucune section extraite.</p>
    );
  }

  const toggleSection = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-2" data-testid="sections-tab">
      {[...sections]
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((section: any) => (
          <div
            key={section.sectionKey}
            className="rounded-lg border border-[var(--cortex-border)] overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.sectionKey)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-[var(--cortex-bg-secondary)]"
            >
              {expanded.has(section.sectionKey) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span className="font-medium text-sm">{section.title}</span>
              <span className="ml-auto text-xs text-[var(--cortex-text-tertiary)]">
                {section.sectionKey}
              </span>
            </button>
            {expanded.has(section.sectionKey) && section.narrativeContent && (
              <div className="border-t border-[var(--cortex-border)] px-4 py-3 text-sm whitespace-pre-wrap text-[var(--cortex-text-secondary)]">
                {section.narrativeContent}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

function GridTab({ columns, cells, articles }: { columns: any[]; cells: any[]; articles: any[] }) {
  if (columns.length === 0) {
    return (
      <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">Aucune grille extraite.</p>
    );
  }

  const articleMap = new Map(articles.map((a: any) => [a.tempId, a]));
  const sortedColumns = [...columns].sort((a: any, b: any) => a.orderIndex - b.orderIndex);

  // Group cells by article
  const uniqueArticleIds = [...new Set(cells.map((c: any) => c.articleTempId))];

  return (
    <div className="overflow-x-auto" data-testid="grid-tab">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--cortex-border)] text-left text-xs text-[var(--cortex-text-tertiary)]">
            <th className="px-3 py-2 sticky left-0 bg-[var(--cortex-bg-primary)]">Article</th>
            {sortedColumns.map((col: any) => (
              <th key={col.name} className="px-3 py-2 min-w-[120px]">
                {col.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uniqueArticleIds.map((articleTempId: string) => {
            const article = articleMap.get(articleTempId);
            const articleCells = cells.filter((c: any) => c.articleTempId === articleTempId);
            const cellMap = new Map(articleCells.map((c: any) => [c.columnName, c]));

            return (
              <tr
                key={articleTempId}
                className="border-b border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]"
              >
                <td className="px-3 py-2 max-w-[200px] truncate sticky left-0 bg-[var(--cortex-bg-primary)] font-medium">
                  {article?.title ?? articleTempId}
                </td>
                {sortedColumns.map((col: any) => {
                  const cell = cellMap.get(col.name);
                  return (
                    <td key={col.name} className="px-3 py-2 text-xs">
                      {cell?.value ?? '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClaimsTab({ claims }: { claims: any[] }) {
  if (claims.length === 0) {
    return <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">Aucun claim extrait.</p>;
  }

  return (
    <div className="space-y-3" data-testid="claims-tab">
      {claims.map((claim: any, index: number) => (
        <div key={index} className="rounded-lg border border-[var(--cortex-border)] p-4">
          <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
            {claim.statementText}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {claim.thematicSectionKey && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {claim.thematicSectionKey}
              </span>
            )}
            {claim.articleTempIds?.map((id: string) => (
              <span key={id} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {id}
              </span>
            ))}
          </div>
          {claim.sourceQuote && (
            <blockquote className="mt-2 border-l-2 border-[var(--cortex-border)] pl-3 text-xs text-[var(--cortex-text-tertiary)] italic">
              {claim.sourceQuote}
            </blockquote>
          )}
        </div>
      ))}
    </div>
  );
}

function DevicesTab({ devices }: { devices: any[] }) {
  if (devices.length === 0) {
    return (
      <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">
        Aucun device similaire extrait (SOA de type CLINICAL).
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="devices-tab">
      {devices.map((device: any, index: number) => (
        <div key={index} className="rounded-lg border border-[var(--cortex-border)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-medium text-[var(--cortex-text-primary)]">{device.deviceName}</h3>
            <span className="text-xs text-[var(--cortex-text-tertiary)]">
              {device.manufacturer}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-[var(--cortex-text-tertiary)]">Indication : </span>
              {device.indication}
            </div>
            <div>
              <span className="text-[var(--cortex-text-tertiary)]">Statut : </span>
              {device.regulatoryStatus}
            </div>
          </div>
          {device.benchmarks?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-[var(--cortex-text-tertiary)] mb-1">
                Benchmarks
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--cortex-text-tertiary)]">
                    <th className="px-2 py-1">Métrique</th>
                    <th className="px-2 py-1">Valeur</th>
                    <th className="px-2 py-1">Unité</th>
                  </tr>
                </thead>
                <tbody>
                  {device.benchmarks.map((b: any, bi: number) => (
                    <tr key={bi} className="border-t border-[var(--cortex-border)]">
                      <td className="px-2 py-1">{b.metricName}</td>
                      <td className="px-2 py-1">{b.metricValue}</td>
                      <td className="px-2 py-1">{b.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GapsTab({ gapReport }: { gapReport: any }) {
  if (!gapReport || !gapReport.items) {
    return (
      <p className="p-4 text-sm text-[var(--cortex-text-secondary)]">
        Aucun rapport d&apos;écarts.
      </p>
    );
  }

  const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
    HIGH: { bg: 'bg-red-50', text: 'text-red-700', label: 'Élevé' },
    MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Moyen' },
    LOW: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Faible' },
    INFO: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Info' },
  };

  return (
    <div className="space-y-4" data-testid="gaps-tab">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        {gapReport.summary?.highCount > 0 && (
          <span className="rounded bg-red-50 px-3 py-1 text-red-700">
            {gapReport.summary.highCount} élevés
          </span>
        )}
        {gapReport.summary?.mediumCount > 0 && (
          <span className="rounded bg-amber-50 px-3 py-1 text-amber-700">
            {gapReport.summary.mediumCount} moyens
          </span>
        )}
        {gapReport.summary?.lowCount > 0 && (
          <span className="rounded bg-blue-50 px-3 py-1 text-blue-700">
            {gapReport.summary.lowCount} faibles
          </span>
        )}
        {gapReport.summary?.infoCount > 0 && (
          <span className="rounded bg-gray-100 px-3 py-1 text-gray-600">
            {gapReport.summary.infoCount} info
          </span>
        )}
      </div>

      {/* Items grouped by severity */}
      {['HIGH', 'MEDIUM', 'LOW', 'INFO'].map((severity) => {
        const items = gapReport.items.filter((i: any) => i.severity === severity);
        if (items.length === 0) return null;

        const config = severityConfig[severity];
        return (
          <div key={severity}>
            <h3 className={`text-sm font-medium mb-2 ${config.text}`}>{config.label}</h3>
            <div className="space-y-2">
              {items.map((item: any, index: number) => (
                <div key={index} className={`rounded-lg ${config.bg} p-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    {item.count != null && (
                      <span className="text-xs text-[var(--cortex-text-tertiary)]">
                        {item.count} éléments
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{item.description}</p>
                  {item.details && (
                    <p className="text-xs mt-1 text-[var(--cortex-text-tertiary)]">
                      {item.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
