import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ImpactedSectionsList } from './ImpactedSectionsList';

const mockSections = [
  {
    id: 's-1',
    sectionNumber: 3,
    title: 'Clinical Data',
    referencedDoc: 'IFU v1.0',
    mismatchDetails: 'IFU updated to v2.0',
    acknowledged: false,
  },
  {
    id: 's-2',
    sectionNumber: 7,
    title: 'Risk Analysis',
    referencedDoc: 'Risk File v1.0',
    mismatchDetails: 'Risk file updated to v1.1',
    acknowledged: true,
  },
  {
    id: 's-3',
    sectionNumber: 10,
    title: 'PMCF Plan',
    referencedDoc: 'IFU v1.0',
    mismatchDetails: 'IFU updated to v2.0',
    acknowledged: false,
  },
];

describe('ImpactedSectionsList', () => {
  it('renders the list container', () => {
    render(<ImpactedSectionsList sections={mockSections} />);
    expect(screen.getByTestId('impacted-sections-list')).toBeInTheDocument();
  });

  it('shows section items', () => {
    render(<ImpactedSectionsList sections={mockSections} />);
    const items = screen.getAllByTestId('section-item');
    expect(items).toHaveLength(3);
  });

  it('shows empty state when no sections', () => {
    render(<ImpactedSectionsList sections={[]} />);
    expect(screen.getByTestId('no-impacted')).toBeInTheDocument();
  });

  it('shows acknowledge button for unacknowledged sections', () => {
    render(<ImpactedSectionsList sections={mockSections} />);
    const ackBtns = screen.getAllByTestId('acknowledge-btn');
    expect(ackBtns).toHaveLength(2);
  });

  it('calls onAcknowledge with section id', () => {
    const onAck = vi.fn();
    render(<ImpactedSectionsList sections={mockSections} onAcknowledge={onAck} />);
    const ackBtns = screen.getAllByTestId('acknowledge-btn');
    fireEvent.click(ackBtns[0]!);
    expect(onAck).toHaveBeenCalledWith('s-1');
  });

  it('shows update reference button for all sections', () => {
    render(<ImpactedSectionsList sections={mockSections} />);
    const updateBtns = screen.getAllByTestId('update-ref-btn');
    expect(updateBtns).toHaveLength(3);
  });

  it('calls onUpdateReference with section id', () => {
    const onUpdate = vi.fn();
    render(<ImpactedSectionsList sections={mockSections} onUpdateReference={onUpdate} />);
    const updateBtns = screen.getAllByTestId('update-ref-btn');
    fireEvent.click(updateBtns[0]!);
    expect(onUpdate).toHaveBeenCalledWith('s-1');
  });
});
