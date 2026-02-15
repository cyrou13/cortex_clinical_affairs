import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText, CheckCircle, Clock, Edit3, Lock } from 'lucide-react';

export const GET_SECTION_DETAILS = gql`
  query GetSectionDetails($sectionId: String!) {
    soaSection(id: $sectionId) {
      id
      sectionKey
      title
      status
      narrativeContent
    }
  }
`;

export const UPDATE_SECTION_CONTENT = gql`
  mutation UpdateSectionContent($sectionId: String!, $content: String!) {
    updateSectionContent(sectionId: $sectionId, content: $content) {
      sectionId
      status
    }
  }
`;

export const FINALIZE_SECTION = gql`
  mutation FinalizeSection($sectionId: String!) {
    finalizeSection(sectionId: $sectionId) {
      sectionId
      status
    }
  }
`;

interface SectionNavItem {
  id: string;
  sectionKey: string;
  title: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED';
}

interface ThematicSectionEditorProps {
  sectionId: string;
  sections: SectionNavItem[];
  locked?: boolean;
  onSectionSelect?: (sectionId: string) => void;
  onFinalized?: () => void;
}

function SectionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
    IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
    FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Finalized' },
  };
  const c = config[status] ?? config.DRAFT;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
      data-testid="section-status"
    >
      {c.label}
    </span>
  );
}

function CompletionIcon({ status }: { status: string }) {
  switch (status) {
    case 'FINALIZED':
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'IN_PROGRESS':
      return <Edit3 size={14} className="text-blue-500" />;
    default:
      return <Clock size={14} className="text-gray-400" />;
  }
}

export function ThematicSectionEditor({
  sectionId,
  sections,
  locked = false,
  onSectionSelect,
  onFinalized,
}: ThematicSectionEditorProps) {
  const [content, setContent] = useState('');
  const [contentInitialized, setContentInitialized] = useState(false);

  const { data, loading } = useQuery(GET_SECTION_DETAILS, {
    variables: { sectionId },
    onCompleted: (d) => {
      if (!contentInitialized && d?.soaSection?.narrativeContent) {
        setContent(d.soaSection.narrativeContent);
        setContentInitialized(true);
      }
    },
  });

  const [updateContent] = useMutation(UPDATE_SECTION_CONTENT);
  const [finalizeSection, { loading: finalizing }] = useMutation(FINALIZE_SECTION);

  const section = data?.soaSection;
  const isFinalized = section?.status === 'FINALIZED';

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updateContent({ variables: { sectionId, content: newContent } });
  };

  const handleFinalize = async () => {
    if (!content.trim() || locked) return;
    await finalizeSection({ variables: { sectionId } });
    onFinalized?.();
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="section-loading">
        Loading section...
      </div>
    );
  }

  return (
    <div className="flex gap-4" data-testid="section-editor">
      {/* Navigation sidebar */}
      <div className="w-56 shrink-0 space-y-1 rounded-lg border border-[var(--cortex-border)] p-3" data-testid="section-nav">
        <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--cortex-text-muted)]">
          Sections
        </h4>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSectionSelect?.(s.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
              s.id === sectionId
                ? 'bg-[#07233C] text-white'
                : 'text-[var(--cortex-text-secondary)] hover:bg-gray-100'
            }`}
            data-testid={`nav-section-${s.id}`}
          >
            <CompletionIcon status={s.status} />
            <span className="flex-1 truncate">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-[var(--cortex-primary)]" />
            <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]" data-testid="section-title">
              {section?.title ?? 'Untitled Section'}
            </h3>
          </div>
          <SectionStatusBadge status={section?.status ?? 'DRAFT'} />
        </div>

        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          disabled={isFinalized || locked}
          rows={16}
          placeholder="Write the narrative content for this section..."
          className="w-full rounded-lg border border-[var(--cortex-border)] px-4 py-3 text-sm leading-relaxed text-[var(--cortex-text-primary)] disabled:bg-gray-50 disabled:opacity-70"
          data-testid="section-content"
        />

        <div className="flex items-center justify-between">
          {locked && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Lock size={12} /> SOA is locked
            </div>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleFinalize}
              disabled={!content.trim() || isFinalized || locked || finalizing}
              className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="finalize-btn"
            >
              <CheckCircle size={14} />
              {finalizing ? 'Finalizing...' : 'Finalize Section'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
