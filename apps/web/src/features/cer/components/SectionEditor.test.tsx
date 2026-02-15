import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { SectionEditor } from './SectionEditor';

describe('SectionEditor', () => {
  const mockSave = vi.fn().mockResolvedValue({ data: { saveSectionContent: { sectionId: 's-1', savedAt: '2024-01-01' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockSave, { loading: false }]);
  });

  it('renders the editor container', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="Test content" />);
    expect(screen.getByTestId('section-editor')).toBeInTheDocument();
  });

  it('shows section title as non-editable heading', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" />);
    expect(screen.getByTestId('section-title')).toHaveTextContent('Clinical Background');
  });

  it('shows section number badge', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" />);
    expect(screen.getByTestId('section-number')).toHaveTextContent('3');
  });

  it('shows save indicator', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" />);
    expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
  });

  it('shows editor toolbar', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" />);
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
  });

  it('shows editor content area', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('updates save indicator on content change', () => {
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" />);
    const textarea = screen.getByPlaceholderText('Start writing section content...');
    fireEvent.change(textarea, { target: { value: 'New content' } });
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('Unsaved changes');
  });

  it('calls onContentChange when content changes', () => {
    const onChange = vi.fn();
    render(<SectionEditor sectionId="s-1" sectionNumber={3} title="Clinical Background" initialContent="" onContentChange={onChange} />);
    const textarea = screen.getByPlaceholderText('Start writing section content...');
    fireEvent.change(textarea, { target: { value: 'New content' } });
    expect(onChange).toHaveBeenCalledWith('New content');
  });
});
