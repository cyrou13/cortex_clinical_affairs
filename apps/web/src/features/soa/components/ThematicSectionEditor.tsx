import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { FileText, CheckCircle, Clock, Edit3, Lock } from 'lucide-react';
import { GET_SOA_SECTIONS } from '../graphql/queries';
import { UPDATE_SECTION_CONTENT, FINALIZE_SECTION } from '../graphql/mutations';

interface SectionNavItem {
  id: string;
  sectionKey: string;
  title: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED';
  narrativeContent?: string;
}

interface ThematicSectionEditorProps {
  sectionId: string;
  soaAnalysisId: string;
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
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' };
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

function extractTextFromTipTap(doc: any): string {
  if (!doc?.content) return '';
  const lines: string[] = [];
  for (const node of doc.content) {
    if (node.type === 'heading' && node.content) {
      const text = node.content.map((c: any) => c.text || '').join('');
      lines.push(text, '');
    } else if (node.type === 'paragraph' && node.content) {
      const text = node.content.map((c: any) => c.text || '').join('');
      lines.push(text, '');
    } else if (node.type === 'bulletList' && node.content) {
      for (const item of node.content) {
        const text = item.content
          ?.flatMap((p: any) => p.content?.map((c: any) => c.text || '') ?? [])
          .join('');
        lines.push(`• ${text}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}

export function ThematicSectionEditor({
  sectionId,
  soaAnalysisId,
  sections,
  locked = false,
  onSectionSelect,
  onFinalized,
}: ThematicSectionEditorProps) {
  const [content, setContent] = useState('');
  const [initializedForSection, setInitializedForSection] = useState<string | null>(null);

  const { data, loading } = useQuery<any>(GET_SOA_SECTIONS, {
    variables: { soaAnalysisId },
  });

  const [updateContent] = useMutation(UPDATE_SECTION_CONTENT);
  const [finalizeSection, { loading: finalizing }] = useMutation(FINALIZE_SECTION);

  const allSections = data?.soaSections ?? [];
  const section = allSections.find((s: any) => s.id === sectionId);

  useEffect(() => {
    if (initializedForSection === sectionId || !section) return;

    if (section.narrativeContent) {
      setContent(section.narrativeContent);
    } else if (section.narrativeAiDraft) {
      const draft = section.narrativeAiDraft;
      if (typeof draft === 'string') {
        try {
          const parsed = JSON.parse(draft);
          setContent(extractTextFromTipTap(parsed));
        } catch {
          setContent(draft);
        }
      } else if (typeof draft === 'object') {
        setContent(extractTextFromTipTap(draft));
      }
    } else {
      setContent('');
    }
    setInitializedForSection(sectionId);
  }, [section, sectionId, initializedForSection]);

  const isFinalized = section?.status === 'FINALIZED';

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updateContent({ variables: { sectionId, narrativeContent: newContent } });
  };

  const handleFinalize = async () => {
    if (!content.trim() || locked) return;
    await finalizeSection({ variables: { sectionId } });
    onFinalized?.();
  };

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="section-loading"
      >
        Loading section...
      </div>
    );
  }

  return (
    <div className="flex gap-4" data-testid="section-editor">
      {/* Navigation sidebar */}
      <div
        className="w-56 shrink-0 space-y-1 rounded-lg border border-[var(--cortex-border)] p-3"
        data-testid="section-nav"
      >
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
            <FileText size={16} className="text-[var(--cortex-blue-500)]" />
            <h3
              className="text-lg font-semibold text-[var(--cortex-text-primary)]"
              data-testid="section-title"
            >
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
