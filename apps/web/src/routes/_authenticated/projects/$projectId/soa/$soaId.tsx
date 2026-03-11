import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  FlaskConical,
  Table,
  ClipboardCheck,
  FileText,
  Cpu,
  FileCheck,
  ArrowLeft,
} from 'lucide-react';
import { navigate } from '../../../../../router';
import {
  GET_SOA_ANALYSIS,
  GET_SOA_SECTIONS,
  GET_EXTRACTION_GRIDS,
} from '../../../../../features/soa/graphql/queries';
import { SoaDashboard } from '../../../../../features/soa/components/SoaDashboard';
import { ExtractionGridPage } from '../../../../../features/soa/components/ExtractionGridPage';
import { GridConfigurator } from '../../../../../features/soa/components/GridConfigurator';
import { ExtractionProgressPanel } from '../../../../../features/soa/components/ExtractionProgressPanel';
import { QualityAssessmentForm } from '../../../../../features/soa/components/QualityAssessmentForm';
import { NarrativeDraftPanel } from '../../../../../features/soa/components/NarrativeDraftPanel';
import { ThematicSectionEditor } from '../../../../../features/soa/components/ThematicSectionEditor';
import { LockSoaButton } from '../../../../../features/soa/components/LockSoaButton';
import { DeviceRegistryPanel } from '../../../../../features/soa/components/DeviceRegistryPanel';
import { ClaimsManagement } from '../../../../../features/soa/components/ClaimsManagement';

type TabKey = 'overview' | 'grid' | 'quality' | 'narrative' | 'devices' | 'claims';

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Table;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: FlaskConical },
  { key: 'grid', label: 'Grid', icon: Table },
  { key: 'quality', label: 'Quality', icon: ClipboardCheck },
  { key: 'narrative', label: 'Narrative', icon: FileText },
  { key: 'devices', label: 'Devices', icon: Cpu },
  { key: 'claims', label: 'Claims', icon: FileCheck },
];

interface Section {
  id: string;
  sectionKey: string;
  title: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED';
  orderIndex: number;
}

interface Grid {
  id: string;
  name: string;
}

