import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { FlaskConical, Settings, Upload, BarChart3, FileText, ArrowLeft, Lock } from 'lucide-react';
import { navigate } from '../../../../../router';
import {
  GET_VALIDATION_STUDY,
  GET_PROTOCOL,
  GET_PROTOCOL_AMENDMENTS,
  GET_DATA_IMPORTS,
  GET_IMPORT_DIFF,
  GET_GSPR_MAPPINGS,
} from '../../../../../features/validation/graphql/queries';
import {
  DEFINE_PROTOCOL,
  IMPORT_XLS,
  SET_ACTIVE_IMPORT_VERSION,
  ROLLBACK_IMPORT_VERSION,
  MAP_RESULTS,
  MAP_GSPR,
  DELETE_GSPR_MAPPING,
  LOCK_VALIDATION_STUDY,
} from '../../../../../features/validation/graphql/mutations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Study {
  id: string;
  projectId: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  soaAnalysisId: string | null;
  lockedAt: string | null;
}

interface Protocol {
  id: string;
  version: number;
  status: string;
  summary: string | null;
  endpoints: string | null;
  sampleSizeJustification: string | null;
  statisticalStrategy: string | null;
}

interface Amendment {
  id: string;
  protocolId: string;
  fromVersion: number;
  toVersion: number;
  reason: string;
  createdAt: string;
}

interface DataImport {
  id: string;
  fileName: string;
  version: number;
  isActive: boolean;
  rowCount: number;
  columnCount: number;
  headers: string[];
  createdAt: string;
}

