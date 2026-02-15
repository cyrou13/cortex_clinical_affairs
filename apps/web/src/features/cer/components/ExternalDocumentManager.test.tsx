import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ExternalDocumentManager } from './ExternalDocumentManager';

const mockDoc = {
  id: 'doc-1',
  title: 'IFU Document',
  type: 'IFU',
  currentVersion: '2.0',
  versions: [
    { version: '2.0', date: '2024-02-01', summary: 'Updated safety info', updatedBy: 'Dr. Smith' },
    { version: '1.0', date: '2024-01-01', summary: 'Initial version', updatedBy: 'Dr. Jones' },
  ],
};

describe('ExternalDocumentManager', () => {
  const mockUpdate = vi
    .fn()
    .mockResolvedValue({
      data: { updateDocumentVersion: { documentId: 'doc-1', version: '3.0' } },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { externalDocument: mockDoc },
      loading: false,
      error: null,
    });
    mockUseMutation.mockReturnValue([mockUpdate, { loading: false }]);
  });

  it('renders the manager container', () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    expect(screen.getByTestId('external-doc-manager')).toBeInTheDocument();
  });

  it('shows document title and current version', () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    expect(screen.getByText('IFU Document')).toBeInTheDocument();
    expect(screen.getByText('Current: v2.0')).toBeInTheDocument();
  });

  it('shows version history timeline', () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    expect(screen.getByTestId('version-history')).toBeInTheDocument();
    expect(screen.getByText('v2.0')).toBeInTheDocument();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('shows update version button', () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    expect(screen.getByTestId('update-version-btn')).toBeInTheDocument();
  });

  it('calls update mutation on button click', async () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    fireEvent.click(screen.getByTestId('update-version-btn'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('shows version compare buttons', () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    const compareBtns = screen.getAllByTestId('version-compare');
    expect(compareBtns.length).toBeGreaterThan(0);
  });

  it('shows comparison panel when compare clicked', () => {
    render(<ExternalDocumentManager docId="doc-1" />);
    const compareBtns = screen.getAllByTestId('version-compare');
    fireEvent.click(compareBtns[0]!);
    expect(screen.getByTestId('comparison-panel')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ExternalDocumentManager docId="doc-1" />);
    expect(screen.getByTestId('doc-loading')).toBeInTheDocument();
  });
});
