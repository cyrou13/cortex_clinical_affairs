import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ThematicSectionEditor } from './ThematicSectionEditor';

const mockSections = [
  { id: 'sec-1', sectionKey: 'SCOPE', title: 'Scope', status: 'FINALIZED' as const },
  { id: 'sec-2', sectionKey: 'CLINICAL_BACKGROUND', title: 'Clinical Background', status: 'IN_PROGRESS' as const },
  { id: 'sec-3', sectionKey: 'STATE_OF_ART', title: 'State of the Art', status: 'DRAFT' as const },
];

const sectionData = {
  soaSection: {
    id: 'sec-2',
    sectionKey: 'CLINICAL_BACKGROUND',
    title: 'Clinical Background',
    status: 'IN_PROGRESS',
    narrativeContent: 'Existing content here.',
  },
};

const draftSectionData = {
  soaSection: {
    id: 'sec-3',
    sectionKey: 'STATE_OF_ART',
    title: 'State of the Art',
    status: 'DRAFT',
    narrativeContent: '',
  },
};

const finalizedSectionData = {
  soaSection: {
    id: 'sec-1',
    sectionKey: 'SCOPE',
    title: 'Scope',
    status: 'FINALIZED',
    narrativeContent: 'Finalized content.',
  },
};

describe('ThematicSectionEditor', () => {
  const mockUpdateContent = vi.fn().mockResolvedValue({ data: { updateSectionContent: { sectionId: 'sec-2', status: 'IN_PROGRESS' } } });
  const mockFinalize = vi.fn().mockResolvedValue({ data: { finalizeSection: { sectionId: 'sec-2', status: 'FINALIZED' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockUpdateContent, { loading: false }],
      [mockFinalize, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders the section editor', () => {
    mockUseQuery.mockReturnValue({ data: sectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-2" sections={mockSections} />);

    expect(screen.getByTestId('section-editor')).toBeInTheDocument();
  });

  it('displays the section title', () => {
    mockUseQuery.mockReturnValue({ data: sectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-2" sections={mockSections} />);

    expect(screen.getByTestId('section-title')).toHaveTextContent('Clinical Background');
  });

  it('renders the content textarea', () => {
    mockUseQuery.mockReturnValue({ data: sectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-2" sections={mockSections} />);

    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('renders the finalize button', () => {
    mockUseQuery.mockReturnValue({ data: sectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-2" sections={mockSections} />);

    expect(screen.getByTestId('finalize-btn')).toBeInTheDocument();
  });

  it('disables finalize when content is empty', () => {
    mockUseQuery.mockReturnValue({ data: draftSectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-3" sections={mockSections} />);

    expect(screen.getByTestId('finalize-btn')).toBeDisabled();
  });

  it('disables finalize when section is already finalized', () => {
    mockUseQuery.mockReturnValue({ data: finalizedSectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-1" sections={mockSections} />);

    expect(screen.getByTestId('finalize-btn')).toBeDisabled();
  });

  it('displays the status badge', () => {
    mockUseQuery.mockReturnValue({ data: sectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-2" sections={mockSections} />);

    expect(screen.getByTestId('section-status')).toHaveTextContent('In Progress');
  });

  it('renders navigation sidebar with all sections', () => {
    mockUseQuery.mockReturnValue({ data: sectionData, loading: false });
    render(<ThematicSectionEditor sectionId="sec-2" sections={mockSections} />);

    expect(screen.getByTestId('section-nav')).toBeInTheDocument();
    expect(screen.getByTestId('nav-section-sec-1')).toBeInTheDocument();
    expect(screen.getByTestId('nav-section-sec-2')).toBeInTheDocument();
    expect(screen.getByTestId('nav-section-sec-3')).toBeInTheDocument();
  });
});
