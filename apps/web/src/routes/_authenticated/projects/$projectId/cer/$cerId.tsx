import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  FileText,
  Layers,
  BookOpen,
  CheckSquare,
  FolderOpen,
  Cpu,
  Shield,
  GitBranch,
  ArrowLeft,
} from 'lucide-react';
import { navigate } from '../../../../../router';
import {
  GET_CER_VERSION,
  GET_CER_SECTIONS,
  GET_CER_EXTERNAL_DOCS,
  GET_CER_TRACEABILITY,
  GET_CER_UPSTREAM_LINKS,
} from '../../../../../features/cer/graphql/queries';
import { ASSEMBLE_CER_SECTIONS } from '../../../../../features/cer/graphql/mutations';

// -- Components --
import { CerAssembler } from '../../../../../features/cer/components/CerAssembler';
import { AssemblyProgressOverlay } from '../../../../../features/cer/components/AssemblyProgressOverlay';
import { UpstreamModuleSelector } from '../../../../../features/cer/components/UpstreamModuleSelector';
import { SectionEditor } from '../../../../../features/cer/components/SectionEditor';
import { SectionNavigator } from '../../../../../features/cer/components/SectionNavigator';
import { CerTableOfContents } from '../../../../../features/cer/components/CerTableOfContents';
import { SectionStatusControl } from '../../../../../features/cer/components/SectionStatusControl';
import { CompletionDashboard } from '../../../../../features/cer/components/CompletionDashboard';
import { UnresolvedClaimsList } from '../../../../../features/cer/components/UnresolvedClaimsList';
import { ImpactedSectionsList } from '../../../../../features/cer/components/ImpactedSectionsList';
import { ExternalDocumentManager } from '../../../../../features/cer/components/ExternalDocumentManager';
import { ExternalDocumentList } from '../../../../../features/cer/components/ExternalDocumentList';
import { NamedDeviceSearchPanel } from '../../../../../features/cer/components/NamedDeviceSearchPanel';
import { SearchProgressIndicator } from '../../../../../features/cer/components/SearchProgressIndicator';
import { TraceabilityDrillDown } from '../../../../../features/cer/components/TraceabilityDrillDown';
import { VigilanceFindingsTable } from '../../../../../features/cer/components/VigilanceFindingsTable';
import { VigilanceFindingDetail } from '../../../../../features/cer/components/VigilanceFindingDetail';

// -- Types --

type TabKey =
  | 'assembly'
  | 'sections'
  | 'completion'
  | 'documents'
  | 'devices'
  | 'vigilance'
  | 'traceability';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof FileText;
}

const tabs: TabConfig[] = [
  { key: 'assembly', label: 'Assembly', icon: Layers },
  { key: 'sections', label: 'Sections', icon: BookOpen },
  { key: 'completion', label: 'Completion', icon: CheckSquare },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
  { key: 'devices', label: 'Devices', icon: Cpu },
  { key: 'vigilance', label: 'Vigilance', icon: Shield },
  { key: 'traceability', label: 'Traceability', icon: GitBranch },
];

type CerSectionData = {
  id: string;
  cerVersionId: string;
  sectionNumber: number;
  title: string;
  status: 'DRAFT' | 'REVIEWED' | 'FINALIZED';
  orderIndex: number;
  wordCount: number;
  humanEditPercentage: number;
  versionMismatchWarning: boolean;
};

type ExternalDocData = {
  id: string;
  cerVersionId: string;
  title: string;
  version: string;
  date: string;
  summary: string;
  documentType: string;
};

type UpstreamLinkData = {
  id: string;
  cerVersionId: string;
  moduleType: string;
  moduleId: string;
  lockedAt: string | null;
};

