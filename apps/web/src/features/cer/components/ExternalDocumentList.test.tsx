import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ExternalDocumentList } from './ExternalDocumentList';

const mockDocs = [
  { id: 'doc-1', title: 'IFU v2', type: 'IFU', version: '2.0', date: '2024-01-15', summary: 'Instructions for use' },
  { id: 'doc-2', title: 'Risk Analysis', type: 'RISK', version: '1.1', date: '2024-02-10', summary: 'Risk management file' },
];

describe('ExternalDocumentList', () => {
  it('renders the list container', () => {
    render(<ExternalDocumentList documents={mockDocs} />);
    expect(screen.getByTestId('external-doc-list')).toBeInTheDocument();
  });

  it('shows add document button', () => {
    render(<ExternalDocumentList documents={mockDocs} />);
    expect(screen.getByTestId('add-doc-btn')).toBeInTheDocument();
  });

  it('renders document rows', () => {
    render(<ExternalDocumentList documents={mockDocs} />);
    const rows = screen.getAllByTestId('doc-row');
    expect(rows).toHaveLength(2);
  });

  it('shows empty state when no documents', () => {
    render(<ExternalDocumentList documents={[]} />);
    expect(screen.getByTestId('no-docs')).toBeInTheDocument();
  });

  it('calls onAdd when add button clicked', () => {
    const onAdd = vi.fn();
    render(<ExternalDocumentList documents={mockDocs} onAdd={onAdd} />);
    fireEvent.click(screen.getByTestId('add-doc-btn'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('calls onEdit with doc id', () => {
    const onEdit = vi.fn();
    render(<ExternalDocumentList documents={mockDocs} onEdit={onEdit} />);
    const editBtns = screen.getAllByTestId('edit-doc-btn');
    fireEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalledWith('doc-1');
  });

  it('calls onRemove with doc id', () => {
    const onRemove = vi.fn();
    render(<ExternalDocumentList documents={mockDocs} onRemove={onRemove} />);
    const removeBtns = screen.getAllByTestId('remove-doc-btn');
    fireEvent.click(removeBtns[1]);
    expect(onRemove).toHaveBeenCalledWith('doc-2');
  });
});
