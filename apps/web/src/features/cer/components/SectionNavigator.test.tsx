import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SectionNavigator } from './SectionNavigator';

const mockSections = [
  { sectionNumber: 1, title: 'Scope', status: 'FINALIZED' as const, hasMismatch: false },
  { sectionNumber: 2, title: 'Device Description', status: 'REVIEWED' as const, hasMismatch: true },
  { sectionNumber: 3, title: 'Clinical Background', status: 'DRAFT' as const, hasMismatch: false },
  { sectionNumber: 4, title: 'Literature Review', status: 'DRAFT' as const, hasMismatch: false },
];

describe('SectionNavigator', () => {
  it('renders the navigator', () => {
    render(<SectionNavigator sections={mockSections} activeSection={1} />);
    expect(screen.getByTestId('section-navigator')).toBeInTheDocument();
  });

  it('shows all navigation items', () => {
    render(<SectionNavigator sections={mockSections} activeSection={1} />);
    const items = screen.getAllByTestId('nav-section-item');
    expect(items).toHaveLength(4);
  });

  it('highlights active section', () => {
    render(<SectionNavigator sections={mockSections} activeSection={1} />);
    expect(screen.getByTestId('active-section')).toBeInTheDocument();
  });

  it('shows status icons', () => {
    render(<SectionNavigator sections={mockSections} activeSection={1} />);
    const icons = screen.getAllByTestId('status-icon');
    expect(icons).toHaveLength(4);
  });

  it('shows warning indicator for mismatched sections', () => {
    render(<SectionNavigator sections={mockSections} activeSection={1} />);
    const warnings = screen.getAllByTestId('warning-indicator');
    expect(warnings).toHaveLength(1);
  });

  it('calls onNavigate when section clicked', () => {
    const onNav = vi.fn();
    render(<SectionNavigator sections={mockSections} activeSection={1} onNavigate={onNav} />);
    const items = screen.getAllByTestId('nav-section-item');
    fireEvent.click(items[2]);
    expect(onNav).toHaveBeenCalledWith(3);
  });

  it('shows section titles', () => {
    render(<SectionNavigator sections={mockSections} activeSection={1} />);
    expect(screen.getByText('1. Scope')).toBeInTheDocument();
    expect(screen.getByText('2. Device Description')).toBeInTheDocument();
  });
});
