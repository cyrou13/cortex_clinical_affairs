import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Save, Bold, Italic, List } from 'lucide-react';

export const SAVE_SECTION_CONTENT = gql`
  mutation SaveSectionContent($input: SaveSectionContentInput!) {
    saveSectionContent(input: $input) {
      sectionId
      savedAt
    }
  }
`;

interface SectionEditorProps {
  sectionId: string;
  sectionNumber: number;
  title: string;
  initialContent: string;
  onContentChange?: (content: string) => void;
}

export function SectionEditor({ sectionId, sectionNumber, title, initialContent, onContentChange }: SectionEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const [saveContent] = useMutation(SAVE_SECTION_CONTENT);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      setSaveStatus('unsaved');
      onContentChange?.(value);
    },
    [onContentChange],
  );

  const handleSave = async () => {
    setSaveStatus('saving');
    await saveContent({
      variables: { input: { sectionId, content } },
    });
    setSaveStatus('saved');
  };

  return (
    <div className="space-y-3" data-testid="section-editor">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cortex-primary)] text-sm font-semibold text-white"
            data-testid="section-number"
          >
            {sectionNumber}
          </span>
          <h1 className="text-lg font-semibold text-[var(--cortex-text-primary)]" data-testid="section-title">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${
              saveStatus === 'saved'
                ? 'text-emerald-600'
                : saveStatus === 'saving'
                  ? 'text-blue-500'
                  : 'text-orange-500'
            }`}
            data-testid="save-indicator"
          >
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded bg-[var(--cortex-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Save size={12} /> Save
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 rounded border border-[var(--cortex-border)] p-1" data-testid="editor-toolbar">
        <button type="button" className="rounded p-1.5 hover:bg-gray-100" title="Bold">
          <Bold size={14} />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-gray-100" title="Italic">
          <Italic size={14} />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-gray-100" title="List">
          <List size={14} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        className="min-h-[300px] rounded border border-[var(--cortex-border)] p-4"
        data-testid="editor-content"
      >
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          className="h-full min-h-[280px] w-full resize-none border-none bg-transparent text-sm text-[var(--cortex-text-primary)] outline-none"
          placeholder="Start writing section content..."
        />
      </div>
    </div>
  );
}