interface GsprMapping {
  id: string;
  gsprId: string;
  status: string;
  justification: string | null;
  evidenceReferences: string[] | null;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'configuration' | 'data-import' | 'results' | 'reports';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'configuration', label: 'Configuration', icon: <Settings size={14} /> },
  { id: 'data-import', label: 'Data Import', icon: <Upload size={14} /> },
  { id: 'results', label: 'Results', icon: <BarChart3 size={14} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={14} /> },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ValidationStudyPage() {
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';
  const studyId = pathParts[pathParts.indexOf('validation') + 1] ?? '';

  const [activeTab, setActiveTab] = useState<TabId>('configuration');

  const {
    data: studyData,
    loading: studyLoading,
    error: studyError,
  } = useQuery<any>(GET_VALIDATION_STUDY, { variables: { id: studyId }, skip: !studyId });

  const study: Study | null = studyData?.validationStudy ?? null;
  const isLocked = study?.status === 'LOCKED';

  if (studyLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading validation study...</p>
      </div>
    );
  }

  if (studyError || !study) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-red-500">Failed to load validation study.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="validation-study-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}/validation`)}
            className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-hover)]"
            data-testid="back-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <FlaskConical size={24} className="text-[var(--cortex-primary)]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[var(--cortex-text-primary)]">
                {study.name}
              </h1>
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                  isLocked ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {study.status.replace(/_/g, ' ')}
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {study.type}
              </span>
            </div>
            {study.description && (
              <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)]">{study.description}</p>
            )}
          </div>
        </div>
        <LockAction studyId={studyId} isLocked={isLocked} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--cortex-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--cortex-primary)] text-[var(--cortex-primary)]'
                : 'border-transparent text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'configuration' && (
          <ConfigurationTab studyId={studyId} projectId={projectId} />
        )}
        {activeTab === 'data-import' && <DataImportTab studyId={studyId} />}
        {activeTab === 'results' && <ResultsTab studyId={studyId} />}
        {activeTab === 'reports' && <ReportsTab studyId={studyId} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lock Action
// ---------------------------------------------------------------------------

function LockAction({ studyId, isLocked }: { studyId: string; isLocked: boolean }) {
  const [lockStudy, { loading: locking }] = useMutation(LOCK_VALIDATION_STUDY, {
    refetchQueries: [{ query: GET_VALIDATION_STUDY, variables: { id: studyId } }],
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (isLocked) {
    return (
      <span className="inline-flex items-center gap-2 rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500">
        <Lock size={14} /> Locked
      </span>
    );
  }

  const handleLock = async () => {
    await lockStudy({ variables: { validationStudyId: studyId } });
    setConfirmOpen(false);
    setConfirmed(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={locking}
        className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        data-testid="lock-study-btn"
      >
        <Lock size={14} />
        Lock Study
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setConfirmOpen(false);
              setConfirmed(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[var(--cortex-text-primary)]">
              Lock Validation Study
            </h2>
            <p className="mb-4 text-sm text-orange-700 rounded border border-orange-200 bg-orange-50 p-3">
              This action is irreversible. The study cannot be modified after locking.
            </p>
            <label className="mb-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
                data-testid="lock-confirm-checkbox"
              />
              <span className="text-[var(--cortex-text-secondary)]">
                I understand this action is irreversible
              </span>
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmed(false);
                }}
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLock}
                disabled={!confirmed || locking}
                className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                data-testid="confirm-lock-btn"
              >
                <Lock size={14} />
                {locking ? 'Locking...' : 'Confirm Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Configuration Tab
// ---------------------------------------------------------------------------

function ConfigurationTab({
  studyId,
  projectId: _projectId,
}: {
  studyId: string;
  projectId: string;
}) {
  const { data: protocolData, loading: protocolLoading } = useQuery<any>(GET_PROTOCOL, {
    variables: { validationStudyId: studyId },
  });

  const protocol: Protocol | null = protocolData?.protocol ?? null;

  const { data: amendmentData } = useQuery<any>(GET_PROTOCOL_AMENDMENTS, {
    variables: { protocolId: protocol?.id ?? '' },
    skip: !protocol?.id,
  });

  const amendments: Amendment[] = amendmentData?.protocolAmendments ?? [];

  const [defineProtocol, { loading: definingProtocol }] = useMutation(DEFINE_PROTOCOL, {
    refetchQueries: [{ query: GET_PROTOCOL, variables: { validationStudyId: studyId } }],
  });

  const [summary, setSummary] = useState('');
  const [endpoints, setEndpoints] = useState('');
  const [sampleSize, setSampleSize] = useState('');
  const [strategy, setStrategy] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Sync protocol data to local state once
  if (!initialized && protocol) {
    setSummary(protocol.summary ?? '');
    setEndpoints(protocol.endpoints ?? '');
    setSampleSize(protocol.sampleSizeJustification ?? '');
    setStrategy(protocol.statisticalStrategy ?? '');
    setInitialized(true);
  }

  const handleSaveProtocol = async () => {
    await defineProtocol({
      variables: {
        validationStudyId: studyId,
        summary: summary || undefined,
        endpoints: endpoints || undefined,
        sampleSizeJustification: sampleSize || undefined,
        statisticalStrategy: strategy || undefined,
      },
    });
  };

  return (
    <div className="space-y-6" data-testid="configuration-tab">
      {/* Protocol Editor */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cortex-text-primary)]">
          <FileText size={18} className="text-[var(--cortex-primary)]" />
          Protocol
          {protocol?.version != null && (
            <span className="text-xs text-[var(--cortex-text-muted)]">v{protocol.version}</span>
          )}
          {protocol?.status && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {protocol.status}
            </span>
          )}
        </h2>

        {protocolLoading ? (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
            Loading protocol...
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                Summary
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Protocol summary describing the validation objectives..."
                rows={4}
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="protocol-summary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                Endpoints (JSON)
              </label>
              <textarea
                value={endpoints}
                onChange={(e) => setEndpoints(e.target.value)}
                placeholder='[{"name":"Sensitivity","type":"PRIMARY","target":">=95%"}]'
                rows={3}
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 font-mono text-sm"
                data-testid="protocol-endpoints"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                Sample Size Justification
              </label>
              <textarea
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="Describe the sample size calculation..."
                rows={3}
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="protocol-sample-size"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                Statistical Strategy
              </label>
              <textarea
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="Describe the statistical methods and analysis plan..."
                rows={3}
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="protocol-strategy"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProtocol}
                disabled={definingProtocol}
                className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                data-testid="save-protocol-btn"
              >
                {definingProtocol ? 'Saving...' : protocol ? 'Update Protocol' : 'Define Protocol'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Amendment History */}
      {amendments.length > 0 && (
        <div className="rounded-lg border border-[var(--cortex-border)] p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--cortex-text-primary)]">
            Amendment History
          </h3>
          <div className="space-y-2" data-testid="amendment-list">
            {amendments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded border border-[var(--cortex-border)] p-3 text-sm"
                data-testid={`amendment-${a.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    v{a.fromVersion} &rarr; v{a.toVersion}
                  </span>
                  <span className="text-[var(--cortex-text-primary)]">{a.reason}</span>
                </div>
                <span className="text-xs text-[var(--cortex-text-muted)]">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data Import Tab
// ---------------------------------------------------------------------------

function DataImportTab({ studyId }: { studyId: string }) {
  const { data: importsData, loading: importsLoading } = useQuery<any>(GET_DATA_IMPORTS, {
    variables: { validationStudyId: studyId },
  });

  const imports: DataImport[] = importsData?.dataImports ?? [];

  const [importXls, { loading: importing }] = useMutation(IMPORT_XLS, {
    refetchQueries: [{ query: GET_DATA_IMPORTS, variables: { validationStudyId: studyId } }],
  });

  const [setActiveVersion, { loading: settingActive }] = useMutation(SET_ACTIVE_IMPORT_VERSION, {
    refetchQueries: [{ query: GET_DATA_IMPORTS, variables: { validationStudyId: studyId } }],
  });

  const [rollbackVersion, { loading: rollingBack }] = useMutation(ROLLBACK_IMPORT_VERSION, {
    refetchQueries: [{ query: GET_DATA_IMPORTS, variables: { validationStudyId: studyId } }],
  });

  // Diff state
  const [diffVersions, setDiffVersions] = useState<{ a: number; b: number } | null>(null);
  const [compareFrom, setCompareFrom] = useState<number | null>(null);

  const { data: diffData, loading: diffLoading } = useQuery<any>(GET_IMPORT_DIFF, {
    variables: {
      validationStudyId: studyId,
      versionA: diffVersions?.a ?? 0,
      versionB: diffVersions?.b ?? 0,
    },
    skip: !diffVersions,
  });

  const diff = diffData?.computeImportDiff;

  // File upload state
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    // Simulated XLS parse -- in production, we'd parse the file client-side
    await importXls({
      variables: {
        validationStudyId: studyId,
        fileName: file.name,
        headers: ['Column1', 'Column2'],
        rawRows: [['value1', 'value2']],
      },
    });
    setFile(null);
  };

  const handleSetActive = async (version: number) => {
    await setActiveVersion({
      variables: { validationStudyId: studyId, version },
    });
  };

  const handleRollback = async (targetVersion: number) => {
    await rollbackVersion({
      variables: { validationStudyId: studyId, targetVersion },
    });
  };

  const handleCompare = (version: number) => {
    if (compareFrom === null) {
      setCompareFrom(version);
    } else {
      setDiffVersions({ a: compareFrom, b: version });
      setCompareFrom(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="data-import-tab">
      {/* Upload section */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cortex-text-primary)]">
          <Upload size={18} className="text-[var(--cortex-primary)]" />
          Import Data
        </h3>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFileSelect}
            className="text-sm"
            data-testid="file-input"
          />
          {file && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={importing}
              className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              data-testid="upload-btn"
            >
              {importing ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>
      </div>

      {/* Version list */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
          Import Versions
        </h3>
        {importsLoading ? (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
            Loading import versions...
          </p>
        ) : imports.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
            No imports yet. Upload an XLS/XLSX file to begin.
          </p>
        ) : (
          <div className="space-y-3" data-testid="import-version-list">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className={`rounded-lg border p-4 ${
                  imp.isActive
                    ? 'border-[var(--cortex-primary)] bg-blue-50'
                    : 'border-[var(--cortex-border)]'
                }`}
                data-testid={`import-card-${imp.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                      v{imp.version}
                    </span>
                    <span className="text-xs text-[var(--cortex-text-muted)]">{imp.fileName}</span>
                    {imp.isActive && (
                      <span className="rounded bg-[var(--cortex-primary)] px-2 py-0.5 text-xs font-medium text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--cortex-text-muted)]">
                    {imp.rowCount} rows, {imp.columnCount} cols
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  {!imp.isActive && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(imp.version)}
                      disabled={settingActive}
                      className="rounded border border-[var(--cortex-primary)] px-3 py-1 text-xs font-medium text-[var(--cortex-primary)] hover:bg-blue-50"
                      data-testid="set-active-btn"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCompare(imp.version)}
                    className={`rounded border px-3 py-1 text-xs font-medium ${
                      compareFrom === imp.version
                        ? 'border-orange-400 bg-orange-50 text-orange-600'
                        : 'border-[var(--cortex-border)] text-[var(--cortex-text-muted)]'
                    }`}
                    data-testid="compare-btn"
                  >
                    {compareFrom === imp.version ? 'Select target...' : 'Compare'}
                  </button>
                  {!imp.isActive && (
                    <button
                      type="button"
                      onClick={() => handleRollback(imp.version)}
                      disabled={rollingBack}
                      className="rounded border border-[var(--cortex-border)] px-3 py-1 text-xs text-[var(--cortex-text-muted)] hover:text-red-500"
                      data-testid="rollback-btn"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diff viewer */}
      {diffVersions && (
        <div className="rounded-lg border border-[var(--cortex-border)] p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--cortex-text-primary)]">
            Diff: v{diffVersions.a} vs v{diffVersions.b}
          </h3>
          {diffLoading ? (
            <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
              Computing diff...
            </p>
          ) : diff ? (
            <div className="space-y-3" data-testid="diff-viewer">
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-600">+{diff.additions} additions</span>
                <span className="text-red-600">-{diff.deletions} deletions</span>
                <span className="text-orange-600">~{diff.modifications} modifications</span>
              </div>
              {diff.details && (
                <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs">
                  {JSON.stringify(diff.details, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--cortex-text-muted)]">No diff data available.</p>
          )}
          <button
            type="button"
            onClick={() => setDiffVersions(null)}
            className="mt-3 text-xs text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]"
          >
            Close diff
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results Tab
// ---------------------------------------------------------------------------

function ResultsTab({ studyId }: { studyId: string }) {
  const { data: gsprData, loading: gsprLoading } = useQuery<any>(GET_GSPR_MAPPINGS, {
    variables: { validationStudyId: studyId },
  });

  const gsprMappings: GsprMapping[] = gsprData?.gsprMappings ?? [];

  const [mapResults, { loading: mappingResults }] = useMutation<any>(MAP_RESULTS);
  const [mapGspr, { loading: mappingGspr }] = useMutation(MAP_GSPR, {
    refetchQueries: [{ query: GET_GSPR_MAPPINGS, variables: { validationStudyId: studyId } }],
  });
  const [deleteGspr] = useMutation(DELETE_GSPR_MAPPING, {
    refetchQueries: [{ query: GET_GSPR_MAPPINGS, variables: { validationStudyId: studyId } }],
  });

  const [resultsOutput, setResultsOutput] = useState<any>(null);

  // GSPR form state
  const [showGsprForm, setShowGsprForm] = useState(false);
  const [gsprId, setGsprId] = useState('');
  const [gsprStatus, setGsprStatus] = useState('COMPLIANT');
  const [gsprJustification, setGsprJustification] = useState('');

  const handleMapResults = async () => {
    const result = await mapResults({
      variables: { validationStudyId: studyId },
    });
    setResultsOutput(result.data?.mapResults ?? null);
  };

  const handleAddGspr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gsprId.trim()) return;
    await mapGspr({
      variables: {
        validationStudyId: studyId,
        gsprId: gsprId.trim(),
        status: gsprStatus,
        justification: gsprJustification || undefined,
      },
    });
    setGsprId('');
    setGsprStatus('COMPLIANT');
    setGsprJustification('');
    setShowGsprForm(false);
  };

  const handleDeleteGspr = async (mappingGsprId: string) => {
    await deleteGspr({
      variables: { validationStudyId: studyId, gsprId: mappingGsprId },
    });
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    COMPLIANT: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    PARTIAL: { bg: 'bg-orange-100', text: 'text-orange-700' },
    NOT_APPLICABLE: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  return (
    <div className="space-y-6" data-testid="results-tab">
      {/* Results Mapping */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Results Mapping
          </h3>
          <button
            type="button"
            onClick={handleMapResults}
            disabled={mappingResults}
            className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            data-testid="compute-results-btn"
          >
            {mappingResults ? 'Computing...' : 'Compute Results'}
          </button>
        </div>
        {resultsOutput && (
          <div className="space-y-3" data-testid="results-output">
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-600 font-medium">{resultsOutput.overallMet} met</span>
              <span className="text-red-600 font-medium">
                {resultsOutput.overallNotMet} not met
              </span>
              <span className="text-[var(--cortex-text-muted)]">
                / {resultsOutput.totalCriteria} total
              </span>
            </div>
            {resultsOutput.endpointResults?.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
                <table className="w-full text-sm" data-testid="endpoint-results-table">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="px-3 py-2 text-left text-xs font-medium">Criterion</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Value</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Threshold</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsOutput.endpointResults.map((ep: any, idx: number) => (
                      <tr
                        key={ep.acceptanceCriterionId}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}
                      >
                        <td className="border-r border-[#ECF0F1] px-3 py-2 font-medium">
                          {ep.criterionName}
                        </td>
                        <td className="border-r border-[#ECF0F1] px-3 py-2">{ep.computedValue}</td>
                        <td className="border-r border-[#ECF0F1] px-3 py-2">{ep.threshold}</td>
                        <td className="border-r border-[#ECF0F1] px-3 py-2">{ep.unit}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              ep.result === 'MET'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {ep.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GSPR Mapping */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">GSPR Mapping</h3>
          <button
            type="button"
            onClick={() => setShowGsprForm(!showGsprForm)}
            className="text-xs text-blue-600 hover:text-blue-700"
            data-testid="add-gspr-btn"
          >
            + Add Mapping
          </button>
        </div>

        {showGsprForm && (
          <form
            onSubmit={handleAddGspr}
            className="mb-4 space-y-3 rounded border border-[var(--cortex-border)] p-4"
            data-testid="gspr-form"
          >
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                  GSPR ID
                </label>
                <input
                  type="text"
                  value={gsprId}
                  onChange={(e) => setGsprId(e.target.value)}
                  placeholder="e.g., GSPR-1.1"
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                  data-testid="gspr-id-input"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                  Status
                </label>
                <select
                  value={gsprStatus}
                  onChange={(e) => setGsprStatus(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                  data-testid="gspr-status-select"
                >
                  <option value="COMPLIANT">Compliant</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="NOT_APPLICABLE">Not Applicable</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                  Justification
                </label>
                <input
                  type="text"
                  value={gsprJustification}
                  onChange={(e) => setGsprJustification(e.target.value)}
                  placeholder="Optional justification"
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                  data-testid="gspr-justification-input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGsprForm(false)}
                className="rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!gsprId.trim() || mappingGspr}
                className="rounded bg-[var(--cortex-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                data-testid="submit-gspr-btn"
              >
                {mappingGspr ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {gsprLoading ? (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
            Loading GSPR mappings...
          </p>
        ) : gsprMappings.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
            No GSPR mappings yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
            <table className="w-full text-sm" data-testid="gspr-table">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="px-3 py-2 text-left text-xs font-medium">GSPR ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Justification</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Evidence</th>
                  <th className="px-3 py-2 text-right text-xs font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gsprMappings.map((mapping, idx) => {
                  const sc = STATUS_COLORS[mapping.status] ?? {
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                  };
                  return (
                    <tr
                      key={mapping.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}
                      data-testid={`gspr-row-${mapping.gsprId}`}
                    >
                      <td className="border-r border-[#ECF0F1] px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                        {mapping.gsprId}
                      </td>
                      <td className="border-r border-[#ECF0F1] px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}
                        >
                          {mapping.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="border-r border-[#ECF0F1] px-3 py-2 text-xs text-[var(--cortex-text-muted)]">
                        {mapping.justification ?? '-'}
                      </td>
                      <td className="border-r border-[#ECF0F1] px-3 py-2 text-xs text-blue-600">
                        {mapping.evidenceReferences?.join(', ') ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteGspr(mapping.gsprId)}
                          className="text-xs text-red-500 hover:text-red-700"
                          data-testid={`delete-gspr-${mapping.gsprId}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports Tab
// ---------------------------------------------------------------------------

function ReportsTab({ studyId: _studyId }: { studyId: string }) {
  return (
    <div className="space-y-6" data-testid="reports-tab">
      <div className="rounded-lg border border-dashed border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-12 text-center">
        <FileText size={48} className="mx-auto mb-3 text-[var(--cortex-text-muted)]" />
        <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
          Report Generation
        </h2>
        <p className="text-sm text-[var(--cortex-text-secondary)]">
          Report generation will be available once validation data is complete and results are
          computed. Use the Results tab to compute endpoint results first.
        </p>
      </div>
    </div>
  );
}
