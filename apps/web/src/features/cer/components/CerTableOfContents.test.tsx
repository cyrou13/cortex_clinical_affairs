import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CerTableOfContents } from './CerTableOfContents';

const mockSections = Array.from({ length: 14 }, (_, i) => ({
  sectionNumber: i + 1,
  title: `Section ${i + 1} Title`,
  status: (i < 5 ? 'FINALIZED' : i < 8 ? 'REVIEWED' : 'DRAFT') as 'DRAFT' | 'REVIEWED' | 'FINALIZED',
  wordCount: 500 + i * 100,
  hasTraceability: i < 10,
}));

describe('CerTableOfContents', () => {
  it('renders the TOC container', () => {
    render(<CerTableOfContents sections={mockSections} />);
    expect(screen.getByTestId('cer-toc')).toBeInTheDocument();
  });

  it('shows 14 section items', () => {
    render(<CerTableOfContents sections={mockSections} />);
    const items = screen.getAllByTestId('toc-section-item');
    expect(items).toHaveLength(14);
  });

  it('shows section status badges', () => {
    render(<CerTableOfContents sections={mockSections} />);
    const badges = screen.getAllByTestId('section-status-badge');
    expect(badges).toHaveLength(14);
  });

  it('shows completion bar', () => {
    render(<CerTableOfContents sections={mockSections} />);
    expect(screen.getByTestId('completion-bar')).toBeInTheDocument();
  });

  it('shows finalized count', () => {
    render(<CerTableOfContents sections={mockSections} />);
    expect(screen.getByText('5/14 finalized')).toBeInTheDocument();
  });

  it('shows traceability indicators', () => {
    render(<CerTableOfContents sections={mockSections} />);
    const indicators = screen.getAllByTestId('traceability-indicator');
    expect(indicators).toHaveLength(10);
  });

  it('shows word counts', () => {
    render(<CerTableOfContents sections={mockSections} />);
    expect(screen.getByText('500 words')).toBeInTheDocument();
  });

  it('calls onSectionClick when section clicked', () => {
    const onClick = vi.fn();
    render(<CerTableOfContents sections={mockSections} onSectionClick={onClick} />);
    const items = screen.getAllByTestId('toc-section-item');
    fireEvent.click(items[2]);
    expect(onClick).toHaveBeenCalledWith(3);
  });

  it('shows section titles', () => {
    render(<CerTableOfContents sections={mockSections} />);
    expect(screen.getByText('Section 1 Title')).toBeInTheDocument();
    expect(screen.getByText('Section 14 Title')).toBeInTheDocument();
  });
});