export default function CerDetailPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('assembly');
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [assemblyInProgress, setAssemblyInProgress] = useState(false);
  const [selectedUpstreamIds, setSelectedUpstreamIds] = useState<string[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [searchInProgress, setSearchInProgress] = useState(false);

  // Extract IDs from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';
  const cerId = pathParts[pathParts.indexOf('cer') + 1] ?? '';

  // -- Queries --
  const { data: cerData, loading: cerLoading } = useQuery<any>(GET_CER_VERSION, {
    variables: { id: cerId },
    skip: !cerId,
  });

  const { data: sectionsData, refetch: refetchSections } = useQuery<{
    cerSections: CerSectionData[];
  }>(GET_CER_SECTIONS, {
    variables: { cerVersionId: cerId },
    skip: !cerId,
  });

  const { data: docsData, refetch: refetchDocs } = useQuery<{
    cerExternalDocs: ExternalDocData[];
  }>(GET_CER_EXTERNAL_DOCS, {
    variables: { cerVersionId: cerId },
    skip: !cerId,
  });

  const { data: traceData } = useQuery<any>(GET_CER_TRACEABILITY, {
    variables: { cerVersionId: cerId },
    skip: !cerId,
  });

  const { data: linksData } = useQuery<{
    cerUpstreamLinks: UpstreamLinkData[];
  }>(GET_CER_UPSTREAM_LINKS, {
    variables: { cerVersionId: cerId },
    skip: !cerId,
  });

  // -- Mutations --
  const [assembleSections] = useMutation<any>(ASSEMBLE_CER_SECTIONS);

  const cerVersion = cerData?.cerVersion;
  const sections: CerSectionData[] = sectionsData?.cerSections ?? [];
  const externalDocs: ExternalDocData[] = docsData?.cerExternalDocs ?? [];
  const traceability = traceData?.cerTraceability;
  const upstreamLinks: UpstreamLinkData[] = linksData?.cerUpstreamLinks ?? [];

  const activeSectionData = sections.find((s) => s.sectionNumber === activeSection);

  // Derived data for components
  const _mismatchDocs = externalDocs.filter((_d) => false); // Version mismatches would come from comparing doc versions
  const traceabilityPercentage = traceability?.coveragePercentage ?? 0;
  const unresolvedClaimsCount = traceability?.untracedClaims ?? 0;

  // -- Handlers --
  const handleAssemble = async () => {
    const result = await assembleSections({ variables: { cerVersionId: cerId } });
    if (result.data?.assembleCerSections) {
      setAssemblyInProgress(true);
    }
  };

  const handleNavigateBack = () => {
    navigate(`/projects/${projectId}/cer`);
  };

  if (cerLoading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="cer-detail-loading">
        <span className="text-sm text-[var(--cortex-text-muted)]">Loading CER...</span>
      </div>
    );
  }

  if (!cerVersion) {
    return (
      <div className="py-16 text-center" data-testid="cer-not-found">
        <p className="text-sm text-[var(--cortex-text-muted)]">CER not found.</p>
        <button
          type="button"
          onClick={handleNavigateBack}
          className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--cortex-primary)] hover:underline"
        >
          <ArrowLeft size={14} /> Back to CER list
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="cer-detail-page">
      {/* Header */}
      <div className="border-b border-[var(--cortex-border)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNavigateBack}
            className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-gray-100"
            data-testid="back-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <FileText size={20} className="text-[var(--cortex-primary)]" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
              CER v{cerVersion.versionNumber}
            </h1>
            <div className="flex items-center gap-2 text-xs text-[var(--cortex-text-muted)]">
              <span>{cerVersion.regulatoryContext?.replace('_', ' ')}</span>
              <span className="text-gray-300">|</span>
              <span>{cerVersion.status}</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mt-4 flex gap-1" data-testid="tab-bar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-[var(--cortex-primary)] bg-blue-50 text-[var(--cortex-primary)]'
                    : 'text-[var(--cortex-text-muted)] hover:bg-gray-50 hover:text-[var(--cortex-text-primary)]'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-[var(--cortex-bg-secondary)] p-6">
        {activeTab === 'assembly' && (
          <AssemblyTab
            cerId={cerId}
            projectId={projectId}
            sections={sections}
            upstreamLinks={upstreamLinks}
            selectedUpstreamIds={selectedUpstreamIds}
            onSelectionChange={setSelectedUpstreamIds}
            onAssemble={handleAssemble}
            assemblyInProgress={assemblyInProgress}
            onCloseOverlay={() => setAssemblyInProgress(false)}
          />
        )}

        {activeTab === 'sections' && (
          <SectionsTab
            cerId={cerId}
            sections={sections}
            activeSection={activeSection}
            activeSectionData={activeSectionData ?? null}
            onNavigate={(num) => setActiveSection(num)}
            onRefresh={() => refetchSections()}
          />
        )}

        {activeTab === 'completion' && (
          <CompletionTab
            sections={sections}
            traceabilityPercentage={traceabilityPercentage}
            unresolvedClaimsCount={unresolvedClaimsCount}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            cerId={cerId}
            externalDocs={externalDocs}
            selectedDocId={selectedDocId}
            onSelectDoc={setSelectedDocId}
            onRefresh={() => refetchDocs()}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesTab
            cerId={cerId}
            searchInProgress={searchInProgress}
            onSearchStarted={() => setSearchInProgress(true)}
          />
        )}

        {activeTab === 'vigilance' && (
          <VigilanceTab
            sections={sections}
            selectedFinding={selectedFinding}
            onSelectFinding={setSelectedFinding}
          />
        )}

        {activeTab === 'traceability' && <TraceabilityTab />}
      </div>
    </div>
  );
}