export default function SoaDetailPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);
  const [selectedArticleId] = useState<string>('');

  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';
  const soaId = pathParts[pathParts.indexOf('soa') + 1] ?? '';

  const {
    data: soaData,
    loading: soaLoading,
    error: soaError,
    refetch: refetchSoa,
  } = useQuery<any>(GET_SOA_ANALYSIS, {
    variables: { id: soaId },
    skip: !soaId,
  });

  const { data: sectionsData, refetch: refetchSections } = useQuery<any>(GET_SOA_SECTIONS, {
    variables: { soaAnalysisId: soaId },
    skip: !soaId,
  });

  const { data: gridsData, refetch: refetchGrids } = useQuery<any>(GET_EXTRACTION_GRIDS, {
    variables: { soaAnalysisId: soaId },
    skip: !soaId,
  });

  const soa = soaData?.soaAnalysis;
  const isLocked = soa?.status === 'LOCKED';
  const sections: Section[] = [...(sectionsData?.soaSections ?? [])].sort(
    (a: Section, b: Section) => a.orderIndex - b.orderIndex,
  );
  const grids: Grid[] = gridsData?.extractionGrids ?? [];

  // Auto-select first section/grid when data loads
  const activeSectionId = selectedSectionId ?? sections[0]?.id ?? null;
  const activeGridId = selectedGridId ?? grids[0]?.id ?? null;

  if (soaLoading) {
    return (
      <div className="flex h-full items-center justify-center" data-testid="soa-detail-loading">
        <div className="text-sm text-[var(--cortex-text-muted)]">Loading SOA analysis...</div>
      </div>
    );
  }

  if (!soa && !soaLoading) {
    return (
      <div className="flex h-full items-center justify-center" data-testid="soa-detail-error">
        <div className="text-center">
          <p className="mb-2 text-sm text-[var(--cortex-error)]">
            {soaError ? 'Failed to load SOA analysis.' : 'SOA analysis not found.'}
          </p>
          {soaError && (
            <p className="mb-4 max-w-md text-xs text-[var(--cortex-text-muted)]">
              {soaError.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}/soa`)}
            className="inline-flex items-center gap-2 rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-50"
          >
            <ArrowLeft size={14} />
            Back to SOA list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="soa-detail-page">
      {/* Header */}
      <div className="border-b border-[var(--cortex-border)] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}/soa`)}
              className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-gray-50 hover:text-[var(--cortex-text-primary)]"
              data-testid="back-btn"
              aria-label="Back to SOA list"
            >
              <ArrowLeft size={18} />
            </button>
            <FlaskConical size={20} className="text-[var(--cortex-blue-500)]" />
            <div>
              <h1
                className="text-lg font-semibold text-[var(--cortex-text-primary)]"
                data-testid="soa-title"
              >
                {soa.name}
              </h1>
              <span className="text-xs text-[var(--cortex-text-muted)]">
                {soa.type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <LockSoaButton
            soaAnalysisId={soaId}
            soaStatus={soa.status}
            onLocked={() => {
              refetchSoa();
              refetchSections();
            }}
          />
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1" data-testid="soa-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-[var(--cortex-blue-500)] bg-[var(--cortex-bg-secondary)] text-[var(--cortex-blue-500)]'
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

      {/* Tab content */}
      <div className="flex-1 overflow-auto bg-[var(--cortex-bg-secondary)] p-6">
        {activeTab === 'overview' && (
          <div className="mx-auto max-w-4xl">
            <SoaDashboard soaId={soaId} />
          </div>
        )}

        {activeTab === 'grid' && (
          <div className="space-y-4">
            {activeGridId ? (
              <>
                <ExtractionProgressPanel gridId={activeGridId} />
                <ExtractionGridPage gridId={activeGridId} soaStatus={soa.status} />
                <GridConfigurator
                  soaAnalysisId={soaId}
                  soaType={soa.type}
                  gridId={activeGridId}
                  columns={[]}
                  onGridCreated={(gridId) => {
                    setSelectedGridId(gridId);
                    refetchGrids();
                  }}
                  onColumnChanged={() => refetchGrids()}
                />
              </>
            ) : (
              <GridConfigurator
                soaAnalysisId={soaId}
                soaType={soa.type}
                columns={[]}
                onGridCreated={(gridId) => {
                  setSelectedGridId(gridId);
                  refetchGrids();
                }}
                onColumnChanged={() => refetchGrids()}
              />
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="mx-auto max-w-2xl">
            <QualityAssessmentForm
              soaAnalysisId={soaId}
              articleId={selectedArticleId}
              locked={isLocked}
            />
            <p className="mt-4 text-center text-xs text-[var(--cortex-text-muted)]">
              Select an article from the extraction grid to assess its quality.
            </p>
          </div>
        )}

        {activeTab === 'narrative' && (
          <div className="mx-auto max-w-6xl space-y-6">
            {activeSectionId ? (
              <>
                <NarrativeDraftPanel
                  sectionId={activeSectionId}
                  soaAnalysisId={soaId}
                  locked={isLocked}
                  onDraftAccepted={() => refetchSections()}
                />
                <ThematicSectionEditor
                  sectionId={activeSectionId}
                  soaAnalysisId={soaId}
                  sections={sections}
                  locked={isLocked}
                  onSectionSelect={(id) => setSelectedSectionId(id)}
                  onFinalized={() => refetchSections()}
                />
              </>
            ) : (
              <div
                className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center text-sm text-[var(--cortex-text-muted)]"
                data-testid="no-sections"
              >
                No thematic sections available. Sections are created automatically when the SOA
                analysis is initialized.
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="mx-auto max-w-5xl space-y-6">
            <DeviceRegistryPanel soaAnalysisId={soaId} locked={isLocked} onDeviceAdded={() => {}} />
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="mx-auto max-w-3xl">
            <ClaimsManagement soaAnalysisId={soaId} locked={isLocked} />
          </div>
        )}
      </div>
    </div>
  );
}
