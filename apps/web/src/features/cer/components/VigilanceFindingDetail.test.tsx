import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { VigilanceFindingDetail } from './VigilanceFindingDetail';

const mockFinding = {
  id: 'f-1',
  sourceDatabase: 'MAUDE',
  reportNumber: 'MDR-2024-001',
  eventDate: '2024-01-15',
  deviceName: 'CardioDevice X',
  eventType: 'Malfunction',
  description: 'Device stopped working during procedure',
  outcome: 'No injury',
  reportUrl: 'https://example.com/report/1',
  linkedSection: null,
};

const mockSections = [
  { sectionNumber: 1, title: 'Scope' },
  { sectionNumber: 3, title: 'Clinical Data' },
  { sectionNumber: 7, title: 'Risk Analysis' },
];

describe('VigilanceFindingDetail', () => {
  it('renders the detail panel', () => {
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} />);
    expect(screen.getByTestId('finding-detail')).toBeInTheDocument();
  });

  it('shows source database badge', () => {
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} />);
    expect(screen.getByTestId('source-db-badge')).toHaveTextContent('MAUDE');
  });

  it('shows finding details', () => {
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} />);
    expect(screen.getByText('CardioDevice X')).toBeInTheDocument();
    expect(screen.getByText('Malfunction')).toBeInTheDocument();
    expect(screen.getByText('Device stopped working during procedure')).toBeInTheDocument();
  });

  it('shows link to section dropdown', () => {
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} />);
    expect(screen.getByTestId('link-to-section-dropdown')).toBeInTheDocument();
  });

  it('shows view report button', () => {
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} />);
    expect(screen.getByTestId('view-report-btn')).toBeInTheDocument();
  });

  it('calls onViewReport when view button clicked', () => {
    const onView = vi.fn();
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} onViewReport={onView} />);
    fireEvent.click(screen.getByTestId('view-report-btn'));
    expect(onView).toHaveBeenCalledWith('https://example.com/report/1');
  });

  it('calls onLinkToSection when section selected and linked', () => {
    const onLink = vi.fn();
    render(<VigilanceFindingDetail finding={mockFinding} sections={mockSections} onLinkToSection={onLink} />);
    fireEvent.change(screen.getByTestId('link-to-section-dropdown'), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Link Finding'));
    expect(onLink).toHaveBeenCalledWith('f-1', 3);
  });
});