// ==================== TAB COMPONENTS ====================

// -- Assembly Tab --
function AssemblyTab({
  cerId,
  projectId,
  sections,
  upstreamLinks,
  selectedUpstreamIds,
  onSelectionChange,
  onAssemble,
  assemblyInProgress,
  onCloseOverlay,
}: {
  cerId: string;
  projectId: string;
  sections: CerSectionData[];
  upstreamLinks: UpstreamLinkData[];
  selectedUpstreamIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onAssemble: () => void;
  assemblyInProgress: boolean;
  onCloseOverlay: () => void;
}) {
  const prerequisites = [
    { label: 'At least one upstream module linked', met: upstreamLinks.length > 0 },
    { label: 'All linked modules are locked', met: upstreamLinks.every((l) => !!l.lockedAt) },
    { label: 'Regulatory context defined', met: true },
  ];

  const assemblyProgress = sections.map((s) => ({
    sectionNumber: s.sectionNumber,
    title: s.title,
    status: (s.status === 'FINALIZED' ? 'done' : s.status === 'REVIEWED' ? 'done' : 'pending') as
      | 'pending'
      | 'generating'
      | 'done'
      | 'failed',
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
          <CerAssembler
            cerId={cerId}
            prerequisites={prerequisites}
            onAssemblyStarted={() => onAssemble()}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
            Upstream Modules
          </h3>
          <UpstreamModuleSelector
            projectId={projectId}
            selectedIds={selectedUpstreamIds}
            onSelectionChange={onSelectionChange}
          />
        </div>
      </div>

      {assemblyInProgress && (
        <AssemblyProgressOverlay sections={assemblyProgress} onCancel={onCloseOverlay} />
      )}
    </div>
  );
}

// -- Sections Tab --
function SectionsTab({
  cerId: _cerId,
  sections,
  activeSection,
  activeSectionData,
  onNavigate,
  onRefresh,
}: {
  cerId: string;
  sections: CerSectionData[];
  activeSection: number | null;
  activeSectionData: CerSectionData | null;
  onNavigate: (sectionNumber: number) => void;
  onRefresh: () => void;
}) {
  const navSections = sections.map((s) => ({
    sectionNumber: s.sectionNumber,
    title: s.title,
    status: s.status,
    hasMismatch: s.versionMismatchWarning,
  }));

  const tocSections = sections.map((s) => ({
    sectionNumber: s.sectionNumber,
    title: s.title,
    status: s.status,
    wordCount: s.wordCount,
    hasTraceability: true,
  }));

  return (
    <div className="flex gap-6">
      {/* Section Navigator (Sidebar) */}
      <div className="shrink-0">
        <SectionNavigator
          sections={navSections}
          activeSection={activeSection}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {activeSectionData ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
              <SectionEditor
                sectionId={activeSectionData.id}
                sectionNumber={activeSectionData.sectionNumber}
                title={activeSectionData.title}
                initialContent=""
              />
            </div>
            <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
              <SectionStatusControl
                sectionId={activeSectionData.id}
                currentStatus={activeSectionData.status}
                hasUnresolvedClaims={false}
                onStatusChanged={() => onRefresh()}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
            <CerTableOfContents sections={tocSections} onSectionClick={onNavigate} />
          </div>
        )}
      </div>
    </div>
  );
}

// -- Completion Tab --
function CompletionTab({
  sections,
  traceabilityPercentage,
  unresolvedClaimsCount,
}: {
  sections: CerSectionData[];
  traceabilityPercentage: number;
  unresolvedClaimsCount: number;
}) {
  const completionSections = sections.map((s) => ({
    sectionNumber: s.sectionNumber,
    title: s.title,
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
        <CompletionDashboard
          sections={completionSections}
          traceabilityPercentage={traceabilityPercentage}
          unresolvedClaimsCount={unresolvedClaimsCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
          <UnresolvedClaimsList claims={[]} />
        </div>
        <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
          <ImpactedSectionsList sections={[]} />
        </div>
      </div>
    </div>
  );
}

// -- Documents Tab --
function DocumentsTab({
  cerId: _cerId,
  externalDocs,
  selectedDocId,
  onSelectDoc,
  onRefresh,
}: {
  cerId: string;
  externalDocs: ExternalDocData[];
  selectedDocId: string | null;
  onSelectDoc: (id: string | null) => void;
  onRefresh: () => void;
}) {
  const docListItems = externalDocs.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.documentType,
    version: d.version,
    date: d.date,
    summary: d.summary,
  }));

  return (
    <div className="space-y-6">
      {/* Version mismatch alerts would be driven by real data -- placeholder */}

      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
            <ExternalDocumentList documents={docListItems} onEdit={(id) => onSelectDoc(id)} />
          </div>
        </div>

        {selectedDocId && (
          <div className="w-[400px] shrink-0 rounded-lg border border-[var(--cortex-border)] bg-white p-6">
            <ExternalDocumentManager
              docId={selectedDocId}
              onVersionUpdated={() => {
                onRefresh();
                onSelectDoc(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// -- Devices Tab --
function DevicesTab({
  cerId,
  searchInProgress,
  onSearchStarted,
}: {
  cerId: string;
  searchInProgress: boolean;
  onSearchStarted: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
        <NamedDeviceSearchPanel cerId={cerId} onSearchStarted={() => onSearchStarted()} />
      </div>

      {searchInProgress && (
        <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
          <SearchProgressIndicator
            databases={[{ database: 'MAUDE', progress: 0, status: 'pending' }]}
            overallProgress={0}
            totalResults={0}
            eta={null}
            onCancel={() => {}}
          />
        </div>
      )}
    </div>
  );
}

// -- Vigilance Tab --
function VigilanceTab({
  sections,
  selectedFinding,
  onSelectFinding,
}: {
  sections: CerSectionData[];
  selectedFinding: any;
  onSelectFinding: (finding: any) => void;
}) {
  const cerSections = sections.map((s) => ({
    sectionNumber: s.sectionNumber,
    title: s.title,
  }));

  return (
    <div className="flex gap-6">
      <div className="flex-1 rounded-lg border border-[var(--cortex-border)] bg-white p-6">
        <VigilanceFindingsTable findings={[]} onSelectFinding={onSelectFinding} />
      </div>

      {selectedFinding && (
        <div className="shrink-0">
          <VigilanceFindingDetail
            finding={selectedFinding}
            sections={cerSections}
            onViewReport={(url) => window.open(url, '_blank')}
          />
        </div>
      )}
    </div>
  );
}

// -- Traceability Tab --
function TraceabilityTab() {
  return (
    <div className="flex gap-6">
      <div className="flex-1 rounded-lg border border-[var(--cortex-border)] bg-white p-6">
        <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]">
          Select a claim from a section to view its traceability chain.
        </div>
      </div>
      <TraceabilityDrillDown claimText="Select a claim to view traceability" levels={[]} />
    </div>
  );
}
