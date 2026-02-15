import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AssemblyProgressOverlay } from './AssemblyProgressOverlay';

const mockSections = [
  { sectionNumber: 1, title: 'Scope', status: 'done' as const },
  { sectionNumber: 2, title: 'Device Description', status: 'done' as const },
  { sectionNumber: 3, title: 'Clinical Background', status: 'generating' as const },
  { sectionNumber: 4, title: 'Literature Review', status: 'pending' as const },
  { sectionNumber: 5, title: 'Clinical Data', status: 'failed' as const },
];

describe('AssemblyProgressOverlay', () => {
  it('renders the overlay', () => {
    render(<AssemblyProgressOverlay sections={mockSections} />);
    expect(screen.getByTestId('assembly-progress')).toBeInTheDocument();
  });

  it('shows section counter', () => {
    render(<AssemblyProgressOverlay sections={mockSections} />);
    expect(screen.getByTestId('section-counter')).toHaveTextContent('Sections generated: 2/5');
  });

  it('shows section progress rows', () => {
    render(<AssemblyProgressOverlay sections={mockSections} />);
    const rows = screen.getAllByTestId('section-progress-row');
    expect(rows).toHaveLength(5);
  });

  it('shows retry button for failed sections', () => {
    render(<AssemblyProgressOverlay sections={mockSections} />);
    const retryBtns = screen.getAllByTestId('retry-btn');
    expect(retryBtns).toHaveLength(1);
  });

  it('calls onRetry with section number', () => {
    const onRetry = vi.fn();
    render(<AssemblyProgressOverlay sections={mockSections} onRetry={onRetry} />);
    const retryBtns = screen.getAllByTestId('retry-btn');
    fireEvent.click(retryBtns[0]);
    expect(onRetry).toHaveBeenCalledWith(5);
  });

  it('shows cancel button', () => {
    render(<AssemblyProgressOverlay sections={mockSections} />);
    expect(screen.getByTestId('cancel-assembly-btn')).toBeInTheDocument();
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<AssemblyProgressOverlay sections={mockSections} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-assembly-btn'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows section titles', () => {
    render(<AssemblyProgressOverlay sections={mockSections} />);
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Device Description')).toBeInTheDocument();
    expect(screen.getByText('Clinical Background')).toBeInTheDocument();
  });
});
